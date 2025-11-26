<template>
  <div class="min-h-screen bg-orange-100 dark:bg-gray-900 text-amber-900 dark:text-amber-100 font-sans p-6">
    <div class="max-w-3xl mx-auto">
      
      <!-- Header / Input Section-->
      <header class="mb-8 print">
        <!-- Dark Mode Toggle -->
        <div class="flex justify-end mb-4 print:hidden">
          <button 
            @click="toggleDarkMode"
            class="p-2 rounded-lg bg-orange-100 dark:bg-gray-900 hover:bg-orange-200 dark:hover:bg-gray-700 text-orange-800 dark:text-amber-300 transition"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <svg v-if="!isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>
        <h1 class="text-5xl font-bold text-center mb-2 cherry-bomb-one-regular"> 
          <DecryptedText
            text="Dish Decoder"
            :speed="70"
            :max-iterations="10"
            :sequential="false"
            reveal-direction="start"
            :use-original-chars-only="false"
            animate-on="hover"
            class-name="text-orange-600 dark:text-orange-500"
            encrypted-class-name="text-red-500 dark:text-red-400"
          />
        </h1>
        <p class="text-center text-amber-700 dark:text-amber-300 mb-6">Enter a recipe URL to extract just the good stuff.</p>
        
        <form @submit.prevent="handleScrape" class="flex gap-2">
          <input 
            v-model="url" 
            type="url" 
            placeholder="https://www.allrecipes.com/recipe/..." 
            class="flex-1 p-3 border border-amber-300 dark:border-amber-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-amber-100 placeholder-gray-500 dark:placeholder-amber-400"
            required
          />
          <button 
            type="submit" 
            :disabled="loading"
            class="bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
          >
            {{ loading ? 'Decoding...' : 'Decode' }}
          </button>
        </form>

        <div v-if="error" class="mt-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-700">
          {{ error }}
        </div>
      </header>

      <!-- Recipe Display -->
      <main v-if="recipe" class="bg-yellow-50 dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-amber-200 dark:border-gray-700 print:shadow-none print:border-none print:p-0">
        
        <!-- Toolbar (Hidden when printing) -->
        <div class="flex gap-2 justify-end mb-6 print:hidden border-b border-amber-200 dark:border-gray-700 pb-4">
          <!-- Recipe Export Dropdown -->
          <div class="relative dropdown-container" @click.stop>
            <button 
              @click="showRecipeDropdown = !showRecipeDropdown"
              class="text-sm px-3 py-1 bg-orange-100 dark:bg-gray-700 hover:bg-orange-200 dark:hover:bg-gray-600 rounded text-orange-800 dark:text-amber-200 flex items-center gap-1"
            >
              Export Recipe
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div 
              v-show="showRecipeDropdown"
              class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-amber-200 dark:border-gray-700 z-10"
            >
              <button 
                @click="downloadPDF(); showRecipeDropdown = false"
                class="w-full text-left px-4 py-2 text-sm text-orange-800 dark:text-amber-200 hover:bg-orange-50 dark:hover:bg-gray-700 rounded-t-lg"
              >
                Save as PDF
              </button>
              <button 
                @click="copyMarkdown(); showRecipeDropdown = false"
                class="w-full text-left px-4 py-2 text-sm text-orange-800 dark:text-amber-200 hover:bg-orange-50 dark:hover:bg-gray-700 rounded-b-lg"
              >
                {{ copyStatus }}
              </button>
            </div>
          </div>

          <!-- Grocery List Export Dropdown -->
          <div class="relative dropdown-container" @click.stop>
            <button 
              @click="showGroceryDropdown = !showGroceryDropdown"
              class="text-sm px-3 py-1 bg-orange-100 dark:bg-gray-700 hover:bg-orange-200 dark:hover:bg-gray-600 rounded text-orange-800 dark:text-amber-200 flex items-center gap-1"
            >
              Grocery List
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div 
              v-show="showGroceryDropdown"
              class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-amber-200 dark:border-gray-700 z-10"
            >
              <button 
                @click="exportGroceryListPDF(); showGroceryDropdown = false"
                class="w-full text-left px-4 py-2 text-sm text-orange-800 dark:text-amber-200 hover:bg-orange-50 dark:hover:bg-gray-700 rounded-t-lg"
              >
                Grocery List PDF
              </button>
              <button 
                @click="copyGroceryListMarkdown(); showGroceryDropdown = false"
                class="w-full text-left px-4 py-2 text-sm text-orange-800 dark:text-amber-200 hover:bg-orange-50 dark:hover:bg-gray-700 rounded-b-lg"
              >
                {{ groceryListStatus }}
              </button>
            </div>
          </div>
        </div>

        <!-- Component Filter Section (Hidden when printing) -->
        <div v-if="recipe.components && recipe.components.length > 1" class="mb-6 print:hidden p-4 bg-amber-50 dark:bg-gray-700/50 rounded-lg border border-orange-200 dark:border-gray-600">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-orange-900 dark:text-amber-200">Filter Recipe Sections</h3>
            <div class="flex gap-2">
              <button 
                @click="selectAllComponents" 
                class="text-xs px-2 py-1 text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:underline"
              >
                Select All
              </button>
              <span class="text-orange-300 dark:text-gray-600">|</span>
              <button 
                @click="deselectAllComponents" 
                class="text-xs px-2 py-1 text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <label 
              v-for="(component, index) in recipe.components" 
              :key="index"
              class="flex items-center cursor-pointer"
            >
              <input 
                type="checkbox" 
                :checked="visibleComponents[index]"
                @change="toggleComponent(index)"
                class="filter-checkbox mr-2 w-4 h-4 text-orange-600 dark:text-orange-500 border-orange-400 dark:border-gray-600 rounded focus:ring-orange-500 dark:focus:ring-orange-600 bg-white dark:bg-gray-800 cursor-pointer"
              />
              <span class="text-sm text-orange-900 dark:text-amber-200">{{ component.name }}</span>
            </label>
          </div>
        </div>

        <!-- Recipe Content -->
        <h1 class="text-4xl cherry-bomb-one-regular font-bold text-orange-900 dark:text-orange-400 mb-4">{{ recipe.title }}</h1>
        <div class="text-sm text-amber-700 dark:text-amber-400 mb-8 italic">Source: {{ recipe.url }}</div>

        <div class="grid md:grid-cols-3 gap-8 print:grid-cols-1">
          <!-- Ingredients Column -->
          <div class="md:col-span-1 print:col-span-1 print:page-break-after-always">
            <h3 class="text-xl font-bold border-b-2 border-orange-500 dark:border-orange-600 pb-2 mb-4 text-orange-900 dark:text-orange-300">Ingredients</h3>
            
            <!-- Display ingredients by component if available -->
            <div v-if="recipe.components && recipe.components.length > 0 && hasComponentIngredients" class="space-y-6">
              <div 
                v-for="(component, compIndex) in recipe.components" 
                :key="compIndex"
                v-show="visibleComponents[compIndex] !== false"
                class="print:page-break-inside-avoid"
              >
                <h4 class="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2 mt-4 first:mt-0">{{ component.name }}</h4>
                <ul class="space-y-2 text-sm leading-relaxed">
                  <li v-for="(item, index) in (component.ingredients || [])" :key="index" class="flex items-start text-amber-900 dark:text-amber-200">
                    <span class="mr-2 text-orange-500 dark:text-orange-400">•</span> {{ item }}
                  </li>
                </ul>
              </div>
            </div>
            
            <!-- Fallback to top-level ingredients if no component-specific ingredients -->
            <ul v-else class="space-y-2 text-sm leading-relaxed">
              <li v-for="(item, index) in filteredIngredients" :key="index" class="flex items-start text-amber-900 dark:text-amber-200">
                <span class="mr-2 text-orange-500 dark:text-orange-400">•</span> {{ item }}
              </li>
            </ul>
          </div>

          <!-- Instructions Column -->
          <div class="md:col-span-2 print:col-span-1 print:page-break-before-always">
            <h3 class="text-xl font-bold border-b-2 border-orange-500 dark:border-orange-600 pb-2 mb-4 text-orange-900 dark:text-orange-300">Instructions</h3>
            
            <!-- Display components if available -->
            <div v-if="recipe.components && recipe.components.length > 0" class="space-y-8">
              <div 
                v-for="(component, compIndex) in recipe.components" 
                :key="compIndex" 
                v-show="visibleComponents[compIndex] !== false"
                class="print:page-break-inside-avoid"
              >
                <h4 class="text-lg font-bold text-orange-700 dark:text-orange-400 mb-3 mt-6 first:mt-0">{{ component.name }}</h4>
                <ol class="space-y-3 ml-2">
                  <li v-for="(step, stepIndex) in component.steps" :key="stepIndex" class="flex">
                    <span class="font-bold text-orange-600 dark:text-orange-500 mr-3 text-base flex-shrink-0">{{ stepIndex + 1 }}.</span>
                    <span class="text-amber-900 dark:text-amber-200 leading-relaxed">{{ cleanText(step) }}</span>
                  </li>
                </ol>
              </div>
            </div>
            
            <!-- Fallback to old format if components not available -->
            <ol v-else-if="recipe.instructions" class="space-y-4">
              <li v-for="(step, index) in recipe.instructions" :key="index" class="flex">
                <span class="font-bold text-orange-600 dark:text-orange-500 mr-4 text-lg">{{ index + 1 }}.</span>
                <span class="text-amber-900 dark:text-amber-200 leading-relaxed">{{ cleanText(step) }}</span>
              </li>
            </ol>
          </div>
        </div>
      </main>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DecryptedText from "../components/DecryptedText.vue"
