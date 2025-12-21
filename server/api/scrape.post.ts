import { GoogleGenerativeAI } from '@google/generative-ai';
import { ofetch } from 'ofetch';

// ... (Interfaces and Schema remain the same) ...

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const targetUrl = body.url;

  // 1. Initial Validation
  if (!targetUrl) {
    throw createError({ statusCode: 400, statusMessage: 'URL is required' });
  }

  try {
    new URL(targetUrl);
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL format' });
  }

  // 2. Check Environment Variables (The #1 cause of 500 errors in prod)
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;
  
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from runtime config.");
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Server Configuration Error: API Key not found.' 
    });
  }

  try {
    // 3. FETCHING PHASE
    console.log(`Attempting to fetch: ${targetUrl}`);
    let html: string;
    
    try {
      html = await ofetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 20000, // Reduced timeout to fail faster
        retry: 1
      });
    } catch (fetchErr: any) {
      console.error(`Fetch failed for ${targetUrl}:`, fetchErr.message);
      // This is usually where Oracle IPs get blocked (403/404)
      throw createError({
        statusCode: fetchErr.status || 502,
        statusMessage: `Failed to reach recipe site: ${fetchErr.message}`
      });
    }

    // 4. AI PHASE
    console.log("Initializing Gemini...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash', // Flash is faster and cheaper for scraping
      generationConfig: { responseMimeType: 'application/json' }
    });

    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000); // 50k is usually enough for any recipe

    const prompt = `Extract recipe JSON from this content: ${textContent}`;

    console.log("Sending to Gemini...");
    const result = await model.generateContent(prompt);
    const jsonText = result.response.text();

    // 5. PARSING PHASE
    let recipeData;
    try {
      recipeData = JSON.parse(jsonText);
    } catch (e) {
      console.error("Gemini returned invalid JSON:", jsonText);
      throw new Error("AI returned an unreadable format.");
    }

    return {
      ...recipeData,
      url: targetUrl
    };

  } catch (error: any) {
    // 6. GLOBAL ERROR LOGGING
    // This will show up in your Oracle/PM2 logs
    console.error("--- SCRAPE ERROR LOG ---");
    console.error("Message:", error.message);
    console.error("Status:", error.statusCode || 500);
    if (error.stack) console.error("Stack:", error.stack);
    console.error("------------------------");

    // Re-throw as a Nuxt error so the frontend gets a clean message
    throw createError({ 
      statusCode: error.statusCode || 500, 
      statusMessage: error.statusMessage || error.message || 'Internal Server Error' 
    });
  }
});