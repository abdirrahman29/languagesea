"use client"

import { useState, useEffect } from "react"
import { Settings, BookOpen, MessageCircle, Newspaper, Target, Zap, RefreshCw, Users, Clock, Tag, FileText, CheckCircle2, ArrowRight, ArrowLeft, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const AVAILABLE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const WORD_CATEGORIES = [
  { id: 'VERB', name: 'Verbs', icon: '🔴', description: 'Action words and their conjugations' },
  { id: 'NOUN', name: 'Nouns', icon: '🔵', description: 'People, places, things' },
  { id: 'ADJ', name: 'Adjectives', icon: '🟡', description: 'Descriptive words' },
  { id: 'ADVERB', name: 'Adverbs', icon: '🟣', description: 'Modifying words' }
];

const CONTENT_STYLES = [
  {
    id: 'story' as const,
    name: 'Story',
    icon: BookOpen,
    description: 'Engaging narratives with plot development'
  },
  {
    id: 'dialogue-2' as const,
    name: '2-Person Dialogue',
    icon: Users,
    description: 'Conversation between two people'
  },
  {
    id: 'dialogue-3' as const,
    name: '3-Person Dialogue',
    icon: Users,
    description: 'Conversation between three people'
  },
  {
    id: 'dialogue-4' as const,
    name: '4-Person Dialogue',
    icon: Users,
    description: 'Group conversation with four people'
  },
  {
    id: 'article' as const,
    name: 'Article',
    icon: Newspaper,
    description: 'Informative articles and reports'
  }
];

const CONTENT_LENGTHS = [
  { id: 'short', label: 'Short', wordCount: 80, description: '~80-120 words', icon: AlignLeft },
  { id: 'medium', label: 'Medium', wordCount: 320, description: '~320-480 words', icon: AlignCenter },
  { id: 'long', label: 'Long', wordCount: 800, description: '~800-1200 words', icon: AlignRight },
];

const DIFFICULTY_LEVELS = [
  { id: 'easy', name: 'Easy', description: 'Simple sentences, basic vocabulary', color: 'bg-green-100 text-green-800' },
  { id: 'medium', name: 'Medium', description: 'Moderate complexity, mixed structures', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'hard', name: 'Hard', description: 'Complex sentences, advanced grammar', color: 'bg-red-100 text-red-800' }
];

const GERMAN_TENSES = [
  { id: 'present', name: 'Present (Präsens)', description: 'Current actions and states' },
  { id: 'past', name: 'Simple Past (Präteritum)', description: 'Completed past actions' },
  { id: 'perfect', name: 'Present Perfect (Perfekt)', description: 'Actions completed in the past with present relevance' },
  { id: 'pluperfect', name: 'Past Perfect (Plusquamperfekt)', description: 'Actions completed before another past action' },
  { id: 'future', name: 'Future (Futur I)', description: 'Future actions and intentions' },
  { id: 'mixed', name: 'Mixed Tenses', description: 'Practice with multiple tenses' }
];

interface SavedText {
  id: string
  title: string
  wordCount: number
  level?: string
}

interface PracticeSettingsProps {
  themes: Array<{ name: string; wordCount: number }>
  savedTexts: SavedText[]
  onStartSession: (config: PracticeConfiguration) => void
  isGenerating: boolean
  className?: string
}

interface DynamicOptions {
  availableLevels: string[]
  availableThemes: Array<{ 
    name: string; 
    wordCount: number; 
    levels: string[];
    id?: string;
    description?: string;
  }>
  categoryStats: Record<string, { 
    totalWords: number; 
    levelDistribution: Record<string, number> 
  }>
}

export interface PracticeConfiguration {
  // Step 1: Categories
  selectedCategories: string[]
  
  // Step 2: Level and source
  level: string
  practiceSource: 'themes' | 'saved-texts'
  selectedTheme?: string
  selectedSavedTexts?: string[]
  
  // Step 3: Word counts per category
  wordCounts: Record<string, number>
  
  // Step 4: Content style
  contentStyle: string
  
  // Step 5: Tense focus
  tenseFocus: string[]
  
  // Step 6: Content length
  length: number
  
  // Step 7: Overall difficulty
  difficulty: 'easy' | 'medium' | 'hard'
}

export default function EnhancedPracticeSettings({
  themes = [],
  savedTexts = [],
  onStartSession,
  isGenerating,
  className
}: PracticeSettingsProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [config, setConfig] = useState<PracticeConfiguration>({
    selectedCategories: [],
    level: 'A1',
    practiceSource: 'themes',
    wordCounts: {},
    contentStyle: 'story',
    tenseFocus: ['present'],
    length: 320,
    difficulty: 'medium'
  })
  
  // Dynamic options based on actual data
  const [dynamicOptions, setDynamicOptions] = useState<DynamicOptions>({
    availableLevels: [],
    availableThemes: [],
    categoryStats: {}
  })
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  // Load dynamic options when categories or source change
  useEffect(() => {
    const loadDynamicOptions = async () => {
      if (config.selectedCategories.length === 0) {
        setDynamicOptions({
          availableLevels: [],
          availableThemes: [],
          categoryStats: {}
        })
        return
      }

      setIsLoadingOptions(true)
      try {
        const params = new URLSearchParams({
          source: config.practiceSource,
          categories: config.selectedCategories.join(',')
        })

        const response = await fetch(`/api/practice/get-available-options?${params}`)
        if (response.ok) {
          const data = await response.json()
          setDynamicOptions(data)
          
          // Auto-select first available level if current level is not available
          if (data.availableLevels.length > 0 && !data.availableLevels.includes(config.level)) {
            setConfig(prev => ({ ...prev, level: data.availableLevels[0] }))
          }
          
          // Auto-select first available theme if none selected
          if (data.availableThemes.length > 0 && config.practiceSource === 'themes' && !config.selectedTheme) {
            const firstTheme = data.availableThemes[0]
            setConfig(prev => ({ 
              ...prev, 
              selectedTheme: firstTheme.name 
            }))
          }
        }
      } catch (error) {
        console.error('Failed to load dynamic options:', error)
      } finally {
        setIsLoadingOptions(false)
      }
    }

    loadDynamicOptions()
  }, [config.selectedCategories, config.practiceSource])

  // Filter themes/texts based on selected level
  const getFilteredThemes = () => {
    return dynamicOptions.availableThemes.filter(theme => 
      theme.levels.includes(config.level)
    )
  }

  // Step navigation
  const totalSteps = 7
  const canProceed = () => {
    switch (currentStep) {
      case 1: return config.selectedCategories.length > 0
      case 2: return config.practiceSource === 'themes' ? !!config.selectedTheme : (config.selectedSavedTexts?.length || 0) > 0
      case 3: return config.selectedCategories.every(cat => config.wordCounts[cat] > 0)
      case 4: return !!config.contentStyle
      case 5: return config.tenseFocus.length > 0
      case 6: return !!config.length
      case 7: return !!config.difficulty
      default: return false
    }
  }

  const nextStep = () => {
    if (canProceed() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = config.selectedCategories.includes(categoryId)
      ? config.selectedCategories.filter(id => id !== categoryId)
      : [...config.selectedCategories, categoryId]
    
    setConfig({
      ...config,
      selectedCategories: newCategories,
      // Reset word counts when categories change
      wordCounts: Object.fromEntries(
        newCategories.map(cat => [cat, config.wordCounts[cat] || 5])
      )
    })
  }

  const handleWordCountChange = (category: string, count: number) => {
    setConfig({
      ...config,
      wordCounts: {
        ...config.wordCounts,
        [category]: Math.max(1, Math.min(20, count))
      }
    })
  }

  const handleTenseToggle = (tenseId: string) => {
    const newTenses = config.tenseFocus.includes(tenseId)
      ? config.tenseFocus.filter(id => id !== tenseId)
      : [...config.tenseFocus, tenseId]
    
    setConfig({
      ...config,
      tenseFocus: newTenses.length > 0 ? newTenses : ['present'] // Always keep at least one tense
    })
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag size={20} />
                Step 1: Select Word Categories
              </CardTitle>
              <CardDescription>
                Choose which types of words you want to practice. You can select multiple categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORD_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      config.selectedCategories.includes(category.id)
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm opacity-75">{category.description}</p>
                      </div>
                      {config.selectedCategories.includes(category.id) && (
                        <CheckCircle2 size={20} className="ml-auto text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {config.selectedCategories.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">
                    Selected: {config.selectedCategories.map(id => 
                      WORD_CATEGORIES.find(cat => cat.id === id)?.name
                    ).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} />
                Step 2: Choose Level & Source
              </CardTitle>
              <CardDescription>
                Select your learning level and where to get the practice words from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Level Selection - Dynamic based on available data */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Learning Level</h3>
                  {isLoadingOptions && (
                    <div className="text-xs text-gray-500">Loading available levels...</div>
                  )}
                </div>
                
                {dynamicOptions.availableLevels.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-gray-500 text-sm">
                      Select word categories first to see available levels
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {dynamicOptions.availableLevels.map(level => (
                        <button
                          key={level}
                          onClick={() => setConfig({...config, level})}
                          className={cn(
                            "px-4 py-2 rounded-lg border-2 transition-all",
                            config.level === level
                              ? "border-blue-500 bg-blue-50 text-blue-900"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    
                    {/* Level Statistics */}
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Available words in {config.level}:</div>
                      {Object.entries(dynamicOptions.categoryStats).map(([category, stats]) => (
                        <div key={category} className="flex justify-between">
                          <span>{category}:</span>
                          <span>{stats.levelDistribution[config.level] || 0} words</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Source Selection */}
              <div>
                <h3 className="font-semibold mb-3">Practice Source</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setConfig({...config, practiceSource: 'themes'})}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all",
                      config.practiceSource === 'themes'
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Tag size={20} className="mb-2" />
                    <div className="font-semibold">Themes</div>
                    <div className="text-sm opacity-75">Practice by topic</div>
                    {dynamicOptions.availableThemes.length > 0 && config.practiceSource === 'themes' && (
                      <div className="text-xs mt-1 opacity-60">
                        {dynamicOptions.availableThemes.length} themes available
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setConfig({...config, practiceSource: 'saved-texts'})}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all",
                      config.practiceSource === 'saved-texts'
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <FileText size={20} className="mb-2" />
                    <div className="font-semibold">Saved Texts</div>
                    <div className="text-sm opacity-75">Practice from your texts</div>
                    {dynamicOptions.availableThemes.length > 0 && config.practiceSource === 'saved-texts' && (
                      <div className="text-xs mt-1 opacity-60">
                        {dynamicOptions.availableThemes.length} texts available
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Theme/Text Selection - Filtered by level */}
              {config.practiceSource === 'themes' ? (
                <div>
                  <h3 className="font-semibold mb-3">
                    Select Theme (Level {config.level})
                  </h3>
                  {isLoadingOptions ? (
                    <div className="p-4 border border-gray-300 rounded-lg text-center text-gray-500">
                      Loading themes...
                    </div>
                  ) : (
                    <div>
                      {getFilteredThemes().length === 0 ? (
                        <div className="p-4 border-2 border-dashed border-yellow-300 bg-yellow-50 rounded-lg text-center">
                          <p className="text-yellow-800 text-sm">
                            No themes available for level {config.level} with selected categories.
                            <br />Try selecting a different level or different categories.
                          </p>
                        </div>
                      ) : (
                        <select
                          value={config.selectedTheme || ''}
                          onChange={(e) => setConfig({...config, selectedTheme: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        >
                          <option value="">Choose a theme...</option>
                          {getFilteredThemes().map((theme) => (
                            <option key={theme.name} value={theme.name}>
                              {theme.name} ({theme.wordCount} words, levels: {theme.levels.join(', ')})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold mb-3">
                    Select Saved Texts (Level {config.level})
                  </h3>
                  {isLoadingOptions ? (
                    <div className="p-4 border border-gray-300 rounded-lg text-center text-gray-500">
                      Loading saved texts...
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                      {getFilteredThemes().length === 0 ? (
                        <div className="p-4 text-center text-yellow-600 bg-yellow-50">
                          <div>No saved texts available for level {config.level} with selected categories.</div>
                          <div className="text-xs mt-1">Try a different level or process more texts.</div>
                        </div>
                      ) : (
                        <>
                          <div className="p-2 text-xs text-gray-600 bg-gray-50 border-b">
                            Found {getFilteredThemes().length} texts with {config.level} level words
                          </div>
                          {getFilteredThemes().map((text) => (
                            <label key={text.id || text.name} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                              <input
                                type="checkbox"
                                checked={config.selectedSavedTexts?.includes(text.id || text.name) || false}
                                onChange={(e) => {
                                  const currentTexts = config.selectedSavedTexts || []
                                  const textId = text.id || text.name
                                  const newTexts = e.target.checked
                                    ? [...currentTexts, textId]
                                    : currentTexts.filter(id => id !== textId)
                                  setConfig({...config, selectedSavedTexts: newTexts})
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{text.name}</div>
                                <div className="text-xs text-gray-500">
                                  {text.wordCount} words • Levels: {text.levels.join(', ')}
                                  {text.description && ` • ${text.description}`}
                                </div>
                              </div>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} />
                Step 3: Words per Category
              </CardTitle>
              <CardDescription>
                Set how many words you want to practice for each selected category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.selectedCategories.map(categoryId => {
                  const category = WORD_CATEGORIES.find(cat => cat.id === categoryId)
                  return (
                    <div key={categoryId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{category?.icon}</span>
                        <div>
                          <div className="font-semibold">{category?.name}</div>
                          <div className="text-sm text-gray-500">{category?.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleWordCountChange(categoryId, (config.wordCounts[categoryId] || 5) - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {config.wordCounts[categoryId] || 5}
                        </span>
                        <button
                          onClick={() => handleWordCountChange(categoryId, (config.wordCounts[categoryId] || 5) + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Total words: {Object.values(config.wordCounts).reduce((sum, count) => sum + (count || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen size={20} />
                Step 4: Content Style
              </CardTitle>
              <CardDescription>
                Choose what type of content you want to generate for practice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CONTENT_STYLES.map((style) => {
                  const Icon = style.icon
                  return (
                    <div
                      key={style.id}
                      className={cn(
                        "p-4 border-2 rounded-lg cursor-pointer transition-all",
                        config.contentStyle === style.id
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                      onClick={() => setConfig({...config, contentStyle: style.id})}
                    >
                      <Icon size={24} className="mb-2" />
                      <h3 className="font-semibold mb-1">{style.name}</h3>
                      <p className="text-sm opacity-75">{style.description}</p>
                      {config.contentStyle === style.id && (
                        <CheckCircle2 size={16} className="mt-2 text-blue-600" />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Step 5: Tense Focus
              </CardTitle>
              <CardDescription>
                Select which tenses you want to focus on in your practice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {GERMAN_TENSES.map((tense) => (
                  <div
                    key={tense.id}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      config.tenseFocus.includes(tense.id)
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => handleTenseToggle(tense.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{tense.name}</h3>
                        <p className="text-sm opacity-75">{tense.description}</p>
                      </div>
                      {config.tenseFocus.includes(tense.id) && (
                        <CheckCircle2 size={20} className="text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {config.tenseFocus.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">
                    Selected tenses: {config.tenseFocus.map(id => 
                      GERMAN_TENSES.find(tense => tense.id === id)?.name
                    ).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 6:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlignCenter size={20} />
                Step 6: Content Length
              </CardTitle>
              <CardDescription>
                Choose how long you want the practice content to be.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CONTENT_LENGTHS.map((lengthOption) => {
                  const Icon = lengthOption.icon
                  const isSelected = config.length === lengthOption.wordCount
                  return (
                    <div
                      key={lengthOption.id}
                      className={cn(
                        "p-4 border-2 rounded-lg cursor-pointer transition-all text-center",
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                      onClick={() => setConfig({...config, length: lengthOption.wordCount})}
                    >
                      <Icon size={24} className="mx-auto mb-2" />
                      <h3 className="font-semibold mb-1">{lengthOption.label}</h3>
                      <p className="text-sm opacity-75 mb-2">{lengthOption.description}</p>
                      <div className="text-xs font-medium">{lengthOption.wordCount} words</div>
                      {isSelected && (
                        <CheckCircle2 size={16} className="mx-auto mt-2 text-blue-600" />
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Custom length option */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Custom Length</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    value={config.length}
                    onChange={(e) => {
                      const value = Math.min(Math.max(50, parseInt(e.target.value) || 50), 2000)
                      setConfig({...config, length: value})
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter word count"
                  />
                  <span className="text-sm text-gray-600">words</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Range: 50-2000 words. Longer content provides more context but takes more time to complete.
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 7:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={20} />
                Step 7: Overall Difficulty
              </CardTitle>
              <CardDescription>
                Set the overall complexity and difficulty of the generated content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DIFFICULTY_LEVELS.map((difficulty) => (
                  <div
                    key={difficulty.id}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      config.difficulty === difficulty.id
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => setConfig({...config, difficulty: difficulty.id as 'easy' | 'medium' | 'hard'})}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={difficulty.color}>{difficulty.name}</Badge>
                        <div>
                          <h3 className="font-semibold">{difficulty.name} Difficulty</h3>
                          <p className="text-sm opacity-75">{difficulty.description}</p>
                        </div>
                      </div>
                      {config.difficulty === difficulty.id && (
                        <CheckCircle2 size={20} className="text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Selected:</strong> {DIFFICULTY_LEVELS.find(d => d.id === config.difficulty)?.name} difficulty
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  This affects sentence structure, vocabulary complexity, and grammatical constructions beyond your target words.
                </div>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Practice Configuration</h2>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                i + 1 < currentStep
                  ? "bg-green-500 text-white"
                  : i + 1 === currentStep
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              {i + 1 < currentStep ? <CheckCircle2 size={16} /> : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Previous
        </Button>

        {currentStep === totalSteps ? (
          <Button
            onClick={() => onStartSession(config)}
            disabled={!canProceed() || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={16} />
                Start Practice
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2"
          >
            Next
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}