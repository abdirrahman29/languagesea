// Simple mock translator that doesn't require an API key
export function createTranslator() {
    return {
      translate: async (text: string, options: { from: string; to: string }) => {
        // Mock translation function
        return `[Translation of: ${text}]`
      },
    }
  }
  