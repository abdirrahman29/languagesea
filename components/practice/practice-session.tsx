"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import WordHighlighter from "./word-highlighter"
import QuizModal from "./quiz-modal"
import TranslationPanel from "./translation-panel"
import EnhancedPracticeSettings, { PracticeConfiguration } from "./practice-settings"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Trophy, Target, Clock, BookOpen, Users, Zap, CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"
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

interface EnhancedSessionData {
  id: string
  theme: string
  style: string
  germanText: string
  englishText: string
  words: WordData[]
  targetWords: string[]
  userLevel: string
  config: PracticeConfiguration
  progress: {
    wordsCompleted: number
    totalWords: number
    accuracy: number
    categoryProgress: Record<string, { completed: number; total: number }>
  }
  metadata: {
    qualityMetrics: {
      wordsUsed: number
      totalTargetWords: number
      categoryDistribution: Record<string, number>
      sentenceCount: number
      estimatedReadingTime: number
    }
    contentLevelAssessment: {
      requestedLevel: string
      actualLevel: string
      levelMismatch: boolean
      levelDifference: number
      confidence: number
      vocabularyBreakdown: {
        levelDistribution: Record<string, number>
        levelPercentages: Record<string, number>
        dominantLevel: string
      }
      textComplexity: {
        averageSentenceLength: number
        averageWordLength: number
        complexSentenceCount: number
        totalWords: number
        totalSentences: number
      }
      recommendations: Array<{
        type: string
        message: string
        severity: 'low' | 'medium' | 'high'
      }>
    }
    generationMethod: string
  }
}

interface QuizData {
  word: {
    german: string
    baseForm: string
    type: string
    context?: string
  }
  options: Array<{
    id: string
    text: string
    isCorrect: boolean
  }>
}

interface SavedText {
  id: string
  title: string
  wordCount: number
  level?: string
}

