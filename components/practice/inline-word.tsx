// Individual word component
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface InlineWordProps {
  word: string
  baseForm: string
  translation?: string
  familiarity: 'unknown' | 'learning' | 'familiar' | 'mastered'
  isTarget: boolean
  showTranslation: boolean
  type?: 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB'
  onClick?: () => void
}

export default function InlineWord({
  word,
  baseForm,
  translation,
  familiarity,
  isTarget,
  showTranslation,
  type,
  onClick
}: InlineWordProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Color mapping for familiarity levels
  const getFamiliarityColors = (familiarity: InlineWordProps['familiarity']) => {
    switch (familiarity) {
      case 'unknown':
        return {
          bg: 'bg-red-100 hover:bg-red-200',
          text: 'text-red-800 font-bold', // Added font-bold here for consistency
          border: 'border-red-300',
          underline: 'decoration-red-500'
        }
      case 'learning':
        return {
          bg: 'bg-orange-100 hover:bg-orange-200',
          text: 'text-orange-800 font-bold', // Added font-bold here for consistency
          border: 'border-orange-300',
          underline: 'decoration-orange-500'
        }
      case 'familiar':
        return {
          bg: 'bg-yellow-100 hover:bg-yellow-200',
          text: 'text-yellow-800 font-bold', // Added font-bold here for consistency
          border: 'border-yellow-300',
          underline: 'decoration-yellow-500'
        }
      case 'mastered':
        return {
          bg: 'bg-green-100 hover:bg-green-200',
          text: 'text-green-800 font-bold', // Added font-bold here for consistency
          border: 'border-green-300',
          underline: 'decoration-green-500'
        }
      default:
        return {
          bg: 'bg-gray-100 hover:bg-gray-200',
          text: 'text-gray-800 font-bold', // Added font-bold here for consistency
          border: 'border-gray-300',
          underline: 'decoration-gray-500'
        }
    }
  }

  const colors = getFamiliarityColors(familiarity)

  // Non-target words (regular text)
  if (!isTarget) {
    return <span className="text-gray-900">{word}</span>
  }

  // Target words (interactive)
  return (
    <span
      className={cn(
        "relative inline-block cursor-pointer transition-all duration-200 px-1 py-0.5 rounded-sm",
        "underline decoration-2 underline-offset-2",
        colors.bg,
        colors.text,
        colors.underline,
        isHovered && "scale-105 shadow-sm",
        // ▼▼▼ THIS LINE WAS REMOVED ▼▼▼
        // "font-bold text-red-500", 
        onClick && "hover:shadow-md"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={translation ? `${baseForm}: ${translation}` : baseForm}
    >
      {/* ▼▼▼ MODIFIED THIS LINE TO REMOVE ASTERISKS ▼▼▼ */}
      {word.replace(/\*\*/g, "")}
      
      {/* Translation tooltip */}
      {showTranslation && translation && (
        <span className={cn(
          "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1",
          "px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap",
          "opacity-0 transition-opacity duration-200 pointer-events-none z-10",
          isHovered && "opacity-100"
        )}>
          {translation}
          <span className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </span>
      )}
      
      {/* Type indicator */}
      {type && isHovered && (
        <span className={cn(
          "absolute top-full left-1/2 transform -translate-x-1/2 mt-1",
          "px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded whitespace-nowrap",
          "opacity-0 transition-opacity duration-200 pointer-events-none z-10",
          isHovered && "opacity-100"
        )}>
          {type.toLowerCase()}
        </span>
      )}
    </span>
  )
}

// Wrapper component for proper spacing
export function WordWithSpacing({ children }: { children: React.ReactNode }) {
  return <span className="inline-block">{children}</span>
}

// Punctuation component
export function PunctuationMark({ mark }: { mark: string }) {
  return (
    <span className="text-gray-700 select-text">
      {mark}
    </span>
  )
}