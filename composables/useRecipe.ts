import { ref, computed } from 'vue'
import type { Recipe } from '../types/recipe.js'

export const useRecipe = () => {
  const url = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const recipe = ref<Recipe | null>(null)
  const visibleComponents = ref<Record<number, boolean>>({})

  // Check if components have their own ingredients
  const hasComponentIngredients = computed(() => {
    if (!recipe.value || !recipe.value.components) return false
    return recipe.value.components.some(comp => comp.ingredients && comp.ingredients.length > 0)
  })

  // Filter ingredients based on visible components
  const filteredIngredients = computed(() => {
    if (!recipe.value) return []
    
    // If components have their own ingredients, combine visible ones
    if (hasComponentIngredients.value && recipe.value.components) {
      const allIngredients: string[] = []
      recipe.value.components.forEach((comp, index) => {
        if (visibleComponents.value[index] !== false && comp.ingredients) {
          allIngredients.push(...comp.ingredients)
        }
      })
      return allIngredients
    }
    
    // Otherwise return all top-level ingredients
    return recipe.value.ingredients || []
  })

  // Get visible components
  const getVisibleComponents = computed(() => {
    if (!recipe.value || !recipe.value.components) return []
    return recipe.value.components.filter((_, index) => visibleComponents.value[index] !== false)
  })

  const handleScrape = async () => {
    loading.value = true
    error.value = null
    recipe.value = null
    visibleComponents.value = {}

    try {
      const data = await $fetch<Recipe>('/api/scrape', {
        method: 'POST',
        body: { url: url.value }
      })
      recipe.value = data
      
      // Initialize all components as visible
      if (data.components && data.components.length > 0) {
        data.components.forEach((_, index) => {
          visibleComponents.value[index] = true
        })
      }
    } catch (err: any) {
      error.value = err.statusMessage || "Failed to load recipe. Ensure the URL is valid."
    } finally {
      loading.value = false
    }
  }

  const toggleComponent = (index: number) => {
    visibleComponents.value[index] = !visibleComponents.value[index]
  }

  const selectAllComponents = () => {
    if (recipe.value && recipe.value.components) {
      recipe.value.components.forEach((_, index) => {
        visibleComponents.value[index] = true
      })
    }
  }

  const deselectAllComponents = () => {
    if (recipe.value && recipe.value.components) {
      recipe.value.components.forEach((_, index) => {
        visibleComponents.value[index] = false
      })
    }
  }

  return {
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
  }
}

