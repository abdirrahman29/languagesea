// Theme/style selector
"use client"

import { useState } from "react"
import { Settings, BookOpen, MessageCircle, Newspaper, Target, Zap, RefreshCw, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { cn } from "@/lib/utils"
const AVAILABLE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CONTENT_LENGTHS = [
  { id: 'short', label: 'Short', wordCount: 80, description: '~80-120 words', icon: AlignLeft },
  { id: 'medium', label: 'Medium', wordCount: 320, description: '~320-780 words', icon: AlignCenter },
  { id: 'long', label: 'Long', wordCount: 1080, description: '~1080-1450 words', icon: AlignRight },
];

interface PracticeSettingsProps {
  currentTheme: string
  currentStyle: 'conversation' | 'article' | 'story'
  autoDetectedLevel: string; // ✅ ADD This
  currentLevelSetting: string; 
  targetWordCount: number
  themes: Array<{ name: string; wordCount: number }>
  onThemeChange: (theme: string) => void
  onStyleChange: (style: 'conversation' | 'article' | 'story') => void
  onLevelSettingChange: (level: string) => void;
  onTargetWordCountChange: (count: number) => void
  onStartSession: () => void
  currentLength: number; // ⬅️ Change this type to a number in practice-session.tsx
  onLengthChange: (length: number) => void; 
  isGenerating: boolean
  className?: string
}


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
  }]
const getWordCountOptions = (maxWords: number) => {
  const baseOptions = [
    { count: 4, label: '4 words', description: 'Quick practice' },
    { count: 6, label: '6 words', description: 'Balanced session' },
    { count: 8, label: '8 words', description: 'Intensive practice' },
    { count: 10, label: '10 words', description: 'Extended session' },
    { count: 15, label: '15 words', description: 'Long session' },
    { count: 20, label: '20 words', description: 'Marathon session' }
  ]
  
  // Filter options based on available words, but allow up to maxWords
  const availableOptions = baseOptions.filter(option => option.count <= maxWords)
  
  // If theme has more words than our preset options, add a "Max available" option
  if (maxWords > 20) {
    availableOptions.push({
      count: maxWords,
      label: `${maxWords} words`,
      description: 'All available words'
    })
  }
  
  return availableOptions
}

export default function PracticeSettings({
  currentTheme,
  currentStyle,
  autoDetectedLevel,
  currentLevelSetting,
  targetWordCount,
  themes,
  onThemeChange,
  onStyleChange,
  onTargetWordCountChange,
  onStartSession,
  onLevelSettingChange,
  currentLength,
  onLengthChange,

  isGenerating,
  className
}: PracticeSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const effectiveLevel = currentLevelSetting === 'auto' ? autoDetectedLevel : currentLevelSetting;

  const selectedTheme = themes.find(t => t.name === currentTheme)
  const WORD_COUNT_OPTIONS = selectedTheme 
  ? getWordCountOptions(selectedTheme.wordCount) 
  : []
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
              <span className="text-gray-600">Theme:</span>
              <span className="font-medium text-gray-900">{currentTheme}</span>
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
              <span className="text-gray-600">Length:</span>
              <span className="font-medium text-gray-900 capitalize">{currentLength}</span>
            </div>
          
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Target words:</span>
              <span className="font-medium text-gray-900">{targetWordCount} words</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Settings */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Choose Theme
            </label>
            <select
              value={currentTheme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {themes.map((theme) => (
                <option key={theme.name} value={theme.name}>
                  {theme.name} ({theme.wordCount} words available)
                </option>
              ))}
            </select>
            {selectedTheme && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedTheme.wordCount} vocabulary words available in this theme
              </p>
            )}
          </div>

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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Content Length
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CONTENT_LENGTHS.map((lengthOpt) => {
                const isSelected = currentLength === lengthOpt.wordCount; 
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
              Words to Practice
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WORD_COUNT_OPTIONS.map((option) => (
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
          </div>

          {/* Level Display */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Learning Level
            </label>
            <div className="flex items-center gap-2">
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
            </div>
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
          disabled={isGenerating}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2",
            isGenerating
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
          )}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <BookOpen size={20} />
              Start Practice Session
            </>
          )}
        </button>
        
        {!isGenerating && (
          <p className="text-center text-xs text-gray-500 mt-2">
            AI will generate personalized content based on your settings
          </p>
        )}
      </div>
    </div>
  )
}