import { useDarkMode } from '../composables/useDarkMode'
import { useRecipe } from '../composables/useRecipe'
import { useDropdowns } from '../composables/useDropdowns'
import { 
  exportRecipePDF, 
  exportRecipeMarkdown, 
  exportGroceryListPDFService, 
  exportGroceryListMarkdown 
} from '../services/exportService'
import { cleanText } from '../utils/textUtils'

// Load Cherry Bomb One font
useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Cherry+Bomb+One&display=swap'
    }
  ]
})

// Composables
const { isDark, toggleDarkMode } = useDarkMode()
const {
  url,
  loading,
  error,
  recipe,
  visibleComponents,
  hasComponentIngredients,
  filteredIngredients,
  getVisibleComponents,
  handleScrape,
  toggleComponent,
  selectAllComponents,
  deselectAllComponents
} = useRecipe()
const { showRecipeDropdown, showGroceryDropdown } = useDropdowns()

// Status messages for copy operations
const copyStatus = ref('Copy Markdown')
const groceryListStatus = ref('Copy Grocery List')

// Export functions
const downloadPDF = () => {
  exportRecipePDF()
}

const copyMarkdown = () => {
  if (!recipe.value) return
  
  const md = exportRecipeMarkdown(
    recipe.value,
    visibleComponents.value,
    hasComponentIngredients.value,
    filteredIngredients.value
  )
  
  navigator.clipboard.writeText(md)
  copyStatus.value = "Copied!"
  setTimeout(() => copyStatus.value = "Copy Markdown", 2000)
}

