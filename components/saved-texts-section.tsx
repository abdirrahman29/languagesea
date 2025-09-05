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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

  const userId = session?.user?.id
  console.log('Current Session:', {
    userId,
    sessionExists: !!session,
    authStatus: session ? 'Authenticated' : 'Unauthenticated'
  });

  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  useEffect(() => {
    const loadTexts = async () => {
      if (!userId) {
        console.log('No userId available, skipping fetch')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        console.log('Fetching saved texts for userId:', userId)
        
        // Updated to use the correct API response structure
        const response = await fetch(`/api/saved-texts?userId=${userId}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log("Raw API response:", data)

        // Handle the API response structure - it returns { savedTexts: [...], pagination: {...} }
        const textsArray = data.savedTexts || data || []
        console.log("Extracted texts array:", textsArray)

        // Process the texts to ensure they have required properties
        const processedTexts = textsArray.map((text: any) => {
          const processed = {
            ...text,
            // Ensure we have default values for required properties
            content: text.content || '', // Add content field if missing
            words: (text.words || []).filter((w: any) => w?.text),
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
          }
          
          console.log(`Processed text ${text.id}:`, {
            id: processed.id,
            title: processed.title,
            wordCount: processed.wordCount,
            hasContent: !!processed.content
          })
          
          return processed
        })

        console.log("Final processed texts:", processedTexts)
        
        setSavedTexts(processedTexts)
        setFilteredTexts(processedTexts)
        
      } catch (error) {
        console.error('Failed to fetch texts:', error)
        setError(error instanceof Error ? error.message : 'Failed to load saved texts')
      } finally {
        setIsLoading(false)
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
            (text.excerpt && text.excerpt.toLowerCase().includes(searchTerm.toLowerCase())),
        ),
      )
    } else {
      setFilteredTexts(savedTexts)
    }
  }, [searchTerm, savedTexts])

  const handleTextSelect = async (text: SavedText) => {
    try {
      // If the text doesn't have content or words, fetch them
      if (!text.content || !text.words || text.words.length === 0) {
        console.log('Fetching full text data for:', text.id)
        
        const response = await fetch(`/api/saved-texts/${text.id}`)
        if (response.ok) {
          const fullTextData = await response.json()
          setSelectedText(fullTextData)
        } else {
          console.error('Failed to fetch full text data')
          setSelectedText(text)
        }
      } else {
        setSelectedText(text)
      }
      
      setIsTextViewerOpen(true)
    } catch (error) {
      console.error('Error loading text details:', error)
      setSelectedText(text) // Show what we have
      setIsTextViewerOpen(true)
    }
  }

  const handleDeleteText = async (textId: number | string) => {
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
          setSavedTexts(prev => prev.filter(t => t.id !== textId.toString()));
          setFilteredTexts(prev => prev.filter(t => t.id !== textId.toString()));
        } else {
          console.error('Failed to delete text');
          setError('Failed to delete text')
        }
      } catch (error) {
        console.error('Error deleting text:', error);
        setError('Failed to delete text')
      }
    }
  };

  const handleWordClick = (word: WordData) => {
    setSelectedWord(word)
    setIsWordDetailOpen(true)
  }

  const renderTextWithHighlights = (text: SavedText) => {
    if (!text.content) return <div className="text-gray-500 italic">Content not available</div>
    
    const wordFrequency = new Map<string, number>();
    text.words?.forEach((word) => {
      const count = wordFrequency.get(word.baseForm) || 0;
      wordFrequency.set(word.baseForm, count + 1);
    });

    const tokens = text.content.split(/(\s+|[.,!?;:()"])/g)

    return (
      <div className="text-lg leading-relaxed">
        {tokens.map((token, index) => {
          if (!token.trim() || /^[.,!?;:()"]+$/.test(token)) {
            return <span key={index}>{token}</span>
          }

          const wordData = text.words?.find((w) => 
            w.text?.toLowerCase() === token.toLowerCase()
          )
          
          if (!wordData) {
            return <span key={index}>{token}</span>
          }

          const isRepeated = (wordFrequency.get(wordData.baseForm) || 0) > 1;
          const isHovered = hoveredWord === wordData.baseForm;

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading saved texts...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-red-500">
          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Error loading texts</p>
          <p className="text-sm mt-1">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
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
                  <Calendar className="h-3 w-3" /> 
                  {new Date(text.dateAdded).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {text.excerpt || text.title}
                </p>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Book className="h-4 w-4" /> {text.wordCount || 0} words
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
                        e.stopPropagation();
                        handleDeleteText(text.id)
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
            {searchTerm && (
              <p className="text-sm mt-2">
                No texts match your search for "{searchTerm}"
              </p>
            )}
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
                  <Calendar className="h-4 w-4" /> 
                  {new Date(selectedText.dateAdded).toLocaleDateString()}
                  <span className="mx-2">•</span>
                  <Book className="h-4 w-4" /> {selectedText.wordCount || 0} words
                  <span className="mx-2">•</span>
                  <Clock className="h-4 w-4" /> {selectedText.readingTime || 0} min read
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                    {selectedText.stats?.newWords || 0} New Words
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200">
                    {selectedText.stats?.practicedWords || 0} Practiced Words
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 border-blue-200">
                    {selectedText.stats?.knownFromOtherTexts || 0} Known from Other Texts
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
                        <h3 className="font-medium mb-2">
                          New Words ({selectedText.words?.filter((word) => word.isNew && !word.practiced).length || 0})
                        </h3>
                        <div className="space-y-1">
                          {selectedText.words
                            ?.filter((word) => word.isNew && !word.practiced)
                            .map((word, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => handleWordClick(word)}
                              >
                                <div>
                                  <span className="font-medium">{word.text}</span>
                                  <span className="text-xs text-gray-500 ml-2">({word.type?.toLowerCase() || 'unknown'})</span>
                                </div>
                                <Badge>{word.level}</Badge>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">
                          Practiced Words ({selectedText.words?.filter((word) => word.practiced).length || 0})
                        </h3>
                        <div className="space-y-1">
                          {selectedText.words
                            ?.filter((word) => word.practiced)
                            .map((word, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => handleWordClick(word)}
                              >
                                <div>
                                  <span className="font-medium">{word.text}</span>
                                  <span className="text-xs text-gray-500 ml-2">({word.type?.toLowerCase() || 'unknown'})</span>
                                </div>
                                <Badge>{word.level}</Badge>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h3 className="font-medium mb-2 text-blue-800">
                          Known from Other Texts ({selectedText.words?.filter((word) => word.isKnown && !word.practiced).length || 0})
                        </h3>
                        <div className="space-y-1">
                          {selectedText.words
                            ?.filter((word) => word.isKnown && !word.practiced)
                            .map((word, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-1 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                                onClick={() => handleWordClick(word)}
                              >
                                <div>
                                  <span className="font-medium text-blue-700">{word.text}</span>
                                  <span className="text-xs text-blue-500 ml-2">({word.type?.toLowerCase() || 'unknown'})</span>
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
                          {['verbs', 'nouns', 'adjectives', 'adverbs'].map((type) => {
                            const count = selectedText.stats?.[type as keyof typeof selectedText.stats] || 0
                            const percentage = selectedText.wordCount ? Math.round((count / selectedText.wordCount) * 100) : 0
                            
                            return (
                              <div key={type}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-medium capitalize">{type}</span>
                                  <span className="text-sm text-gray-500">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">Level Distribution</h3>
                        <div className="space-y-2">
                          {[
                            { key: 'levelA1', label: 'A1' },
                            { key: 'levelA2', label: 'A2' },
                            { key: 'levelB1', label: 'B1' },
                            { key: 'levelB2Plus', label: 'B2+' }
                          ].map(({ key, label }) => {
                            const count = selectedText.stats?.[key as keyof typeof selectedText.stats] || 0
                            const percentage = selectedText.wordCount ? Math.round((count / selectedText.wordCount) * 100) : 0
                            
                            return (
                              <div key={key}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-medium">{label}</span>
                                  <span className="text-sm text-gray-500">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            )
                          })}
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
          console.log(`Marking word ${wordId} as practiced`)
        }}
      />
    </div>
  )
}