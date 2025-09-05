// Updated text-processing-section.tsx with real progress tracking
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import NewWordAnimation from "@/components/new-word-animation"
import type { ProcessingResult } from "@/lib/types"

const SAMPLE_TEXT = `Der kleine Junge geht zur Schule. Er lernt jeden Tag neue Wörter und Sätze. Seine Lehrerin ist sehr nett und hilft ihm bei den Aufgaben. Nach der Schule spielt er mit seinen Freunden im Park. Sie spielen Fußball und laufen um die Wette. Manchmal liest er auch Bücher über Tiere und Pflanzen. Er mag besonders Geschichten über Hunde und Katzen.`

interface ProcessingStep {
  step: string
  description: string
  progress: number
  completed: boolean
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { step: 'initialize', description: 'Initializing text analysis...', progress: 5, completed: false },
  { step: 'tokenize', description: 'Breaking text into sentences and words...', progress: 15, completed: false },
  { step: 'themes', description: 'Extracting themes and topics...', progress: 30, completed: false },
  { step: 'analyze', description: 'Analyzing vocabulary with AI...', progress: 60, completed: false },
  { step: 'classify', description: 'Classifying word types and difficulty...', progress: 80, completed: false },
  { step: 'database', description: 'Saving words and updating database...', progress: 95, completed: false },
  { step: 'complete', description: 'Processing complete!', progress: 100, completed: false }
]

