/**
 * Clean up HTML tags if they sneak into the instructions
 */
export const cleanText = (text: string): string => {
  return text.replace(/<[^>]*>?/gm, '')
}

