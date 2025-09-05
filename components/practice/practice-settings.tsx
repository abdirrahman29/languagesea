"use client"

import { useState, useEffect } from "react"
import { Settings, BookOpen, MessageCircle, Newspaper, Target, Zap, RefreshCw, AlignLeft, AlignCenter, AlignRight, FileText, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

const AVAILABLE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CONTENT_LENGTHS = [
  { id: 'short', label: 'Short', wordCount: 80, description: '~80-120 words', icon: AlignLeft },
  { id: 'medium', label: 'Medium', wordCount: 320, description: '~320-780 words', icon: AlignCenter },
  { id: 'long', label: 'Long', wordCount: 1080, description: '~1080-1450 words', icon: AlignRight },
];

const CONTENT_STYLES = [
  {
    id: 'story' as const,
    name: 'Story',
    icon: BookOpen,
    description: 'Engaging narratives and tales',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'conversation' as const,
    name: 'Dialogue',
    icon: MessageCircle,
    description: 'Natural conversations and chats',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'article' as const,
    name: 'Article',
    icon: Newspaper,
    description: 'Informative articles and news',
    color: 'bg-green-100 text-green-800 border-green-200'
  }
];

interface SavedText {
  id: string
  title: string
  wordCount: number
  level?: string
}

interface PracticeSettingsProps {
  currentTheme: string
  currentStyle: 'conversation' | 'article' | 'story'
  autoDetectedLevel: string
  currentLevelSetting: string
  targetWordCount: number
  themes: Array<{ name: string; wordCount: number }>
  savedTexts: SavedText[]
  onThemeChange: (theme: string) => void
  onStyleChange: (style: 'conversation' | 'article' | 'story') => void
  onLevelSettingChange: (level: string) => void
  onTargetWordCountChange: (count: number) => void
  onStartSession: () => void
  currentLength: number
  onLengthChange: (length: number) => void
  isGenerating: boolean
  className?: string
  practiceSource: 'themes' | 'saved-texts'
  onPracticeSourceChange: (source: 'themes' | 'saved-texts') => void
  selectedSavedTexts: string[]
  onSelectedSavedTextsChange: (textIds: string[]) => void
}

export default function PracticeSettings({
  currentTheme,
  currentStyle,
  autoDetectedLevel,
  currentLevelSetting,
  targetWordCount,
  themes = [], // Default to empty array
  savedTexts = [], // Default to empty array
  onThemeChange,
  onStyleChange,
  onTargetWordCountChange,
  onStartSession,
  onLevelSettingChange,
  currentLength,
  onLengthChange,
  isGenerating,
  className,
  practiceSource,
  onPracticeSourceChange,
  selectedSavedTexts = [], // Default to empty array
  onSelectedSavedTextsChange
}: PracticeSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [customWordCount, setCustomWordCount] = useState(targetWordCount)
  const [isLoadingSavedTexts, setIsLoadingSavedTexts] = useState(false)
  const effectiveLevel = currentLevelSetting === 'auto' ? autoDetectedLevel : currentLevelSetting

  // Ensure we have valid arrays
  const safeThemes = Array.isArray(themes) ? themes : []
  const safeSavedTexts = Array.isArray(savedTexts) ? savedTexts : []
  const safeSelectedSavedTexts = Array.isArray(selectedSavedTexts) ? selectedSavedTexts : []

  // Calculate max available words based on current source
  const maxAvailableWords = practiceSource === 'themes' 
    ? safeThemes.find(t => t.name === currentTheme)?.wordCount || 0
    : safeSelectedSavedTexts.length > 0 
      ? safeSelectedSavedTexts.reduce((total, textId) => {
          const text = safeSavedTexts.find(t => t.id === textId)
          return total + (text?.wordCount || 0)
        }, 0)
      : 0

  // Generate word count options based on available words
  const getWordCountOptions = (maxWords: number) => {
    const presetOptions = [5, 10, 15, 20, 30, 50].filter(count => count <= maxWords)
    
    // Add max available option if it's not already included
    if (maxWords > 50 && !presetOptions.includes(maxWords)) {
      presetOptions.push(maxWords)
    }
    
    return presetOptions.map(count => ({
      count,
      label: `${count} words`,
      description: count === maxWords ? 'All available' : `${count} vocabulary words`
    }))
  }

  const wordCountOptions = getWordCountOptions(maxAvailableWords)

  const handleSavedTextSelection = (textId: string, selected: boolean) => {
    if (selected) {
      onSelectedSavedTextsChange([...safeSelectedSavedTexts, textId])
    } else {
      onSelectedSavedTextsChange(safeSelectedSavedTexts.filter(id => id !== textId))
    }
  }

  // Load saved texts when switching to saved-texts mode
  useEffect(() => {
    if (practiceSource === 'saved-texts' && safeSavedTexts.length === 0) {
      setIsLoadingSavedTexts(true)
      // This would typically trigger a fetch in the parent component
      // You might want to pass a callback for this
      setTimeout(() => setIsLoadingSavedTexts(false), 1000) // Temporary
    }
  }, [practiceSource, safeSavedTexts.length])

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Practice Settings</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Hide' : 'Customize'}
        </button>
      </div>

      {/* Quick Start */}
      {!isExpanded && (
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Source:</span>
              <span className="font-medium text-gray-900 capitalize">
                {practiceSource === 'themes' ? currentTheme : `${safeSelectedSavedTexts.length} texts selected`}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Style:</span>
              <span className="font-medium text-gray-900 capitalize">{currentStyle}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Level:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                {currentLevelSetting === 'auto' ? `Auto (${autoDetectedLevel})` : `Manual (${currentLevelSetting})`}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Words:</span>
              <span className="font-medium text-gray-900">{targetWordCount} / {maxAvailableWords}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Settings */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Practice Source Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Practice Source
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onPracticeSourceChange('themes')}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                  practiceSource === 'themes'
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <Tag size={20} />
                <div>
                  <div className="font-medium">Themes</div>
                  <div className="text-sm opacity-80">Practice by topic</div>
                </div>
              </button>
              
              <button
                onClick={() => onPracticeSourceChange('saved-texts')}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                  practiceSource === 'saved-texts'
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <FileText size={20} />
                <div>
                  <div className="font-medium">Saved Texts</div>
                  <div className="text-sm opacity-80">Practice from your texts</div>
                </div>
              </button>
            </div>
          </div>

          {/* Theme/Text Selection */}
          {practiceSource === 'themes' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Choose Theme
              </label>
              {safeThemes.length === 0 ? (
                <div className="p-4 text-center text-gray-500 border border-gray-200 rounded-lg">
                  No themes available
                </div>
              ) : (
                <select
                  value={currentTheme}
                  onChange={(e) => onThemeChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {safeThemes.map((theme) => (
                    <option key={theme.name} value={theme.name}>
                      {theme.name} ({theme.wordCount} words available)
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Saved Texts ({safeSelectedSavedTexts.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                {isLoadingSavedTexts ? (
                  <div className="p-4 text-center text-gray-500">
                    <RefreshCw size={16} className="animate-spin inline mr-2" />
                    Loading saved texts...
                  </div>
                ) : safeSavedTexts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <div>No saved texts available.</div>
                    <div className="text-xs mt-1">Process some texts first.</div>
                    <div className="text-xs text-blue-600 mt-2">
                      Debug: practiceSource={practiceSource}, safeSavedTexts.length={safeSavedTexts.length}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-2 text-xs text-gray-600 bg-gray-50 border-b">
                      Found {safeSavedTexts.length} texts with practice words
                    </div>
                    {safeSavedTexts.map((text) => (
                      <label key={text.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={safeSelectedSavedTexts.includes(text.id)}
                          onChange={(e) => handleSavedTextSelection(text.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{text.title}</div>
                          <div className="text-xs text-gray-500">
                            {text.wordCount} practice words
                            {text.level && ` • ${text.level}`}
                            {text.totalWords && ` • ${text.totalWords} total`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Content Style */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Content Style
            </label>
            <div className="grid grid-cols-1 gap-3">
              {CONTENT_STYLES.map((style) => {
                const Icon = style.icon
                const isSelected = currentStyle === style.id
                
                return (
                  <button
                    key={style.id}
                    onClick={() => onStyleChange(style.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                      isSelected 
                        ? `${style.color} border-current` 
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon size={20} className={isSelected ? "text-current" : "text-gray-500"} />
                    <div>
                      <div className={cn("font-medium", isSelected ? "text-current" : "text-gray-900")}>
                        {style.name}
                      </div>
                      <div className={cn("text-sm", isSelected ? "text-current opacity-80" : "text-gray-500")}>
                        {style.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content Length */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Content Length
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CONTENT_LENGTHS.map((lengthOpt) => {
                const isSelected = currentLength === lengthOpt.wordCount
                return (
                  <button
                    key={lengthOpt.id}
                    onClick={() => onLengthChange(lengthOpt.wordCount)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all",
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    title={lengthOpt.description}
                  >
                    <lengthOpt.icon size={20} className="mb-1" />
                    <span className="font-medium text-sm">{lengthOpt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Target Word Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Target size={16} />
              Words to Practice (Max: {maxAvailableWords})
            </label>
            
            {maxAvailableWords > 0 ? (
              <>
                {/* Preset options */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {wordCountOptions.map((option) => (
                    <button
                      key={option.count}
                      onClick={() => onTargetWordCountChange(option.count)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        targetWordCount === option.count
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={maxAvailableWords}
                    value={customWordCount}
                    onChange={(e) => {
                      const value = Math.min(Math.max(1, parseInt(e.target.value) || 1), maxAvailableWords)
                      setCustomWordCount(value)
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Custom amount"
                  />
                  <button
                    onClick={() => onTargetWordCountChange(customWordCount)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Set
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-gray-500 border border-gray-200 rounded-lg">
                No words available for practice
              </div>
            )}
          </div>

          {/* Level Setting */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Learning Level
            </label>
            <select
              value={currentLevelSetting}
              onChange={(e) => onLevelSettingChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="auto">
                Auto-detect ({autoDetectedLevel})
              </option>
              {AVAILABLE_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              "Auto" uses your vocabulary history. Manual selection can adjust difficulty.
            </p>
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onStartSession}
          disabled={isGenerating || maxAvailableWords === 0}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2",
            isGenerating || maxAvailableWords === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
          )}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Generating Content...
            </>
          ) : maxAvailableWords === 0 ? (
            <>
              <BookOpen size={20} />
              No Words Available
            </>
          ) : (
            <>
              <BookOpen size={20} />
              Start Practice Session
            </>
          )}
        </button>
        
        {!isGenerating && maxAvailableWords > 0 && (
          <p className="text-center text-xs text-gray-500 mt-2">
            AI will generate personalized content with {targetWordCount} words from your selection
          </p>
        )}
      </div>
    </div>
  )
}