export interface RecipeComponent {
  name: string
  steps: string[]
  ingredients?: string[]
}

export interface Recipe {
  title: string
  url: string
  ingredients?: string[]
  instructions?: string[]
  components?: RecipeComponent[]
}