const copyGroceryListMarkdown = () => {
  if (!recipe.value) return
  
  const md = exportGroceryListMarkdown(
    recipe.value,
    visibleComponents.value,
    hasComponentIngredients.value,
    filteredIngredients.value
  )
  
  navigator.clipboard.writeText(md)
  groceryListStatus.value = "Copied!"
  setTimeout(() => groceryListStatus.value = "Copy Grocery List", 2000)
}

const exportGroceryListPDF = () => {
  if (!recipe.value) return
  
  exportGroceryListPDFService(
    recipe.value,
    visibleComponents.value,
    hasComponentIngredients.value,
    filteredIngredients.value
  )
}
</script>

<style>
.cherry-bomb-one-regular {
  font-family: "Cherry Bomb One", system-ui;
  font-weight: 400;
  font-style: normal;
}

/* Custom checkbox styling to match warm aesthetic */
.filter-checkbox {
  accent-color: #ea580c; /* orange-600 */
  border-width: 2px;
  transition: all 0.2s ease;
}

.filter-checkbox:hover {
  border-color: #f97316; /* orange-500 */
  box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.1); /* orange-400 with opacity */
}

.filter-checkbox:checked {
  background-color: #ea580c; /* orange-600 */
  border-color: #ea580c;
}

.filter-checkbox:checked:hover {
  background-color: #f97316; /* orange-500 */
  border-color: #f97316;
}

.dark .filter-checkbox {
  accent-color: #f97316; /* orange-500 for dark mode */
}

.dark .filter-checkbox:hover {
  border-color: #fb923c; /* orange-400 */
  box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.2);
}

.dark .filter-checkbox:checked {
  background-color: #f97316; /* orange-500 */
  border-color: #f97316;
}

.dark .filter-checkbox:checked:hover {
  background-color: #fb923c; /* orange-400 */
  border-color: #fb923c;
}

/* Warm color enhancements */
body {
  background: linear-gradient(to bottom, #fed7aa, #fdba74);
}

.dark body {
  background: linear-gradient(to bottom, #1f2937, #111827);
}
/* CSS to make the PDF look perfect */
@media print {
  @page { 
    margin: 20mm; 
    size: letter;
  }
  body { 
    background: white; 
  }
  .print\:hidden { 
    display: none !important; 
  }
  .print\:shadow-none { 
    box-shadow: none !important; 
  }
  .print\:page-break-after-always {
    page-break-after: always !important;
  }
  .print\:page-break-before-always {
    page-break-before: always !important;
  }
  /* Ensure ingredients section fits on one page */
  .print\:page-break-after-always ul {
    page-break-inside: avoid;
  }
  /* Prevent instructions from breaking awkwardly */
  .print\:page-break-before-always ol li {
    page-break-inside: avoid;
  }
  .print\:page-break-inside-avoid {
    page-break-inside: avoid;
  }
  /* Add space between components in print */
  .print\:page-break-inside-avoid + .print\:page-break-inside-avoid {
    margin-top: 1rem;
  }
}
</style>