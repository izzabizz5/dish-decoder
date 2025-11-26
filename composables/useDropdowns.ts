import { ref, onMounted } from 'vue'

export const useDropdowns = () => {
  const showRecipeDropdown = ref(false)
  const showGroceryDropdown = ref(false)

  // Close dropdowns when clicking outside
  onMounted(() => {
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.dropdown-container')) {
        showRecipeDropdown.value = false
        showGroceryDropdown.value = false
      }
    })
  })

  return {
    showRecipeDropdown,
    showGroceryDropdown
  }
}

