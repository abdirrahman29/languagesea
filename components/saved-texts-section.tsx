"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import { Progress } from "@/components/ui/progress"
import { useSession } from "next-auth/react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calendar, Book, Eye, BarChart2, BookOpen, Clock } from "lucide-react"
import { getSavedTexts } from "@/lib/data"
import type { SavedText, WordData } from "@/lib/types"
import WordDetailModal from "@/components/word-detail-modal"

export default function SavedTextsSection() {
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([])
  const [filteredTexts, setFilteredTexts] = useState<SavedText[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedText, setSelectedText] = useState<SavedText | null>(null)
  const [isTextViewerOpen, setIsTextViewerOpen] = useState(false)
  const [isWordDetailOpen, setIsWordDetailOpen] = useState(false)
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null)
  const { data: session } = useSession()
        // @ts-ignore

  const userId = session?.user?.id
  console.log('Current Session:', {
    userId,
    sessionExists: !!session,
    authStatus: session ? 'Authenticated' : 'Unauthenticated'
  });

  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  useEffect(() => {
    // In your useEffect data fetching
const loadTexts = async () => {
  try {
    const response = await fetch(`/api/saved-texts?userId=${userId}`)
    const data = await response.json()
    
    console.log("cxxc",data)

    
    // Add null check and default empty array
    const processedData = data.map((text: any) => ({
      ...text,
      words: (text.words || []).filter((w: any) => w.text),
      stats: text.stats || {
        newWords: 0,
        practicedWords: 0,
        knownFromOtherTexts: 0,
        verbs: 0,
        nouns: 0,
        adjectives: 0,
        adverbs: 0,
        levelA1: 0,
        levelA2: 0,
        levelB1: 0,
        levelB2Plus: 0,
      }
    }))

    setSavedTexts(processedData)
    setFilteredTexts(processedData)
  } catch (error) {
    console.error('Failed to fetch texts:', error)
  }
}
    loadTexts()
  }, [userId])
  

  useEffect(() => {
    if (searchTerm) {
      setFilteredTexts(
        savedTexts.filter(
          (text) =>
            text.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            text.excerpt.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      )
    } else {
      setFilteredTexts(savedTexts)
    }
  }, [searchTerm, savedTexts])

  const handleTextSelect = (text: SavedText) => {
    setSelectedText(text)
    setIsTextViewerOpen(true)
  }
// Add this inside your component
const handleDeleteText = async (textId: number) => {
  if (!userId) return;

  if (window.confirm("Are you sure you want to delete this text?")) {
    try {
      const response = await fetch(`/api/saved-texts/${textId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setSavedTexts(prev => prev.filter(t => t.id !== textId));
        setFilteredTexts(prev => prev.filter(t => t.id !== textId));
      } else {
        console.error('Failed to delete text');
      }
    } catch (error) {
      console.error('Error deleting text:', error);
    }
  }
};
  const handleWordClick = (word: WordData) => {
    setSelectedWord(word)
    setIsWordDetailOpen(true)
  }

  const renderTextWithHighlights = (text: SavedText) => {
    if (!text.content) return null
    const wordFrequency = new Map<string, number>();
    text.words?.forEach((word) => {
      const count = wordFrequency.get(word.baseForm) || 0;
      wordFrequency.set(word.baseForm, count + 1);
    });
  
    // Split the text into words and punctuation
    // Split the text into words and punctuation
    const tokens = text.content.split(/(\s+|[.,!?;:()"])/g)

    return (
      <div className="text-lg leading-relaxed">
        {tokens.map((token, index) => {
          // Skip whitespace and punctuation
          if (!token.trim() || /^[.,!?;:()"]+$/.test(token)) {
            return <span key={index}>{token}</span>
          }

          // Find if this word is in our vocabulary
          const wordData = text.words?.find((w) => 
          w.text?.toLowerCase() === token.toLowerCase()
        )
          if (!wordData) {
            return <span key={index}>{token}</span>
          }

            // Check if word is repeated
        const isRepeated = (wordFrequency.get(wordData.baseForm) || 0) > 1;
        const isHovered = hoveredWord === wordData.baseForm;

        // Determine the color based on practice status and repetition
        let className = "cursor-pointer rounded px-0.5 transition-all duration-200 ";
        
        if (isHovered) {
          className += wordData.baseForm === hoveredWord 
            ? "bg-orange-200 scale-105" 
            : "opacity-50";
        } else if (isRepeated) {
          className += "bg-orange-100 hover:bg-orange-200";
        } else if (wordData.practiced) {
          className += "bg-green-100 hover:bg-green-200";
        } else if (wordData.isKnown) {
          className += "bg-blue-100 hover:bg-blue-200";
        } else if (wordData.isNew) {
          className += "bg-yellow-100 hover:bg-yellow-200";
        } else {
          className += "hover:bg-gray-100";
        }

          return (
            <span
              key={index}
              className={className}
              onMouseEnter={() => setHoveredWord(wordData.baseForm)}
              onMouseLeave={() => setHoveredWord(null)}
              onClick={() => handleWordClick(wordData)}
              title={`${wordData.type}: ${wordData.translation}`}
            >
              {wordData.text || token}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search saved texts..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTexts.length > 0 ? (
          filteredTexts.map((text) => (
            <Card
              key={text.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleTextSelect(text)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">{text.title}</CardTitle>
                  <Badge>{text.level}</Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {text.dateAdded}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3">{text.excerpt}</p>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Book className="h-4 w-4" /> {text.wordCount} words
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 px-2">
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click handler
                        handleDeleteText(Number(text.id)) // Ensure ID is a number

                      }}
                    >
                      Delete
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-2">
                      <BarChart2 className="h-4 w-4 mr-1" /> Stats
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No saved texts found. Process a text to save it for later review.</p>
          </div>
        )}
      </div>

      {/* Text Viewer Dialog */}
      <Dialog open={isTextViewerOpen} onOpenChange={setIsTextViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedText && (
            <>
              <DialogHeader>
                <DialogTitle className="flex justify-between items-start">
                  <span>{selectedText.title}</span>
                  <Badge>{selectedText.level}</Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {selectedText.dateAdded}
                  <span className="mx-2">•</span>
                  <Book className="h-4 w-4" /> {selectedText.wordCount} words
                  <span className="mx-2">•</span>
                  <Clock className="h-4 w-4" /> {selectedText.readingTime} min read
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                    {selectedText.stats.newWords} New Words
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200">
                    {selectedText.stats.practicedWords} Practiced Words
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 border-blue-200">
                    {selectedText.stats.knownFromOtherTexts} Known from Other Texts
                  </Badge>
                </div>

                <Tabs defaultValue="text">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4">
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="text-sm text-gray-500 mb-2">
                        <span className="inline-block px-2 py-0.5 mr-2 bg-yellow-100 rounded">New words</span>
                        <span className="inline-block px-2 py-0.5 mr-2 bg-green-100 rounded">Practiced words</span>
                        <span className="inline-block px-2 py-0.5 bg-blue-100 rounded">Known from other texts</span>
                      </div>
                      {renderTextWithHighlights(selectedText)}
                    </div>
                  </TabsContent>

                  <TabsContent value="vocabulary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">New Words ({selectedText.stats.newWords})</h3>
                        <div className="space-y-1">
                                              {/*       @ts-ignore*/}

                          {selectedText.words
                            .filter((word) => word.isNew && !word.practiced)
                            .map((word, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => handleWordClick(word)}
                              >
                                <div>
                                  <span className="font-medium">{word.text}</span>
                                  <span className="text-xs text-gray-500 ml-2">({word.type.toLowerCase()})</span>
                                </div>
                                <Badge>{word.level}</Badge>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">Practiced Words ({selectedText.stats.practicedWords})</h3>
                        <div className="space-y-1">
                                              {/*       @ts-ignore*/}

                          {selectedText.words
                            .filter((word) => word.practiced)
                            .map((word, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => handleWordClick(word)}
                              >
                                <div>
                                  <span className="font-medium">{word.text}</span>
                                  <span className="text-xs text-gray-500 ml-2">({word.type.toLowerCase()})</span>
                                </div>
                                <Badge>{word.level}</Badge>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                          <h3 className="font-medium mb-2 text-blue-800">
                            Known from Other Texts ({selectedText.stats.knownFromOtherTexts})
                          </h3>
                          <div className="space-y-1">
                                                {/*       @ts-ignore*/}

                            {selectedText.words
                              .filter((word) => word.isKnown && !word.practiced)
                              .map((word, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center p-1 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                                  onClick={() => handleWordClick(word)}
                                >
                                  <div>
                                    <span className="font-medium text-blue-700">{word.text}</span>
                                    <span className="text-xs text-blue-500 ml-2">({word.type.toLowerCase()})</span>
                                  </div>
                                  <Badge className="bg-blue-100 text-blue-700">{word.level}</Badge>
                                </div>
                              ))}
                          </div>
                        </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="stats">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">Word Types</h3>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Verbs</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.verbs} (
                                {Math.round((selectedText.stats.verbs / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.verbs / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Nouns</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.nouns} (
                                {Math.round((selectedText.stats.nouns / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.nouns / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Adjectives</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.adjectives} (
                                {Math.round((selectedText.stats.adjectives / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.adjectives / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Adverbs</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.adverbs} (
                                {Math.round((selectedText.stats.adverbs / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.adverbs / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">Level Distribution</h3>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">A1</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.levelA1} (
                                {Math.round((selectedText.stats.levelA1 / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.levelA1 / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">A2</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.levelA2} (
                                {Math.round((selectedText.stats.levelA2 / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.levelA2 / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">B1</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.levelB1} (
                                {Math.round((selectedText.stats.levelB1 / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.levelB1 / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">B2+</span>
                              <span className="text-sm text-gray-500">
                                {selectedText.stats.levelB2Plus} (
                                {Math.round((selectedText.stats.levelB2Plus / selectedText.wordCount) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(selectedText.stats.levelB2Plus / selectedText.wordCount) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Word Detail Dialog */}
      <WordDetailModal
        word={selectedWord}
        isOpen={isWordDetailOpen}
        onOpenChange={setIsWordDetailOpen}
        onMarkAsPracticed={(wordId) => {
          // Here you would implement the logic to mark a word as practiced
          console.log(`Marking word ${wordId} as practiced`)
          // In a real app, you would update your data store
        }}
      />
    </div>
  )
}