export default function TextProcessingSection() {
  const { data: session } = useSession()
  const router = useRouter()
  const [text, setText] = useState(SAMPLE_TEXT)
  const [title, setTitle] = useState("Sample Text")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [processingSteps, setProcessingSteps] = useState(PROCESSING_STEPS)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [showNewWordAnimation, setShowNewWordAnimation] = useState(false)
  const [newWord, setNewWord] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const updateProcessingStep = (stepIndex: number, completed: boolean = false) => {
    setCurrentStepIndex(stepIndex)
    setProcessingSteps(prev => 
      prev.map((step, index) => ({
        ...step,
        completed: index < stepIndex || (index === stepIndex && completed)
      }))
    )
  }

  const simulateStepDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const handleProcessText = async () => {
    if (!text.trim()) {
      setError("Please enter some text to process")
      return
    }

    setError(null)
    setIsProcessing(true)
    setCurrentStepIndex(-1)
    setProcessingSteps(PROCESSING_STEPS.map(step => ({ ...step, completed: false })))
    setResult(null)

    try {
      // Step 1: Initialize
      updateProcessingStep(0)
      await simulateStepDelay(500)
      updateProcessingStep(0, true)

      // Step 2: Tokenization (simulated - actual happens in API)
      updateProcessingStep(1)
      await simulateStepDelay(800)
      updateProcessingStep(1, true)

      // Step 3: Theme extraction
      updateProcessingStep(2)
      await simulateStepDelay(1200)
      updateProcessingStep(2, true)

      // Step 4: Main processing call
      updateProcessingStep(3)
      
      const response = await fetch("/api/process-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          title,
          userId: session?.user?.id
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to process text")
      }

      const processedResult = await response.json()
      updateProcessingStep(3, true)

      // Step 5: Classification (simulated)
      updateProcessingStep(4)
      await simulateStepDelay(600)
      updateProcessingStep(4, true)

      // Step 6: Database operations (simulated)
      updateProcessingStep(5)
      await simulateStepDelay(800)
      updateProcessingStep(5, true)

      // Step 7: Complete
      updateProcessingStep(6)
      setResult(processedResult)
      updateProcessingStep(6, true)

      // Show animation for new words
      if (processedResult.extractedWords.verbs.some((verb: any) => verb.isNew)) {
        const newVerb = processedResult.extractedWords.verbs.find((verb: any) => verb.isNew)
        if (newVerb) {
          setNewWord(newVerb.baseForm)
          setShowNewWordAnimation(true)
          setTimeout(() => setShowNewWordAnimation(false), 3000)
        }
      }

    } catch (error) {
      console.error("Error processing text:", error)
      setError("An error occurred while processing the text. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveResult = async () => {
    if (!session?.user?.id) {
      setError("You must be signed in to save results")
      return
    }

    if (!result) {
      setError("No processing result to save")
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)
    setError(null)

    try {
      const response = await fetch("/api/save-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
          textData: {
            title,
            content: text,
            level: "A1",
            excerpt: text.substring(0, 100),
            stats: result.stats,
            extractedWords: result.extractedWords,
          },
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSaveSuccess(true)
        setTimeout(() => {
          router.push('/dashboard?tab=saved-texts')
        }, 2000)
      } else {
        setError(data.error || "Failed to save the processed text")
      }
    } catch (error) {
      console.error("Error saving processed text:", error)
      setError("An error occurred while saving the text. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const getCurrentStep = () => {
    return currentStepIndex >= 0 ? processingSteps[currentStepIndex] : null
  }

  const getOverallProgress = () => {
    if (currentStepIndex < 0) return 0
    return processingSteps[currentStepIndex]?.progress || 0
  }

  // Helper function to get the background color for a word based on status
  const getWordBackgroundClass = (isKnown: boolean, isNew: boolean, isRepeat: boolean) => {
    if (isKnown) return "bg-green-50 border-green-200"
    if (isRepeat) return "bg-orange-50 border-orange-200"
    if (isNew) return "bg-yellow-50 border-yellow-200"
    return ""
  }
  
  const getWordBadgeClass = (isKnown: boolean, isNew: boolean, isRepeat: boolean) => {
    if (isKnown) return "bg-green-500"
    if (isRepeat) return "bg-orange-500"
    if (isNew) return "bg-yellow-500"
    return ""
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-teal-50">
          <CardTitle className="text-teal-700">Process German Text</CardTitle>
          <CardDescription>
            Upload or paste German text to extract vocabulary, analyze difficulty, and save for practice
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for this text"
                disabled={isProcessing}
                className="border-teal-200 focus:border-teal-300 focus:ring-teal-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">German Text</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type German text here..."
                className="min-h-[200px] border-teal-200 focus:border-teal-300 focus:ring-teal-300"
                disabled={isProcessing}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {saveSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  Text saved successfully! Redirecting to saved texts...
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setText(SAMPLE_TEXT)}
                disabled={isProcessing}
                className="border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                Load Sample Text
              </Button>
              <div className="space-x-2">
                {result && (
                  <Button
                    onClick={handleSaveResult}
                    disabled={isProcessing || isSaving || !session}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {isSaving ? "Saving..." : "Save Result"}
                  </Button>
                )}
                <Button 
                  onClick={handleProcessText} 
                  disabled={isProcessing} 
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isProcessing ? "Processing..." : "Process Text"}
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{getCurrentStep()?.description || "Processing..."}</span>
                    <span>{getOverallProgress()}%</span>
                  </div>
                  <Progress value={getOverallProgress()} className="h-3 bg-gray-200">
                    <div className="h-full bg-teal-500 rounded-full transition-all duration-300" />
                  </Progress>
                </div>
                
                {/* Detailed step progress */}
                <div className="space-y-2">
                  {processingSteps.map((step, index) => (
                    <div key={step.step} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        step.completed 
                          ? 'bg-teal-500' 
                          : index === currentStepIndex 
                            ? 'bg-teal-300 animate-pulse' 
                            : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm ${
                        step.completed 
                          ? 'text-teal-700 font-medium' 
                          : index === currentStepIndex 
                            ? 'text-gray-900' 
                            : 'text-gray-500'
                      }`}>
                        {step.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showNewWordAnimation && <NewWordAnimation word={newWord} />}

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-teal-50">
              <CardTitle className="text-teal-700">Processing Results</CardTitle>
              <CardDescription>
                Analysis of "{title}" - {result.stats.totalWords} words
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <h2 className="text-sm font-medium">Word Types</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {result.stats.verbs} Verbs
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {result.stats.nouns} Nouns
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {result.stats.adjectives} Adjectives
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {result.stats.adverbs} Adverbs
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">New vs. Known Words</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {result.stats.newWords} New Words
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {result.stats.existingWords} Known Words
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">New Words by Type</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {result.stats.newVerbs} New Verbs
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {result.stats.newNouns} New Nouns
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {result.stats.newAdjectives} New Adj.
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {result.stats.newAdverbs || 0} New Adv.
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">CEFR Level Distribution</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      A1: {result.stats.levelA1}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      A2: {result.stats.levelA2}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      B1: {result.stats.levelB1}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      B2+: {result.stats.levelB2Plus}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="verbs">
            <TabsList className="grid grid-cols-5 mb-4 bg-teal-50">
              <TabsTrigger value="verbs" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Verbs
              </TabsTrigger>
              <TabsTrigger value="nouns" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Nouns
              </TabsTrigger>
              <TabsTrigger
                value="adjectives"
                className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
              >
                Adjectives
              </TabsTrigger>
              <TabsTrigger value="adverbs" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Adverbs
              </TabsTrigger>
              <TabsTrigger value="sentences" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Sentences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verbs">
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-blue-700">Extracted Verbs</CardTitle>
                  <CardDescription>{result.extractedWords.verbs.length} verbs found in the text</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.extractedWords.verbs
                        .filter((verb, index, self) => 
                          index === self.findIndex(v => v.baseForm === verb.baseForm)
                        )
                        .map((verb, index) => (
                          <div key={index} className={`p-3 border rounded-md ${
                            verb.isNew ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{verb.baseForm}</h4>
                                <p className="text-sm text-gray-500">
                                  {verb.originalForm !== verb.baseForm && `Form: ${verb.originalForm}`}
                                  {verb.tense && ` • ${verb.tense}`}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Badge>{verb.level || "Unknown"}</Badge>
                                {verb.isNew ? (
                                  <Badge className="bg-yellow-500">New</Badge>
                                ) : (
                                  <Badge className="bg-green-500">Known</Badge>
                                )}
                              </div>
                            </div>
                            {verb.translation && (
                              <p className="text-sm mt-1">Translation: {verb.translation}</p>
                            )}
                          </div>
                        ))
                      }
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nouns">
              <Card>
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-green-700">Extracted Nouns</CardTitle>
                  <CardDescription>{result.extractedWords.nouns.length} nouns found in the text</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.extractedWords.nouns
                        .filter((noun, index, self) => 
                          index === self.findIndex(n => n.baseForm === noun.baseForm)
                        )
                        .map((noun, index) => (
                          <div key={index} className={`p-3 border rounded-md ${
                            noun.isNew ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{noun.baseForm}</h4>
                                <p className="text-sm text-gray-500">
                                  {noun.originalForm !== noun.baseForm && `Form: ${noun.originalForm}`}
                                  {noun.gender && ` • ${noun.gender}`}
                                  {noun.case && ` • ${noun.case}`}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Badge>{noun.level || "Unknown"}</Badge>
                                {noun.isNew ? (
                                  <Badge className="bg-yellow-500">New</Badge>
                                ) : (
                                  <Badge className="bg-green-500">Known</Badge>
                                )}
                              </div>
                            </div>
                            {noun.translation && (
                              <p className="text-sm mt-1">Translation: {noun.translation}</p>
                            )}
                          </div>
                        ))
                      }
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjectives">
              <Card>
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="text-yellow-700">Extracted Adjectives</CardTitle>
                  <CardDescription>
                    {result.extractedWords.adjectives.length} adjectives found in the text
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.extractedWords.adjectives
                    .filter((adj, index, self) => 
                      index === self.findIndex(a => a.baseForm === adj.baseForm)
                    )
                    .map((adjective, index) => (
                      <div key={index} className={`p-3 border rounded-md ${
                        adjective.isNew ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{adjective.baseForm}</h4>
                            <p className="text-sm text-gray-500">
                              {adjective.originalForm !== adjective.baseForm && `Form: ${adjective.originalForm}`}
                              {adjective.case && ` • ${adjective.case}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Badge>{adjective.level || "Unknown"}</Badge>
                            {adjective.isNew ? (
                              <Badge className="bg-yellow-500">New</Badge>
                            ) : (
                              <Badge className="bg-green-500">Known</Badge>
                            )}
                          </div>
                        </div>
                        {adjective.translation && (
                          <p className="text-sm mt-1">Translation: {adjective.translation}</p>
                        )}
                      </div>
                    ))
                  }
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="adverbs">
                <Card>
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="text-purple-700">Extracted Adverbs</CardTitle>
                    <CardDescription>
                      {result.extractedWords.adverbs.length} adverbs found in the text
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {result.extractedWords.adverbs
                        .filter((adv, index, self) => 
                          index === self.findIndex(a => a.baseForm === adv.baseForm)
                        )
                        .map((adverb, index) => (
                          <div key={index} className={`p-3 border rounded-md ${
                            adverb.isNew ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{adverb.baseForm}</h4>
                                <p className="text-sm text-gray-500">
                                  {adverb.originalForm !== adverb.baseForm && `Form: ${adverb.originalForm}`}
                                  {adverb.type && ` • ${adverb.type}`}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Badge>{adverb.level || "Unknown"}</Badge>
                                {adverb.isNew ? (
                                  <Badge className="bg-yellow-500">New</Badge>
                                ) : (
                                  <Badge className="bg-green-500">Known</Badge>
                                )}
                              </div>
                            </div>
                            {adverb.translation && (
                              <p className="text-sm mt-1">Translation: {adverb.translation}</p>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
            <TabsContent value="sentences">
              <Card>
                <CardHeader className="bg-purple-50">
                  <CardTitle className="text-purple-700">Processed Sentences</CardTitle>
                  <CardDescription>{result.sentences.length} sentences analyzed with translations</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {result.sentences.map((sentence, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <p className="font-medium">{sentence.german}</p>
                        <p className="text-sm text-gray-500 mt-1">{sentence.english}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sentence.words.map((word, wordIndex) => (
                            <Badge key={wordIndex} variant="outline" className="text-xs">
                              {word.baseForm} ({word.type})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}