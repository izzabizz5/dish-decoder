import type { Recipe, RecipeComponent } from '../types/recipe.js'
import { cleanText } from '../utils/textUtils.js'

/**
 * Export recipe as Markdown
 */
export const exportRecipeMarkdown = (
  recipe: Recipe,
  visibleComponents: Record<number, boolean>,
  hasComponentIngredients: boolean,
  filteredIngredients: string[]
): string => {
  // Only include visible components
  const visibleComps = recipe.components 
    ? recipe.components.filter((_, index) => visibleComponents[index] !== false)
    : []
  
  let md = `# ${recipe.title}\n\n`
  
  if (hasComponentIngredients && visibleComps.length > 0) {
    // Components have their own ingredients - show per component
    visibleComps.forEach(comp => {
      md += `### ${comp.name}\n\n`
      if (comp.ingredients && comp.ingredients.length > 0) {
        md += `#### Ingredients\n${comp.ingredients.map(i => `- ${i}`).join('\n')}\n\n`
      }
      md += `#### Instructions\n${comp.steps.map((s, i) => `${i+1}. ${cleanText(s)}`).join('\n')}\n\n`
    })
  } else {
    // Traditional format: all ingredients at top, then instructions
    md += `## Ingredients\n${filteredIngredients.map(i => `- ${i}`).join('\n')}\n\n`
    md += `## Instructions\n`
    
    if (visibleComps.length > 0) {
      visibleComps.forEach(comp => {
        md += `### ${comp.name}\n\n${comp.steps.map((s, i) => `${i+1}. ${cleanText(s)}`).join('\n')}\n\n`
      })
    } else if (recipe.instructions) {
      md += recipe.instructions.map((s, i) => `${i+1}. ${cleanText(s)}`).join('\n')
    }
  }
  
  md += `\n[Source](${recipe.url})`
  
  return md
}

/**
 * Export grocery list as Markdown with checkboxes
 */
export const exportGroceryListMarkdown = (
  recipe: Recipe,
  visibleComponents: Record<number, boolean>,
  hasComponentIngredients: boolean,
  filteredIngredients: string[]
): string => {
  // Get all ingredients from visible components
  const visibleComps = recipe.components 
    ? recipe.components.filter((_, index) => visibleComponents[index] !== false)
    : []
  
  let md = `# Grocery List: ${recipe.title}\n\n`
  
  if (hasComponentIngredients && visibleComps.length > 0) {
    // Components have their own ingredients - show per component
    visibleComps.forEach(comp => {
      if (comp.ingredients && comp.ingredients.length > 0) {
        md += `## ${comp.name}\n\n`
        comp.ingredients.forEach(ingredient => {
          md += `- [ ] ${ingredient}\n`
        })
        md += `\n`
      }
    })
  } else {
    // Traditional format: all ingredients
    filteredIngredients.forEach(ingredient => {
      md += `- [ ] ${ingredient}\n`
    })
  }
  
  md += `\n[Source](${recipe.url})`
  
  return md
}

/**
 * Export grocery list as PDF (opens print dialog)
 */
export const exportGroceryListPDFService = (
  recipe: Recipe,
  visibleComponents: Record<number, boolean>,
  hasComponentIngredients: boolean,
  filteredIngredients: string[]
): void => {
  // Get ingredients
  const visibleComps = recipe.components 
    ? recipe.components.filter((_, index) => visibleComponents[index] !== false)
    : []
  
  let ingredientsList: { name: string; ingredients: string[] }[] = []
  
  if (hasComponentIngredients && visibleComps.length > 0) {
    visibleComps.forEach(comp => {
      if (comp.ingredients && comp.ingredients.length > 0) {
        ingredientsList.push({ name: comp.name, ingredients: comp.ingredients })
      }
    })
  } else {
    ingredientsList = [{ name: 'Ingredients', ingredients: filteredIngredients }]
  }

  // Create HTML content
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Grocery List: ${recipe.title}</title>
      <style>
        @media print {
          @page { margin: 20mm; size: letter; }
          body { background: white; }
        }
        body {
          font-family: system-ui, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #1c1917;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: #ea580c;
        }
        h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #f97316;
        }
        ul {
          list-style: none;
          padding-left: 0;
        }
        li {
          margin: 0.5rem 0;
          padding: 0.5rem;
          border-bottom: 1px solid #fde68a;
        }
        label {
          display: flex;
          align-items: center;
        }
        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          margin-right: 10px;
          accent-color: #ea580c;
          cursor: pointer;
        }
        span {
          font-size: 1.1rem;
        }
        .source {
          margin-top: 2rem;
          font-size: 0.9rem;
          color: #78716c;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <h1>Grocery List: ${recipe.title}</h1>
  `
  
  ingredientsList.forEach(section => {
    if (ingredientsList.length > 1 && section.name !== 'Ingredients') {
      htmlContent += `<h2>${section.name}</h2>`
    }
    htmlContent += `<ul>`
    section.ingredients.forEach(ingredient => {
      htmlContent += `
        <li>
          <label>
            <input type="checkbox">
            <span>${ingredient}</span>
          </label>
        </li>
      `
    })
    htmlContent += `</ul>`
  })
  
  htmlContent += `
      <p class="source">Source: ${recipe.url}</p>
    </body>
    </html>
  `
  
  // Open print window
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }
}

/**
 * Export recipe as PDF (uses native print)
 */
export const exportRecipePDF = (): void => {
  window.print()
}