export default function UpdatedPracticeSession() {
  // Session state
  const [sessionData, setSessionData] = useState<EnhancedSessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [currentProgressStep, setCurrentProgressStep] = useState("")
  
  // Quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  
  // Settings state
  const [availableThemes, setAvailableThemes] = useState<Array<{ name: string; wordCount: number }>>([])
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([])
  const [isLoadingThemes, setIsLoadingThemes] = useState(true)

  const { data: session } = useSession()

  // Load available themes and saved texts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingThemes(true)
        
        // Load themes
        const themesResponse = await fetch('/api/themes')
        if (themesResponse.ok) {
          const themes = await themesResponse.json()
          const formattedThemes = themes.map((theme: any) => ({
            name: theme.name,
            wordCount: theme.words?.length || theme.wordCount || 0
          })).filter((theme: any) => theme.wordCount >= 4)
          
          setAvailableThemes(formattedThemes)
        }

        // Load saved texts if user is authenticated
        if (session?.user?.id) {
          const savedTextsResponse = await fetch('/api/saved-texts?limit=100')
          if (savedTextsResponse.ok) {
            const data = await savedTextsResponse.json()
            const texts = data.savedTexts || []
            setSavedTexts(texts)
          }
        }
        
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load practice data')
      } finally {
        setIsLoadingThemes(false)
      }
    }
    
    loadData()
  }, [session?.user?.id])

  // Progress tracking function
  const updateProgress = useCallback((progress: number, step: string) => {
    setCurrentProgress(progress)
    setCurrentProgressStep(step)
  }, [])

  // Enhanced session start with new configuration
  const startEnhancedSession = useCallback(async (config: PracticeConfiguration) => {
    setIsLoading(true)
    updateProgress(0, "Initializing enhanced practice session...")

    try {
      updateProgress(10, "Validating configuration...")

      // Validate configuration
      if (config.selectedCategories.length === 0) {
        throw new Error('Please select at least one word category')
      }

      const totalWords = Object.values(config.wordCounts).reduce((sum, count) => sum + count, 0)
      if (totalWords === 0) {
        throw new Error('Please specify word counts for each category')
      }

      updateProgress(25, "Selecting target words by category...")

      // Create enhanced session request
      const sessionParams = {
        config,
        userLevel: config.level,
        userId: session?.user?.id
      }

      updateProgress(40, "Generating practice content with AI...")
      
      // Generate content using the enhanced API
      const contentResponse = await fetch('/api/practice/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          config
        })
      })

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json()
        throw new Error(errorData.error || 'Failed to generate enhanced content')
      }

      updateProgress(75, "Processing generated content...")
      
      const contentResult = await contentResponse.json()
      const content = contentResult.data

      updateProgress(90, "Finalizing enhanced session...")

      // Create enhanced session data
      const newSessionData: EnhancedSessionData = {
        id: content.sessionId,
        theme: config.practiceSource === 'themes' ? (config.selectedTheme || 'Theme Practice') : 'Saved Texts Practice',
        style: config.contentStyle,
        germanText: content.content.german || content.content[content.metadata.languageSettings.languageCode],
        englishText: content.content.english || content.content[content.metadata.languageSettings.translationCode],
        words: content.content.words || [],
        targetWords: content.content.words?.filter((w: any) => w.isTarget).map((w: any) => w.baseForm) || [],
        userLevel: config.level,
        config,
        progress: {
          wordsCompleted: 0,
          totalWords: totalWords,
          accuracy: 0,
          categoryProgress: Object.fromEntries(
            config.selectedCategories.map(category => [
              category,
              { completed: 0, total: config.wordCounts[category] || 0 }
            ])
          )
        },
        metadata: content.metadata
      }

      setSessionData(newSessionData)
      updateProgress(100, "Enhanced practice session ready!")
      
      toast.success(`🚀 Enhanced session started! Generated content using ${content.metadata.generationMethod}`, {
        description: `${content.metadata.wordsUsed || 0}/${content.metadata.totalTargetWords || 0} target words included`
      })

    } catch (error: any) {
      console.error('Failed to start enhanced session:', error)
      toast.error(error.message || 'Failed to start enhanced practice session')
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setCurrentProgress(0)
        setCurrentProgressStep("")
      }, 2000)
    }
  }, [session?.user?.id])

  // Handle word click (start quiz)
  const handleWordClick = useCallback(async (baseForm: string, type: string) => {
    if (!sessionData) return

    try {
      const response = await fetch('/api/practice/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseForm,
          type,
          context: sessionData.germanText
        })
      })

      if (!response.ok) throw new Error('Failed to generate quiz')
      const quiz = await response.json()

      setQuizData(quiz)
      setShowQuiz(true)
    } catch (error) {
      console.error('Failed to generate quiz:', error)
      toast.error('Failed to create quiz')
    }
  }, [sessionData])

  // Handle quiz answer with category tracking
  const handleQuizAnswer = useCallback(async (
    selectedOptionId: string, 
    responseTime: number,
    difficultyRating?: 'easy' | 'hard'
  ) => {
    if (!quizData || !sessionData) return

    const isCorrect = quizData.options.find(opt => opt.id === selectedOptionId)?.isCorrect || false

    try {
      // Submit quiz result
      await fetch('/api/practice/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData.id,
          baseForm: quizData.word.baseForm,
          type: quizData.word.type,
          isCorrect,
          responseTime,
          difficultyRating
        })
      })

      // Update session data with category tracking
      const updatedWords = sessionData.words.map(word => {
        if (word.baseForm === quizData.word.baseForm) {
          return {
            ...word,
            familiarity: isCorrect 
              ? (word.familiarity === 'unknown' ? 'learning' : 
                 word.familiarity === 'learning' ? 'familiar' : 
                 word.familiarity === 'familiar' ? 'mastered' : word.familiarity)
              : word.familiarity
          }
        }
        return word
      })

      // Update category progress
      const updatedCategoryProgress = { ...sessionData.progress.categoryProgress }
      const wordCategory = quizData.word.type
      if (isCorrect && updatedCategoryProgress[wordCategory]) {
        updatedCategoryProgress[wordCategory] = {
          ...updatedCategoryProgress[wordCategory],
          completed: Math.min(
            updatedCategoryProgress[wordCategory].completed + 1,
            updatedCategoryProgress[wordCategory].total
          )
        }
      }

      const totalCompleted = Object.values(updatedCategoryProgress).reduce((sum, cat) => sum + cat.completed, 0)
      const overallAccuracy = isCorrect 
        ? ((sessionData.progress.accuracy * sessionData.progress.wordsCompleted) + 100) / (sessionData.progress.wordsCompleted + 1)
        : ((sessionData.progress.accuracy * sessionData.progress.wordsCompleted) + 0) / (sessionData.progress.wordsCompleted + 1)

      const updatedProgress = {
        wordsCompleted: totalCompleted,
        totalWords: sessionData.progress.totalWords,
        accuracy: overallAccuracy,
        categoryProgress: updatedCategoryProgress
      }

      setSessionData({
        ...sessionData,
        words: updatedWords,
        progress: updatedProgress
      })

      toast.success(isCorrect ? `✅ Correct! ${wordCategory} mastered` : '❌ Try again next time', {
        description: isCorrect ? `${totalCompleted}/${sessionData.progress.totalWords} words completed` : undefined
      })

    } catch (error) {
      console.error('Failed to submit quiz:', error)
      toast.error('Failed to save progress')
    }
  }, [quizData, sessionData])

  const getFamiliarityColor = (familiarity: WordData['familiarity']) => {
    switch (familiarity) {
      case 'unknown': return 'text-red-600'
      case 'learning': return 'text-orange-600'
      case 'familiar': return 'text-yellow-600'
      case 'mastered': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getFamiliarityBadge = (familiarity: WordData['familiarity']) => {
    const configs = {
      unknown: { color: 'bg-red-100 text-red-800', label: 'New', icon: '🔴' },
      learning: { color: 'bg-orange-100 text-orange-800', label: 'Learning', icon: '🟡' },
      familiar: { color: 'bg-yellow-100 text-yellow-800', label: 'Familiar', icon: '🟠' },
      mastered: { color: 'bg-green-100 text-green-800', label: 'Mastered', icon: '🟢' }
    }
    
    const config = configs[familiarity]
    return <Badge className={config.color}>{config.icon} {config.label}</Badge>
  }

  // Show loading state while themes are being fetched
  if (isLoadingThemes) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading practice data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show message if no practice sources are available
  if (availableThemes.length === 0 && savedTexts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <BookOpen size={48} className="mx-auto text-yellow-600 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            No Practice Sources Available
          </h3>
          <p className="text-yellow-700">
            Please add some themes and vocabulary words, or process some texts before starting practice sessions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loading Progress */}
          {isLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap size={20} />
                  Generating Enhanced Practice Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{currentProgressStep}</span>
                  <span className="text-sm font-medium">{currentProgress}%</span>
                </div>
                <Progress value={currentProgress} className="h-3" />
              </CardContent>
            </Card>
          )}

          {/* Enhanced Session Header */}
          {sessionData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{sessionData.theme}</h2>
                      <p className="text-gray-600 capitalize flex items-center gap-2">
                        <span>{sessionData.style.replace('-', ' ')}</span>
                        <span>•</span>
                        <span>Level {sessionData.userLevel}</span>
                        {sessionData.metadata.generationMethod === 'gemini-flash-2.5' && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              🚀 Gemini Flash 2.5
                            </Badge>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Reading Time</div>
                    <div className="font-semibold">{sessionData.metadata.estimatedReadingTime} min</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Content Level Assessment */}
                {sessionData.metadata.contentLevelAssessment && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        📊 Content Level Assessment
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Requested:</span>
                        <Badge variant="outline">{sessionData.metadata.contentLevelAssessment.requestedLevel}</Badge>
                        <span className="text-sm text-gray-600">→ Actual:</span>
                        <Badge 
                          className={cn(
                            sessionData.metadata.contentLevelAssessment.levelMismatch
                              ? sessionData.metadata.contentLevelAssessment.levelDifference > 0
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          )}
                        >
                          {sessionData.metadata.contentLevelAssessment.actualLevel}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {sessionData.metadata.contentLevelAssessment.confidence}%
                        </div>
                        <div className="text-xs text-gray-600">Confidence</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {sessionData.metadata.contentLevelAssessment.textComplexity.averageSentenceLength}
                        </div>
                        <div className="text-xs text-gray-600">Avg Sentence Length</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {Math.round((sessionData.metadata.contentLevelAssessment.textComplexity.complexSentenceCount / sessionData.metadata.contentLevelAssessment.textComplexity.totalSentences) * 100)}%
                        </div>
                        <div className="text-xs text-gray-600">Complex Sentences</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {sessionData.metadata.contentLevelAssessment.vocabularyBreakdown.dominantLevel}
                        </div>
                        <div className="text-xs text-gray-600">Dominant Level</div>
                      </div>
                    </div>

                    {/* Level Distribution */}
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-2">Vocabulary Level Distribution:</div>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        {Object.entries(sessionData.metadata.contentLevelAssessment.vocabularyBreakdown.levelPercentages)
                          .sort(([a], [b]) => {
                            const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
                            return order.indexOf(a) - order.indexOf(b)
                          })
                          .map(([level, percentage]) => (
                            <div key={level} className="flex items-center gap-1 mb-1">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ 
                                  backgroundColor: 
                                    level === 'A1' ? '#ef4444' : 
                                    level === 'A2' ? '#f97316' : 
                                    level === 'B1' ? '#eab308' : 
                                    level === 'B2' ? '#22c55e' : 
                                    level === 'C1' ? '#3b82f6' : '#8b5cf6'
                                }}
                              />
                              <span>{level}: {percentage}%</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {sessionData.metadata.contentLevelAssessment.recommendations.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Recommendations:</div>
                        <div className="space-y-2">
                          {sessionData.metadata.contentLevelAssessment.recommendations.map((rec, index) => (
                            <div 
                              key={index}
                              className={cn(
                                "p-2 rounded text-xs",
                                rec.severity === 'high' ? "bg-red-50 text-red-700 border border-red-200" :
                                rec.severity === 'medium' ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
                                "bg-blue-50 text-blue-700 border border-blue-200"
                              )}
                            >
                              <span className="font-medium capitalize">{rec.type.replace(/_/g, ' ')}:</span> {rec.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Category Progress */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Progress by Category</h3>
                    <span className="text-sm text-gray-600">
                      {sessionData.progress.wordsCompleted}/{sessionData.progress.totalWords} total
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(sessionData.progress.categoryProgress).map(([category, progress]) => (
                      <div key={category} className="text-center">
                        <div className="font-semibold text-sm">{category}</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {progress.completed}/{progress.total}
                        </div>
                        <Progress 
                          value={(progress.completed / progress.total) * 100} 
                          className="h-2 mt-1"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className="text-gray-900 font-medium">
                        {Math.round((sessionData.progress.wordsCompleted / sessionData.progress.totalWords) * 100)}% complete
                      </span>
                    </div>
                    <Progress 
                      value={(sessionData.progress.wordsCompleted / sessionData.progress.totalWords) * 100}
                      className="h-3"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Accuracy: {Math.round(sessionData.progress.accuracy)}%</span>
                      <span>
                      Words: {sessionData.metadata.qualityMetrics?.wordsUsed || 0}/{sessionData.metadata.qualityMetrics?.totalTargetWords || 0} included                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Practice Text */}
          {sessionData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={20} />
                    Practice Content
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Target size={16} />
                      {sessionData.words.filter(w => w.isTarget).length} target words
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      {sessionData.metadata.qualityMetrics?.sentenceCount} sentences
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WordHighlighter
                  text={sessionData.germanText}
                  words={sessionData.words}
                  onWordClick={handleWordClick}
                  fontSize="lg"
                />

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="font-semibold mb-3">Target Words by Category</h4>
                  <div className="space-y-3">
                    {sessionData.config.selectedCategories.map(category => (
                      <div key={category} className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-semibold">
                          {category} ({sessionData.words.filter(w => w.isTarget && w.type === category).length})
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {sessionData.words
                            .filter(w => w.isTarget && w.type === category)
                            .slice(0, 10) // Show first 10
                            .map((word, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <span className={`text-sm font-medium ${getFamiliarityColor(word.familiarity)}`}>
                                  {word.baseForm}
                                </span>
                                <span className="text-xs">{getFamiliarityBadge(word.familiarity)}</span>
                              </div>
                            ))}
                          {sessionData.words.filter(w => w.isTarget && w.type === category).length > 10 && (
                            <span className="text-sm text-gray-500">
                              +{sessionData.words.filter(w => w.isTarget && w.type === category).length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready for Enhanced Practice?
                </h3>
                <p className="text-gray-600 mb-4">
                  Configure your session with specific word categories, tenses, and content styles for optimal learning
                </p>
              </CardContent>
            </Card>
          )}

          {/* Translation Panel */}
          {sessionData && (
            <TranslationPanel
              germanText={sessionData.germanText}
              englishText={sessionData.englishText}
              isVisible={showTranslation}
              onToggle={() => setShowTranslation(!showTranslation)}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enhanced Practice Settings */}
          <EnhancedPracticeSettings
            themes={availableThemes}
            savedTexts={savedTexts}
            onStartSession={startEnhancedSession}
            isGenerating={isLoading}
          />

          {/* Enhanced Session Stats */}
          {sessionData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={20} />
                  Enhanced Session Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(sessionData.progress.accuracy)}%
                    </div>
                    <div className="text-xs text-gray-600">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {sessionData.progress.wordsCompleted}
                    </div>
                    <div className="text-xs text-gray-600">Words Learned</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Content Quality</span>
                    <span>{sessionData.metadata.qualityMetrics?.wordsUsed}/{sessionData.metadata.qualityMetrics?.totalTargetWords} words</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tense Focus</span>
                    <span>{sessionData.config.tenseFocus.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>AI Engine</span>
                    <Badge variant="outline" className="text-xs">
                      {sessionData.metadata.generationMethod.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-600 mb-2">Progress by Familiarity</div>
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    {['🔴 New', '🟡 Learning', '🟠 Familiar', '🟢 Mastered'].map((label, idx) => {
                      const familiarity = ['unknown', 'learning', 'familiar', 'mastered'][idx]
                      const count = sessionData.words.filter(w => w.isTarget && w.familiarity === familiarity).length
                      return (
                        <div key={idx} className="text-center p-1">
                          <div className="font-medium">{count}</div>
                          <div className="text-gray-500">{label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {quizData && (
        <QuizModal
          isOpen={showQuiz}
          onClose={() => setShowQuiz(false)}
          word={quizData.word}
          options={quizData.options}
          onAnswer={(optionId, responseTime, difficultyRating) => {
            handleQuizAnswer(optionId, responseTime, difficultyRating)
            setShowQuiz(false)
          }}
        />
      )}
    </div>
  )
}