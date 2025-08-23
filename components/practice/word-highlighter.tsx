// Text renderer with highlighted interactive words
"use client"

import { useMemo } from "react"
import InlineWord, { WordWithSpacing, PunctuationMark } from "./inline-word"
import { cn } from "@/lib/utils"

interface WordData {
  word: string
  baseForm: string
  translation?: string
  isTarget: boolean
  position: { start: number; end: number }
  familiarity: 'unknown' | 'learning' | 'familiar' | 'mastered'
  showTranslation: boolean
  type?: 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB'
}

interface WordHighlighterProps {
  text: string
  words: WordData[]
  onWordClick: (baseForm: string, type: string) => void
  className?: string
  fontSize?: 'sm' | 'base' | 'lg' | 'xl'
}

export default function WordHighlighter({
  text,
  words,
  onWordClick,
  className,
  fontSize = 'base'
}: WordHighlighterProps) {
  
  // Parse text and create renderable elements
  const renderableElements = useMemo(() => {
    const elements: Array<{
      type: 'word' | 'punctuation' | 'space'
      content: string
      wordData?: WordData
      position: number
    }> = []
    
    // Create word position map
    const wordMap = new Map(
      words.map(word => [word.word.toLowerCase(), word])
    )

    let currentPos = 0
    const textParts = text.split(/(\s+|[.!?;:,()""„"])/g)
    
    textParts.forEach((part, index) => {
      if (!part) return
      
      const startPos = currentPos
      const endPos = currentPos + part.length
      
      if (/\s+/.test(part)) {
        // Whitespace
        elements.push({
          type: 'space',
          content: part,
          position: startPos
        })
      } else if (/[.!?;:,()""„"]/.test(part)) {
        // Punctuation
        elements.push({
          type: 'punctuation',
          content: part,
          position: startPos
        })
      } else {
        // Word - clean and match against word data
        const cleanWord = part.toLowerCase().replace(/[^a-zA-ZäöüßÄÖÜ]/g, '')
        const wordData = wordMap.get(cleanWord) || 
                        words.find(w => w.baseForm.toLowerCase() === cleanWord) ||
                        words.find(w => w.word.toLowerCase().includes(cleanWord))
        
        elements.push({
          type: 'word',
          content: part,
          wordData,
          position: startPos
        })
      }
      
      currentPos = endPos
    })
    
    return elements
  }, [text, words])

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl leading-relaxed'
  }

  return (
    <div className={cn(
      "select-text",
      fontSizeClasses[fontSize],
      className
    )}>
      {renderableElements.map((element, index) => {
        if (element.type === 'space') {
          return <span key={index} className="whitespace-pre">{element.content}</span>
        }
        
        if (element.type === 'punctuation') {
          return (
            <PunctuationMark 
              key={index}
              mark={element.content}
            />
          )
        }
        
        if (element.type === 'word') {
          return (
            <WordWithSpacing key={index}>
              <InlineWord
                word={element.content}
                baseForm={element.wordData?.baseForm || element.content}
                translation={element.wordData?.translation}
                familiarity={element.wordData?.familiarity || 'unknown'}
                isTarget={element.wordData?.isTarget || false}
                showTranslation={element.wordData?.showTranslation || false}
                type={element.wordData?.type}
                onClick={() => {
                  if (element.wordData?.isTarget) {
                    onWordClick(
                      element.wordData.baseForm,
                      element.wordData.type || 'NOUN'
                    )
                  }
                }}
              />
            </WordWithSpacing>
          )
        }
        
        return null
      })}
    </div>
  )
}