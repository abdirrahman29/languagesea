"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"
import WordDetailModal from "@/components/word-detail-modal"
import type { SavedText, WordData } from "@/lib/types"
import { Loader2 } from "lucide-react"

export default function TextDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const [text, setText] = useState<SavedText | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchText = async () => {
            // @ts-ignore

      if (!session?.user?.id) {
        setError("You must be signed in to view text details")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
              // @ts-ignore

        const response = await fetch(`/api/saved-texts/${params.id}?userId=${session.user.id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch text details")
        }
        const data = await response.json()
        setText(data)
      } catch (error) {
        console.error("Error fetching text details:", error)
        setError("Failed to load text details. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchText()
          // @ts-ignore

  }, [params.id, session?.user?.id])

  const handleWordClick = (word: WordData) => {
    setSelectedWord(word)
    setIsModalOpen(true)
  }

  const handleMarkAsPracticed = async (wordId: number) => {
          // @ts-ignore

    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/words/practiced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wordId,
                // @ts-ignore

          userId: session.user.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to mark word as practiced")
      }

      // Update the local state to reflect the change
      if (text && text.words) {
        setText({
          ...text,
          words: text.words.map((word) => (word.id === wordId ? { ...word, practiced: true } : word)),
        })
      }

      // Update the selected word if it's the one being marked as practiced
      if (selectedWord && selectedWord.id === wordId) {
        setSelectedWord({
          ...selectedWord,
          practiced: true,
        })
      }
    } catch (error) {
      console.error("Error marking word as practiced:", error)
    }
  }

  // Helper function to get the background color for a word based on status
  const getWordBackgroundClass = (word: WordData) => {
    if (word.practiced) return "bg-green-50 border-green-200"
    if (word.isNew && !word.isRepeat) return "bg-yellow-50 border-yellow-200" // First occurrence of new word
    if (word.isNew && word.isRepeat) return "bg-orange-50 border-orange-200" // Repeated new word
    return "" // Known word, no special background
  }

  // Helper function to get the badge color for a word based on status
  const getWordBadgeClass = (word: WordData) => {
    if (word.isNew && !word.isRepeat) return "bg-yellow-500" // First occurrence of new word
    if (word.isNew && word.isRepeat) return "bg-orange-500" // Repeated new word
    return "" // Known word, no special badge
  }

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-lg">Loading text details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!text) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">Text not found</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Card className="mb-6">
        <CardHeader className="bg-teal-50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-teal-700">{text.title}</CardTitle>
              <CardDescription>
                Added on {new Date(text.dateAdded).toLocaleDateString()} • {text.wordCount} words • {text.readingTime}{" "}
                min read
              </CardDescription>
            </div>
            <Badge>{text.level}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Word Types</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {text.stats.verbs} Verbs
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {text.stats.nouns} Nouns
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {text.stats.adjectives} Adjectives
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {text.stats.adverbs} Adverbs
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">New vs. Known Words</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {text.stats.newWords} New Words
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {text.stats.knownFromOtherTexts} Known Words
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {text.stats.practicedWords} Practiced Words
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">CEFR Level Distribution</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    A1: {text.stats.levelA1}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    A2: {text.stats.levelA2}
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    B1: {text.stats.levelB1}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    B2+: {text.stats.levelB2Plus}
                  </Badge>
                </div>
              </div>

              <div className="flex items-end">
                <Button className="bg-teal-600 hover:bg-teal-700 w-full">Practice Words</Button>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-4">Text Content</h3>
              <div className="p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">{text.content}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all-words">
        <TabsList className="grid grid-cols-5 mb-4 bg-teal-50">
          <TabsTrigger value="all-words" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
            All Words
          </TabsTrigger>
          <TabsTrigger value="verbs" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
            Verbs
          </TabsTrigger>
          <TabsTrigger value="nouns" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
            Nouns
          </TabsTrigger>
          <TabsTrigger value="adjectives" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
            Adjectives
          </TabsTrigger>
          <TabsTrigger value="adverbs" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
            Adverbs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-words">
          <Card>
            <CardHeader className="bg-gray-50">
              <CardTitle>All Words</CardTitle>
              <CardDescription>All words extracted from this text</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {text.words?.map((word) => (
                  <div
                    key={word.id}
                    className={`p-3 border rounded-md cursor-pointer hover:shadow-md transition-shadow ${getWordBackgroundClass(word)}`}
                    onClick={() => handleWordClick(word)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{word.text}</h4>
                        <p className="text-sm text-gray-500">
                          {word.baseForm !== word.text ? `Base: ${word.baseForm}` : ""}
                          {word.type && ` • ${word.type}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Badge>{word.level}</Badge>
                        {word.isNew && (
                          <Badge className={getWordBadgeClass(word)}>{word.isRepeat ? "Repeat" : "New"}</Badge>
                        )}
                        {word.practiced && <Badge className="bg-green-500">Practiced</Badge>}
                      </div>
                    </div>
                    {word.translation && <p className="text-sm mt-1">{word.translation}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verbs">
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-700">Verbs</CardTitle>
              <CardDescription>
                {text.words?.filter((word) => word.type === "VERB").length || 0} verbs found in the text
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {text.words
                  ?.filter((word) => word.type === "VERB")
                  .map((word) => (
                    <div
                      key={word.id}
                      className={`p-3 border rounded-md cursor-pointer hover:shadow-md transition-shadow ${getWordBackgroundClass(word)}`}
                      onClick={() => handleWordClick(word)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{word.text}</h4>
                          <p className="text-sm text-gray-500">
                            {word.baseForm !== word.text ? `Base: ${word.baseForm}` : ""}
                            {word.tense ? ` • ${word.tense}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge>{word.level}</Badge>
                          {word.isNew && (
                            <Badge className={getWordBadgeClass(word)}>{word.isRepeat ? "Repeat" : "New"}</Badge>
                          )}
                          {word.practiced && <Badge className="bg-green-500">Practiced</Badge>}
                        </div>
                      </div>
                      {word.translation && <p className="text-sm mt-1">{word.translation}</p>}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nouns">
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700">Nouns</CardTitle>
              <CardDescription>
                {text.words?.filter((word) => word.type === "NOUN").length || 0} nouns found in the text
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {text.words
                  ?.filter((word) => word.type === "NOUN")
                  .map((word) => (
                    <div
                      key={word.id}
                      className={`p-3 border rounded-md cursor-pointer hover:shadow-md transition-shadow ${getWordBackgroundClass(word)}`}
                      onClick={() => handleWordClick(word)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{word.text}</h4>
                          <p className="text-sm text-gray-500">
                            {word.baseForm !== word.text ? `Base: ${word.baseForm}` : ""}
                            {word.gender ? ` • ${word.gender}` : ""}
                            {word.case ? ` • ${word.case}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge>{word.level}</Badge>
                          {word.isNew && (
                            <Badge className={getWordBadgeClass(word)}>{word.isRepeat ? "Repeat" : "New"}</Badge>
                          )}
                          {word.practiced && <Badge className="bg-green-500">Practiced</Badge>}
                        </div>
                      </div>
                      {word.translation && <p className="text-sm mt-1">{word.translation}</p>}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjectives">
          <Card>
            <CardHeader className="bg-yellow-50">
              <CardTitle className="text-yellow-700">Adjectives</CardTitle>
              <CardDescription>
                {text.words?.filter((word) => word.type === "ADJ").length || 0} adjectives found in the text
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {text.words
                  ?.filter((word) => word.type === "ADJ")
                  .map((word) => (
                    <div
                      key={word.id}
                      className={`p-3 border rounded-md cursor-pointer hover:shadow-md transition-shadow ${getWordBackgroundClass(word)}`}
                      onClick={() => handleWordClick(word)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{word.text}</h4>
                          <p className="text-sm text-gray-500">
                            {word.baseForm !== word.text ? `Base: ${word.baseForm}` : ""}
                            {word.case ? ` • ${word.case}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge>{word.level}</Badge>
                          {word.isNew && (
                            <Badge className={getWordBadgeClass(word)}>{word.isRepeat ? "Repeat" : "New"}</Badge>
                          )}
                          {word.practiced && <Badge className="bg-green-500">Practiced</Badge>}
                        </div>
                      </div>
                      {word.translation && <p className="text-sm mt-1">{word.translation}</p>}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adverbs">
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-700">Adverbs</CardTitle>
              <CardDescription>
                {text.words?.filter((word) => word.type === "ADV").length || 0} adverbs found in the text
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {text.words
                  ?.filter((word) => word.type === "ADV")
                  .map((word) => (
                    <div
                      key={word.id}
                      className={`p-3 border rounded-md cursor-pointer hover:shadow-md transition-shadow ${getWordBackgroundClass(word)}`}
                      onClick={() => handleWordClick(word)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{word.text}</h4>
                          <p className="text-sm text-gray-500">
                            {word.baseForm !== word.text ? `Base: ${word.baseForm}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge>{word.level}</Badge>
                          {word.isNew && (
                            <Badge className={getWordBadgeClass(word)}>{word.isRepeat ? "Repeat" : "New"}</Badge>
                          )}
                          {word.practiced && <Badge className="bg-green-500">Practiced</Badge>}
                        </div>
                      </div>
                      {word.translation && <p className="text-sm mt-1">{word.translation}</p>}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WordDetailModal
        word={selectedWord}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onMarkAsPracticed={handleMarkAsPracticed}
      />
    </div>
  )
}
