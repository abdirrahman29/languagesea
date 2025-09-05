// Updated practice-session.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import WordHighlighter from "./word-highlighter"
import QuizModal from "./quiz-modal"
import TranslationPanel from "./translation-panel"
import PracticeSettings from "./practice-settings"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Trophy, Target, Clock, BookOpen } from "lucide-react"
import { useSession } from "next-auth/react"

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

interface SessionData {
  id: string
  theme: string
  style: 'conversation' | 'article' | 'story'
  germanText: string
  englishText: string
  words: WordData[]
  targetWords: string[]
  userLevel: string
  progress: {
    wordsCompleted: number
    totalWords: number
    accuracy: number
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

interface Theme {
  id: string
  name: string
  words: Array<{
    id: string
    text: string
    type: string
    level: string
    translation: string
    gender?: string
  }>
}

interface SavedText {
  id: string
  title: string
  wordCount: number
  content: string
  level: string
  excerpt?: string
}

export default function PracticeSession() {
  // Session state
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [currentLength, setCurrentLength] = useState<number>(320)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [currentProgressStep, setCurrentProgressStep] = useState("")
  
  // Quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  
  // Settings state
  const [practiceSource, setPracticeSource] = useState<'themes' | 'saved-texts'>('themes')
  const [currentTheme, setCurrentTheme] = useState("")
  const [currentStyle, setCurrentStyle] = useState<'conversation' | 'article' | 'story'>('story')
  const [targetWordCount, setTargetWordCount] = useState(6)
  const [availableThemes, setAvailableThemes] = useState<Array<{ name: string; wordCount: number; id: string }>>([])
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([])
  const [selectedSavedTexts, setSelectedSavedTexts] = useState<string[]>([])
  const [isLoadingThemes, setIsLoadingThemes] = useState(true)
  const [isLoadingSavedTexts, setIsLoadingSavedTexts] = useState(false)

  const { data: session } = useSession()
  const [autoDetectedLevel, setAutoDetectedLevel] = useState("A1")
  const [levelSetting, setLevelSetting] = useState('auto')

  // Load available themes and saved texts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingThemes(true)
        
        // Load themes
        const themesResponse = await fetch('/api/themes')
        if (themesResponse.ok) {
          const themes: Theme[] = await themesResponse.json()
          const formattedThemes = themes.map(theme => ({
            id: theme.id,
            name: theme.name,
            wordCount: theme.words.length
          })).filter(theme => theme.wordCount >= 4)
          
          setAvailableThemes(formattedThemes)
          
          if (formattedThemes.length > 0 && !currentTheme) {
            setCurrentTheme(formattedThemes[0].name)
          }
        }

        // Load saved texts if user is authenticated
        if (session?.user?.id) {
          setIsLoadingSavedTexts(true)
          const savedTextsResponse = await fetch('/api/saved-texts?limit=100')
          if (savedTextsResponse.ok) {
            const data = await savedTextsResponse.json()
            const texts = data.savedTexts || []
            setSavedTexts(texts)
          }
          setIsLoadingSavedTexts(false)
        }
        
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load practice data')
      } finally {
        setIsLoadingThemes(false)
      }
    }
    
