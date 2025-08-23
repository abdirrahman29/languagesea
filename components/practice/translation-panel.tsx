// Full translation panel
"use client"

import { useState } from "react"
import { Globe, Eye, EyeOff, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface TranslationPanelProps {
  germanText: string
  englishText: string
  isVisible: boolean
  onToggle: () => void
  className?: string
}

export default function TranslationPanel({
  germanText,
  englishText,
  isVisible,
  onToggle,
  className
}: TranslationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedText, setCopiedText] = useState<'german' | 'english' | null>(null)

  const handleCopy = async (text: string, type: 'german' | 'english') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(type)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm", className)}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe size={20} className="text-blue-600" />
          <span className="font-semibold text-gray-900">
            Full Translation
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isVisible ? (
            <EyeOff size={20} className="text-gray-500" />
          ) : (
            <Eye size={20} className="text-gray-500" />
          )}
          {isVisible && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-500" />
              )}
            </button>
          )}
        </div>
      </button>

      {/* Content */}
      {isVisible && (
        <div className="border-t border-gray-200">
          {/* German Text */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                🇩🇪 German
              </h4>
              <button
                onClick={() => handleCopy(germanText, 'german')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                {copiedText === 'german' ? (
                  <Check size={14} className="text-green-600" />
                ) : (
                  <Copy size={14} />
                )}
                {copiedText === 'german' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className={cn(
              "text-gray-800 leading-relaxed",
              !isExpanded && "line-clamp-3"
            )}>
              {germanText}
            </p>
          </div>

          {/* English Translation */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                🇺🇸 English
              </h4>
              <button
                onClick={() => handleCopy(englishText, 'english')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                {copiedText === 'english' ? (
                  <Check size={14} className="text-green-600" />
                ) : (
                  <Copy size={14} />
                )}
                {copiedText === 'english' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className={cn(
              "text-gray-600 leading-relaxed",
              !isExpanded && "line-clamp-3"
            )}>
              {englishText}
            </p>
          </div>

          {/* Expand toggle for long texts */}
          {(germanText.length > 200 || englishText.length > 200) && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={16} />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Show more
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}