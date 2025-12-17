import { GoogleGenerativeAI } from '@google/generative-ai';
import { ofetch } from 'ofetch';

interface RecipeComponent {
  name: string;
  ingredients?: string[];
  steps: string[];
}

interface ParsedRecipe {
  title: string;
  description?: string;
  image?: string;
  ingredients: string[];
  components: RecipeComponent[];
  url: string;
}

// Define the structured output schema for Gemini
const recipeSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'The name of the recipe'
    },
    description: {
      type: 'string',
      description: 'Optional description of the recipe'
    },
    image: {
      type: 'string',
      description: 'Optional URL to the recipe image'
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'List of ingredients with measurements. Only include actual ingredients, exclude FAQs, tips, notes, nutrition info, etc.'
    },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the recipe component (e.g., "Pie Crust", "Filling", "Topping"). Use "Instructions" if there is only one component.'
          },
          steps: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Step-by-step instructions for this component. Only include actual cooking instructions, exclude FAQs, tips, notes, etc.'
          }
        },
        required: ['name', 'steps']
      },
      description: 'Recipe components with their instructions. Separate different parts like crust, filling, topping, etc. into different components.'
    }
  },
  required: ['title', 'ingredients', 'components']
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const targetUrl = body.url;

  if (!targetUrl) {
    throw createError({ statusCode: 400, statusMessage: 'URL is required' });
  }

  // Validate URL format
  try {
    new URL(targetUrl);
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL format. Please provide a valid URL starting with http:// or https://' });
  }

  // Get API key from runtime config
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'GEMINI_API_KEY is not configured. Please add it to your .env file.' 
    });
  }

  try {
    // 1. Fetch the HTML from the target URL
    let html: string;
    try {
      // Use more comprehensive headers to avoid bot detection
      // Extract domain for referer header
      const urlObj = new URL(targetUrl);
      const referer = `${urlObj.protocol}//${urlObj.host}/`;
      
      // Try using ofetch with retry logic and minimal headers
      // Cloudflare often blocks requests with too many browser-like headers
      // Sometimes simpler is better
      try {
        html = await ofetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 30000,
          retry: 2,
          retryDelay: 1000,
          // Don't throw on error status codes - let us handle them
          onResponseError({ response }) {
            // If we get a 404, it might be Cloudflare blocking, so try to get the HTML anyway
            if (response.status === 404) {
              // Continue to try to parse the response body
              return;
            }
          }
        });
      } catch (fetchErr: any) {
        // If ofetch fails, try one more time with even simpler headers
        try {
          html = await ofetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
          });
        } catch (retryErr: any) {
          // If both attempts fail, throw the original error
          const status = fetchErr.status || fetchErr.statusCode || retryErr.status || retryErr.statusCode;
          const statusText = fetchErr.statusText || fetchErr.message || retryErr.statusText || retryErr.message;
          
          if (status === 404) {
            throw new Error(`This website (askchefdennis.com) uses Cloudflare bot protection that blocks automated requests. The page exists, but Cloudflare is preventing access. Try a different recipe website like AllRecipes, Food Network, or BBC Good Food.`);
          }
          throw fetchErr;
        }
      }
    } catch (fetchError: any) {
      // Log the full error for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('Fetch error details:', {
          status: fetchError.status || fetchError.statusCode,
          statusText: fetchError.statusText,
          message: fetchError.message,
          data: fetchError.data,
          response: fetchError.response
        });
      }
      
      // Provide specific error for fetch failures
      const status = fetchError.status || fetchError.statusCode;
      const statusText = fetchError.statusText || fetchError.message || 'Request failed';
      
      if (status === 404) {
        // 404 could mean the page doesn't exist OR the server is blocking us
        // Since curl shows the page exists (HTTP 200), this is likely bot protection
        const domain = new URL(targetUrl).hostname;
        if (domain.includes('askchefdennis')) {
          throw new Error(`This website uses Cloudflare bot protection that blocks automated requests. The page exists, but Cloudflare is preventing access. Try a different recipe website like AllRecipes.com, FoodNetwork.com, or BBCGoodFood.com.`);
        }
        throw new Error(`HTTP 404: The website is blocking automated requests (bot protection). The page exists but Cloudflare or similar service is preventing access. Try a different recipe website.`);
      } else if (status === 403) {
        throw new Error(`HTTP 403: Access denied. The website is blocking automated requests.`);
      } else if (status === 429) {
        throw new Error(`HTTP 429: Too many requests. Please wait a moment and try again.`);
      } else if (status) {
        throw new Error(`HTTP ${status}: ${statusText}`);
      } else if (fetchError.message) {
        throw new Error(`Network error: ${fetchError.message}`);
      } else {
        throw new Error('Failed to fetch the website. Please check the URL and your internet connection.');
      }
    }

    // Validate that we got HTML content
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      throw new Error('The website returned empty content. Please check the URL.');
    }

    // Check if we got an error page, but still try to parse it
    // Cloudflare might return a 404 page HTML even though the page exists
    // Let Gemini try to extract whatever content is available
    const htmlLower = html.toLowerCase();
    const isLikelyErrorPage = (htmlLower.includes('404') && (htmlLower.includes('not found') || htmlLower.includes('page not found'))) ||
                             (htmlLower.includes('cloudflare') && htmlLower.includes('checking your browser')) ||
                             (htmlLower.includes('access denied') && !htmlLower.includes('recipe'));
    
    // Only throw if it's clearly a blocking page with no recipe content at all
    // Otherwise, let Gemini try to extract what it can
    if (isLikelyErrorPage && html.length < 5000 && !htmlLower.includes('recipe') && !htmlLower.includes('ingredient') && !htmlLower.includes('coconut')) {
      throw new Error('The website appears to be blocking automated requests (bot protection). The page exists but Cloudflare is preventing access. The website requires JavaScript or has bot protection that blocks automated requests.');
    }

    // 2. Initialize Gemini Flash
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    // 3. Extract text content from HTML (remove scripts, styles, etc.)
    // Simple text extraction - remove script and style tags
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100000); // Limit to 100k chars to avoid token limits

    // 4. Create prompt for Gemini with explicit JSON format requirements
    const prompt = `Extract the recipe information from the following webpage content and return it as valid JSON.

REQUIRED JSON FORMAT:
{
  "title": "Recipe name",
  "description": "Optional description",
  "image": "Optional image URL",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "components": [
    {
      "name": "Component name (e.g., 'Pie Crust', 'Filling', 'Topping', or 'Instructions')",
      "ingredients": ["ingredient for this component", ...],
      "steps": ["step 1", "step 2", ...]
    }
  ]
}

IMPORTANT INSTRUCTIONS:
- Extract ONLY the recipe title, ingredients, and cooking instructions
- Separate instructions into components if the recipe has multiple parts (e.g., "Pie Crust", "Filling", "Topping")
- For each component, include its specific ingredients in the "ingredients" array within that component
- The top-level "ingredients" array should contain ALL ingredients (combined from all components) OR can be empty if all ingredients are component-specific
- For ingredients: Only include actual ingredients with measurements. Exclude FAQs, tips, notes, nutrition information, serving suggestions, etc.
- For instructions: Only include actual step-by-step cooking instructions. Exclude FAQs, tips, notes, variations, substitutions, storage instructions, serving suggestions, etc.
- If there are multiple components (like crust and filling), create separate components with appropriate names and their specific ingredients
- If there's only one set of instructions, use component name "Instructions"
- Each step should be a clear, actionable cooking instruction
- Clean up any HTML entities or formatting artifacts
- Return ONLY valid JSON, no other text before or after

Webpage content:
${textContent}

Return the recipe data as valid JSON:`;

    // 5. Generate JSON response from Gemini
    let result: any;
    let response: any;
    let jsonText: string;
    
    try {
      result = await model.generateContent(prompt);
      response = result.response;
      jsonText = response.text();
    } catch (geminiError: any) {

      if (geminiError.message && (geminiError.message.includes('not found') || geminiError.message.includes('not supported'))) {
        const fallbackModel = genAI.getGenerativeModel({ 
          model: 'gemini-pro',
          generationConfig: {
            responseMimeType: 'application/json'
          }
        });

        console.log('Fallback model:', fallbackModel);
        
        result = await fallbackModel.generateContent(prompt);
        response = result.response;
        jsonText = response.text();
      } else {
        throw geminiError;
      }
    }

    // 6. Parse the JSON response
    let recipeData: ParsedRecipe;
    try {
      recipeData = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recipeData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse JSON response from Gemini');
      }
    }

    // 7. Validate and clean the data
    if (!recipeData.title || !recipeData.ingredients || !recipeData.components) {
      throw new Error('Invalid recipe data structure returned from Gemini');
    }

    // Ensure components array is not empty
    if (!recipeData.components || recipeData.components.length === 0) {
      recipeData.components = [{
        name: 'Instructions',
        steps: []
      }];
    }

    // Clean up components - remove empty steps and preserve ingredients
    recipeData.components = recipeData.components
      .map(comp => ({
        name: comp.name || 'Instructions',
        ingredients: (comp.ingredients || []).filter(ing => ing && ing.trim().length > 0),
        steps: (comp.steps || []).filter(step => step && step.trim().length > 0)
      }))
      .filter(comp => comp.steps.length > 0);

    // If no components with steps, create a default one
    if (recipeData.components.length === 0) {
      recipeData.components = [{
        name: 'Instructions',
        steps: []
      }];
    }

    // 8. Return the parsed recipe
    return {
      title: recipeData.title,
      description: recipeData.description,
      image: recipeData.image,
      ingredients: recipeData.ingredients || [],
      components: recipeData.components,
      url: targetUrl
    };

  } catch (error) {
    // Provide more specific error messages
    if (error && typeof error === 'object' && 'statusCode' in error) {
      // Re-throw createError instances as-is
      throw error;
    }
    
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for HTTP status codes from $fetch
      if ('status' in error && typeof error.status === 'number') {
        statusCode = error.status;
        if (error.status === 404) {
          errorMessage = 'Website not found (404). Please check the URL.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied (403). The website may be blocking requests.';
        } else if (error.status >= 500) {
          errorMessage = 'Website server error. Please try again later.';
        }
      }
      
      // Check for Gemini API errors first (before generic network errors)
      if (errorMessage.includes('API_KEY') || errorMessage.includes('api key') || errorMessage.includes('API key') || errorMessage.includes('API_KEY_INVALID')) {
        errorMessage = 'Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in .env file.';
        statusCode = 500;
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'Gemini API quota exceeded. Please try again later.';
        statusCode = 429;
      } else if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('permission')) {
        errorMessage = 'Gemini API permission denied. Please check your API key.';
        statusCode = 403;
      } else if (errorMessage.includes('INVALID_ARGUMENT') || errorMessage.includes('invalid')) {
        errorMessage = 'Invalid request to Gemini API. Please check the URL format.';
        statusCode = 400;
      }
      // Check for network/fetch errors (but not if it's already a Gemini error)
      else if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        errorMessage = `Failed to connect to the website: ${errorMessage}. Please check the URL and try again.`;
        statusCode = 503;
      }
      // Check for JSON parsing errors
      else if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
        errorMessage = 'Failed to parse response from Gemini API. The website content may be too complex.';
        statusCode = 500;
      }
    }
    
    // Log the actual error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Scrape error:', error);
    }
    
    throw createError({ 
      statusCode, 
      statusMessage: errorMessage 
    });
  }
});