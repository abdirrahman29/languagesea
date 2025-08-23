// Main practice component
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

export default function PracticeSession() {
  // Session state
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [currentLength, setCurrentLength] = useState<number>(320); 
  // Quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  
  // Settings state
  const [currentTheme, setCurrentTheme] = useState("")
  const [currentStyle, setCurrentStyle] = useState<'conversation' | 'article' | 'story'>('story')
  const [targetWordCount, setTargetWordCount] = useState(6)
  const [availableThemes, setAvailableThemes] = useState<Array<{ name: string; wordCount: number; id: string }>>([])
  const [isLoadingThemes, setIsLoadingThemes] = useState(true)

  // Load available themes on mount
  useEffect(() => {
    const loadThemes = async () => {
      try {
        setIsLoadingThemes(true)
        const response = await fetch('/api/themes')
        if (response.ok) {
          const themes: Theme[] = await response.json()
          const formattedThemes = themes.map(theme => ({
            id: theme.id,
            name: theme.name,
            wordCount: theme.words.length
          })).filter(theme => theme.wordCount >= 4) // Only include themes with enough words
          
          setAvailableThemes(formattedThemes)
          
          // Set default theme to the first available one
          if (formattedThemes.length > 0 && !currentTheme) {
            setCurrentTheme(formattedThemes[0].name)
          }
        } else {
          console.error('Failed to fetch themes:', response.statusText)
          toast.error('Failed to load themes')
        }
      } catch (error) {
        console.error('Failed to load themes:', error)
        toast.error('Failed to load themes')
      } finally {
        setIsLoadingThemes(false)
      }
    }
    loadThemes()
  }, [currentTheme])
  const { data: session } = useSession(); // Get user session data

  // The user's level from the database, e.g., "A2"
  const [autoDetectedLevel, setAutoDetectedLevel] = useState("A1"); 
  
  // The user's selection in the settings dropdown ('auto', 'A1', 'B1', etc.)
  const [levelSetting, setLevelSetting] = useState('auto'); 

  // Update the auto-detected level when the session loads
  useEffect(() => {
    if (session?.user?.level) { // Assuming 'level' is part of your session user type
      setAutoDetectedLevel(session.user.level);
    }
  }, [session]);
  const effectiveLevel = levelSetting === 'auto' ? autoDetectedLevel : levelSetting;

  // Start new practice session
  const startSession = useCallback(async () => {
    if (!currentTheme) {
      toast.error('Please select a theme first')
      return
    }

    const selectedTheme = availableThemes.find(t => t.name === currentTheme)
    if (!selectedTheme) {
      toast.error('Selected theme not found')
      return
    }

    // Ensure target word count doesn't exceed available words
    const actualWordCount = Math.min(targetWordCount, selectedTheme.wordCount)
    if (actualWordCount < targetWordCount) {
      toast.info(`Using ${actualWordCount} words (maximum available for this theme)`)
    }


    setIsLoading(true)
    try {
      console.log('Starting session with theme:', currentTheme)
      
      const sessionResponse = await fetch('/api/practice/get-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: currentTheme,
          style: currentStyle,
          wordCount: targetWordCount,
          userLevel: effectiveLevel // ✅ PASS THE LEVEL HERE

        })
      })
  
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json()
        throw new Error(errorData.error || 'Failed to create session')
      }
      
      const sessionResult = await sessionResponse.json()
      console.log('Session API response:', sessionResult)
      
      const session = sessionResult.session
      console.log('Session data:', session)
      console.log('Target words:', session?.targetWords)

      if (!session.targetWords || session.targetWords.length === 0) {
        throw new Error('No target words available for this theme. Please try a different theme.')
      }
      const sessionDataFromApi = sessionResult.session;

      if (!sessionDataFromApi.targetWords || sessionDataFromApi.targetWords.length === 0) {
        throw new Error('No target words available. Please try a different theme.');
      }
      // Generate content
      const contentResponse = await fetch('/api/practice/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          targetWords: session.targetWords,
          theme: currentTheme,
          style: currentStyle,
          userLevel: effectiveLevel,
          difficulty: currentDifficulty, // ✅ PASS DYNAMIC DIFFICULTY
          length: currentLength, 
        
        })
      })
  
      if (!contentResponse.ok) {
        const errorData = await contentResponse.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }
      
      const contentResult = await contentResponse.json()
      const content = contentResult.data

      // Create session data for UI
      const newSessionData: SessionData = {
        id: session.id,
        theme: currentTheme,
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
      toast.success('Practice session started!')

    } catch (error: any) {
      console.error('Failed to start session:', error)
      toast.error(error.message || 'Failed to start practice session')
    } finally {
      setIsLoading(false)
    }
  }, [currentTheme, currentStyle, targetWordCount])

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


  // Determine the effective level to send to the API

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
            <p className="text-gray-600">Loading themes...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show message if no themes are available
  if (availableThemes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <BookOpen size={48} className="mx-auto text-yellow-600 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            No Themes Available
          </h3>
          <p className="text-yellow-700">
            Please add some themes and vocabulary words to the database before starting practice sessions.
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
            onThemeChange={setCurrentTheme}
            onStyleChange={setCurrentStyle}
            onTargetWordCountChange={setTargetWordCount}
            onStartSession={startSession}
            currentLength={currentLength}

            isGenerating={isLoading}
            onLengthChange={setCurrentLength}

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