import { ref, watch, onMounted } from 'vue'

export const useDarkMode = () => {
  const isDark = ref(false)

  // Update dark mode class on document
  const updateDarkClass = () => {
    if (typeof document !== 'undefined' && document.documentElement) {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  // Watch for changes
  watch(isDark, () => {
    updateDarkClass()
  })

  // Toggle dark mode
  const toggleDarkMode = () => {
    isDark.value = !isDark.value
    updateDarkClass()
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('darkMode', isDark.value.toString())
    }
  }

  // Initialize dark mode from localStorage or system preference
  onMounted(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initialValue = saved !== null ? saved === 'true' : prefersDark
      isDark.value = initialValue
      updateDarkClass()

      // Watch for system preference changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('darkMode') === null) {
          isDark.value = e.matches
        }
      })
    }
  })

  return {
    isDark,
    toggleDarkMode
  }
}

