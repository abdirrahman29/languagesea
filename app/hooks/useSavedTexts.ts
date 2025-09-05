// hooks/useSavedTexts.ts
import { useState, useEffect, useCallback } from 'react'

interface SavedText {
  id: string
  title: string
  wordCount: number
  level?: string
  totalWords?: number
  dateAdded?: string
}

interface UseSavedTextsReturn {
  savedTexts: SavedText[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  fetchPracticeList: () => Promise<SavedText[]>
}

export function useSavedTexts(): UseSavedTextsReturn {
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSavedTexts = useCallback(async (practiceMode = false): Promise<SavedText[]> => {
    setIsLoading(true)
    setError(null)

    console.log(`🚀 Fetching saved texts, practiceMode: ${practiceMode}`)

    try {
      let response: Response

      if (practiceMode) {
        console.log('📨 Using POST /api/saved-texts for practice list')
        // Use the optimized POST endpoint for practice selection
        response = await fetch('/api/saved-texts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'practice-list'
          })
        })
      } else {
        console.log('📨 Using GET /api/saved-texts for full data')
        // Use the GET endpoint for full data
        response = await fetch('/api/saved-texts?limit=100')
      }

      console.log(`📡 Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ HTTP Error ${response.status}:`, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 Raw API response:', data)

      if (data.error) {
        console.error('❌ API returned error:', data.error)
        throw new Error(data.error)
      }

      let texts: SavedText[]
      
      if (practiceMode) {
        texts = data.texts || []
        console.log(`🎯 Practice mode: received ${texts.length} texts`)
      } else {
        texts = data.savedTexts || []
        console.log(`📚 Full mode: received ${texts.length} savedTexts`)
      }

      console.log('📝 Raw texts data:', texts)
      console.log('📝 Data structure check:', {
        hasTexts: Array.isArray(texts),
        textsLength: texts?.length,
        firstText: texts?.[0],
        dataKeys: Object.keys(data)
      })

      // Ensure all required fields exist and are properly typed
      const processedTexts = texts.map(text => {
        const processed = {
          id: String(text.id),
          title: text.title || 'Untitled',
          wordCount: Number(text.wordCount) || 0,
          level: text.level,
          totalWords: text.totalWords,
          dateAdded: text.dateAdded
        }
        
        console.log(`🔄 Processed text:`, {
          id: processed.id,
          title: processed.title,
          wordCount: processed.wordCount,
          hasWords: processed.wordCount > 0
        })
        
        return processed
      }).filter(text => {
        const hasWords = text.wordCount > 0
        if (!hasWords) {
          console.log(`⚠️ Filtering out text "${text.title}" - no words (${text.wordCount})`)
        }
        return hasWords
      }) // Only include texts with words

      console.log(`✅ Final processed texts: ${processedTexts.length}`)
      console.log('📊 Final texts summary:', processedTexts.map(t => ({ id: t.id, title: t.title, wordCount: t.wordCount })))

      if (!practiceMode) {
        console.log(`💾 Setting savedTexts state with ${processedTexts.length} texts`)
        setSavedTexts(processedTexts)
      }
      
      return processedTexts

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch saved texts'
      console.error('❌ Error fetching saved texts:', err)
      console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack')
      setError(errorMessage)
      
      if (!practiceMode) {
        setSavedTexts([])
      }
      
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchSavedTexts(false)
  }, [fetchSavedTexts])

  const fetchPracticeList = useCallback(async (): Promise<SavedText[]> => {
    return await fetchSavedTexts(true)
  }, [fetchSavedTexts])

  // Initial fetch on mount
  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    savedTexts,
    isLoading,
    error,
    refetch,
    fetchPracticeList
  }
}