    loadData()
  }, [session?.user?.id, currentTheme])

  useEffect(() => {
    if (session?.user?.level) {
      setAutoDetectedLevel(session.user.level)
    }
  }, [session])

  const effectiveLevel = levelSetting === 'auto' ? autoDetectedLevel : levelSetting

  // Progress tracking function
  const updateProgress = useCallback((progress: number, step: string) => {
    setCurrentProgress(progress)
    setCurrentProgressStep(step)
  }, [])

  // Start new practice session
  const startSession = useCallback(async () => {
    if (practiceSource === 'themes' && !currentTheme) {
      toast.error('Please select a theme first')
      return
    }

    if (practiceSource === 'saved-texts' && selectedSavedTexts.length === 0) {
      toast.error('Please select at least one saved text')
      return
    }

    setIsLoading(true)
    updateProgress(0, "Initializing practice session...")

    try {
      updateProgress(10, "Preparing vocabulary...")

      // Create session based on source
      let sessionParams: any = {
        style: currentStyle,
        wordCount: targetWordCount,
        userLevel: effectiveLevel,
        difficulty: currentDifficulty,
        length: currentLength
      }

      if (practiceSource === 'themes') {
        sessionParams.theme = currentTheme
        sessionParams.source = 'theme'
      } else {
        sessionParams.savedTextIds = selectedSavedTexts
        sessionParams.source = 'saved-texts'
      }

      updateProgress(25, "Creating practice session...")
      
      const sessionResponse = await fetch('/api/practice/get-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionParams)
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      updateProgress(50, "Generating practice content...")
      
      const sessionResult = await sessionResponse.json()
      const session = sessionResult.session

      if (!session.targetWords || session.targetWords.length === 0) {
        throw new Error('No target words available for practice.')
      }

      updateProgress(75, "Processing content with AI...")

      // Generate content
      const contentResponse = await fetch('/api/practice/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          targetWords: session.targetWords,
          theme: practiceSource === 'themes' ? currentTheme : 'Mixed Content',
          style: currentStyle,
          userLevel: effectiveLevel,
          difficulty: currentDifficulty,
          length: currentLength,
          practiceSource,
          selectedTexts: practiceSource === 'saved-texts' ? selectedSavedTexts : undefined
        })
      })

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      updateProgress(90, "Finalizing session...")
      
      const contentResult = await contentResponse.json()
      const content = contentResult.data

      // Create session data for UI
      const newSessionData: SessionData = {
        id: session.id,
        theme: practiceSource === 'themes' ? currentTheme : 'Saved Texts',
        style: currentStyle,
        germanText: content.content.german,
        englishText: content.content.english,
        words: content.content.words || [],
        targetWords: session.targetWords.map((w: any) => w.baseForm),
        userLevel: effectiveLevel,
        progress: {
          wordsCompleted: 0,
          totalWords: session.targetWords.length,
          accuracy: 0
        }
      }

      setSessionData(newSessionData)
      updateProgress(100, "Practice session ready!")
      toast.success('Practice session started!')

    } catch (error: any) {
      console.error('Failed to start session:', error)
      toast.error(error.message || 'Failed to start practice session')
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setCurrentProgress(0)
        setCurrentProgressStep("")
      }, 2000)
    }
  }, [practiceSource, currentTheme, selectedSavedTexts, currentStyle, targetWordCount, effectiveLevel, currentDifficulty, currentLength])

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

  // Handle quiz answer
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

      // Update session data
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

      const completedWords = updatedWords.filter(w => 
        w.isTarget && w.familiarity !== 'unknown'
      ).length

      const updatedProgress = {
        wordsCompleted: completedWords,
        totalWords: sessionData.progress.totalWords,
        accuracy: isCorrect 
          ? ((sessionData.progress.accuracy * sessionData.progress.wordsCompleted) + 100) / (sessionData.progress.wordsCompleted + 1)
          : ((sessionData.progress.accuracy * sessionData.progress.wordsCompleted) + 0) / (sessionData.progress.wordsCompleted + 1)
      }

      setSessionData({
        ...sessionData,
        words: updatedWords,
        progress: updatedProgress
      })

      toast.success(isCorrect ? 'Correct! 🎉' : 'Try again next time')

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
      unknown: { color: 'bg-red-100 text-red-800', label: 'New' },
      learning: { color: 'bg-orange-100 text-orange-800', label: 'Learning' },
      familiar: { color: 'bg-yellow-100 text-yellow-800', label: 'Familiar' },
      mastered: { color: 'bg-green-100 text-green-800', label: 'Mastered' }
    }
    
    const config = configs[familiarity]
    return <Badge className={config.color}>{config.label}</Badge>
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Generating Practice Session
                  </h3>
                  <span className="text-sm text-gray-600">{currentProgress}%</span>
                </div>
                <Progress value={currentProgress} className="h-2" />
                <p className="text-sm text-gray-600">{currentProgressStep}</p>
              </div>
            </div>
          )}

          {/* Session Header */}
          {sessionData && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {sessionData.theme}
                  </h2>
                  <p className="text-gray-600 capitalize">
                    {sessionData.style} • Level {sessionData.userLevel}
                  </p>
                </div>
                {getFamiliarityBadge(sessionData.words.find(w => w.isTarget)?.familiarity || 'unknown')}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-900 font-medium">
                    {sessionData.progress.wordsCompleted}/{sessionData.progress.totalWords} words
                  </span>
                </div>
                <Progress 
                  value={(sessionData.progress.wordsCompleted / sessionData.progress.totalWords) * 100}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Accuracy: {Math.round(sessionData.progress.accuracy)}%</span>
                  <span>{Math.round((sessionData.progress.wordsCompleted / sessionData.progress.totalWords) * 100)}% complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Practice Text */}
          {sessionData ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Practice Text
                </h3>
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-blue-600" />
                  <span className="text-sm text-gray-600">
                    {sessionData.words.filter(w => w.isTarget).length} target words
                  </span>
                </div>
              </div>
              
              <WordHighlighter
                text={sessionData.germanText}
                words={sessionData.words}
                onWordClick={handleWordClick}
                fontSize="lg"
              />

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {sessionData.words.filter(w => w.isTarget).map((word, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getFamiliarityColor(word.familiarity)}`}>
                        {word.baseForm}
                      </span>
                      {getFamiliarityBadge(word.familiarity)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Practice?
              </h3>
              <p className="text-gray-600 mb-4">
                Configure your session settings and start practicing German vocabulary
              </p>
            </div>
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
          {/* Practice Settings */}
          <PracticeSettings
            currentTheme={currentTheme}
            currentStyle={currentStyle}
            autoDetectedLevel={autoDetectedLevel}
            currentLevelSetting={levelSetting}
            onLevelSettingChange={setLevelSetting}
            targetWordCount={targetWordCount}
            themes={availableThemes}
            savedTexts={savedTexts}
            practiceSource={practiceSource}
            selectedSavedTexts={selectedSavedTexts}
            onThemeChange={setCurrentTheme}
            onStyleChange={setCurrentStyle}
            onTargetWordCountChange={setTargetWordCount}
            onStartSession={startSession}
            currentLength={currentLength}
            onLengthChange={setCurrentLength}
            isGenerating={isLoading}
            onPracticeSourceChange={setPracticeSource}
            onSelectedSavedTextsChange={setSelectedSavedTexts}
          />

          {/* Session Stats */}
          {sessionData && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Session Stats
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-600" />
                    <span className="text-sm text-gray-600">Accuracy</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {Math.round(sessionData.progress.accuracy)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-600">Words Learned</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {sessionData.progress.wordsCompleted}/{sessionData.progress.totalWords}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    {['🔴 New', '🟠 Learning', '🟡 Familiar', '🟢 Mastered'].map((label, idx) => (
                      <div key={idx} className="text-center p-1">
                        <div className="font-medium">
                          {sessionData.words.filter(w => w.isTarget && 
                            w.familiarity === ['unknown', 'learning', 'familiar', 'mastered'][idx]
                          ).length}
                        </div>
                        <div className="text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
          onAnswer={(optionId, responseTime) => {
            handleQuizAnswer(optionId, responseTime)
            setShowQuiz(false)
          }}
        />
      )}
    </div>
  )
}