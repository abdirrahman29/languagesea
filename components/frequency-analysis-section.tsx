"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, SortAsc, SortDesc, BookOpen, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FrequencyWord, WordData } from "@/lib/types"
import NewWordAnimation from "@/components/new-word-animation"
import WordDetailModal from "@/components/word-detail-modal"
import { useSession } from "next-auth/react"

export default function FrequencyAnalysisSection() {
  const { data: session, status } = useSession()
  const [frequencyData, setFrequencyData] = useState<FrequencyWord[]>([])
  const [filteredWords, setFilteredWords] = useState<FrequencyWord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [frequencyFilter, setFrequencyFilter] = useState("all")
  const [sortBy, setSortBy] = useState("frequency-desc")
  const [isWordDetailOpen, setIsWordDetailOpen] = useState(false)
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newWordAnimation, setNewWordAnimation] = useState({
    isVisible: false,
    word: "",
    translation: "",
    type: "",
    level: "",
  })

  useEffect(() => {
    const loadFrequencyData = async () => {
            // @ts-ignore

      if (status === "loading" || !session?.user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/vocabulary/frequency")

        if (!response.ok) {
          throw new Error(`Error fetching frequency data: ${response.status}`)
        }

        const data = await response.json()
        setFrequencyData(data)
        setFilteredWords(data)
      } catch (err) {
        console.error("Error loading frequency data:", err)
        setError("Failed to load frequency data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadFrequencyData()
          // @ts-ignore

  }, [session?.user?.id, status])

  useEffect(() => {
    let result = [...frequencyData]

    // Apply search filter
    if (searchTerm) {
      result = result.filter((word) => word.text.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((word) => word.type.toLowerCase() === typeFilter.toLowerCase())
    }

    // Apply level filter
    if (levelFilter !== "all") {
      result = result.filter((word) => word.level === levelFilter)
    }

    // Apply frequency filter
    if (frequencyFilter !== "all") {
      switch (frequencyFilter) {
        case "50+":
          result = result.filter((word) => word.frequency >= 50)
          break
        case "30-49":
          result = result.filter((word) => word.frequency >= 30 && word.frequency < 50)
          break
        case "20-29":
          result = result.filter((word) => word.frequency >= 20 && word.frequency < 30)
          break
        case "10-19":
          result = result.filter((word) => word.frequency >= 10 && word.frequency < 20)
          break
        case "5-9":
          result = result.filter((word) => word.frequency >= 5 && word.frequency < 10)
          break
        case "1-4":
          result = result.filter((word) => word.frequency >= 1 && word.frequency < 5)
          break
      }
    }

    // Apply sorting
    switch (sortBy) {
      case "frequency-desc":
        result.sort((a, b) => b.frequency - a.frequency)
        break
      case "frequency-asc":
        result.sort((a, b) => a.frequency - b.frequency)
        break
      case "alphabetical-asc":
        result.sort((a, b) => a.text.localeCompare(b.text))
        break
      case "alphabetical-desc":
        result.sort((a, b) => b.text.localeCompare(a.text))
        break
      case "level-asc":
        const levelOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
        result.sort((a, b) => {
          const levelA = levelOrder[a.level as keyof typeof levelOrder] || 999
          const levelB = levelOrder[b.level as keyof typeof levelOrder] || 999
          return levelA - levelB
        })
        break
      case "level-desc":
        const levelOrderDesc = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
        result.sort((a, b) => {
          const levelA = levelOrderDesc[a.level as keyof typeof levelOrderDesc] || 999
          const levelB = levelOrderDesc[b.level as keyof typeof levelOrderDesc] || 999
          return levelB - levelA
        })
        break
    }

    setFilteredWords(result)
  }, [searchTerm, typeFilter, levelFilter, frequencyFilter, sortBy, frequencyData])

  const handleWordClick = (word: FrequencyWord) => {
    // Show animation for demonstration purposes when clicking on a word
    if (!word.practiced && Math.random() > 0.7) {
      setNewWordAnimation({
        isVisible: true,
        word: word.text,
        translation: word.translation,
        type: word.type,
        level: word.level,
      })
    }

    // Convert FrequencyWord to WordData for the detail dialog
    const wordData: WordData = {
      id: word.id,
      text: word.text,
      baseForm: word.baseForm || word.text,
      type: word.type,
      level: word.level,
      translation: word.translation,
      gender: word.gender,
      tense: word.tense,
      case: word.case,
      practiced: word.practiced,
      isNew: false,
            // @ts-ignore

      appearsInOtherTexts: true,
      additionalInfo: {
        frequency: word.frequency,
        textsCount: word.textsCount,
      },
      occurrences: word.occurrences,
    }

    setSelectedWord(wordData)
    setIsWordDetailOpen(true)
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
      setFrequencyData((prevData) => prevData.map((word) => (word.id === wordId ? { ...word, practiced: true } : word)))

      // Update the selected word if it's the one being marked as practiced
      if (selectedWord && selectedWord.id === wordId) {
        setSelectedWord({
          ...selectedWord,
          practiced: true,
        })
      }

      // Show animation when marking as practiced
      const word = frequencyData.find((w) => w.id === wordId)
      if (word) {
        setNewWordAnimation({
          isVisible: true,
          word: word.text,
          translation: word.translation,
          type: word.type,
          level: word.level,
        })
      }
    } catch (error) {
      console.error("Error marking word as practiced:", error)
    }
  }

  const getFrequencyBadgeColor = (frequency: number) => {
    if (frequency >= 50) return "bg-teal-600 text-white"
    if (frequency >= 30) return "bg-teal-500 text-white"
    if (frequency >= 20) return "bg-teal-400 text-white"
    if (frequency >= 10) return "bg-teal-300"
    if (frequency >= 5) return "bg-teal-200 text-teal-800"
    return "bg-gray-200 text-gray-800"
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-lg">Loading frequency data...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="text-center py-8">
        <p className="mb-4">Please sign in to view frequency analysis.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search words..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="verb">Verbs</SelectItem>
              <SelectItem value="noun">Nouns</SelectItem>
              <SelectItem value="adjective">Adjectives</SelectItem>
              <SelectItem value="adverb">Adverbs</SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="A1">A1</SelectItem>
              <SelectItem value="A2">A2</SelectItem>
              <SelectItem value="B1">B1</SelectItem>
              <SelectItem value="B2">B2</SelectItem>
              <SelectItem value="C1">C1</SelectItem>
              <SelectItem value="C2">C2</SelectItem>
            </SelectContent>
          </Select>

          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="50+">50+ occurrences</SelectItem>
              <SelectItem value="30-49">30-49 occurrences</SelectItem>
              <SelectItem value="20-29">20-29 occurrences</SelectItem>
              <SelectItem value="10-19">10-19 occurrences</SelectItem>
              <SelectItem value="5-9">5-9 occurrences</SelectItem>
              <SelectItem value="1-4">1-4 occurrences</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="frequency-desc">
                <div className="flex items-center">
                  <SortDesc className="h-4 w-4 mr-2" />
                  Frequency (High-Low)
                </div>
              </SelectItem>
              <SelectItem value="frequency-asc">
                <div className="flex items-center">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Frequency (Low-High)
                </div>
              </SelectItem>
              <SelectItem value="alphabetical-asc">
                <div className="flex items-center">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Alphabetical (A-Z)
                </div>
              </SelectItem>
              <SelectItem value="alphabetical-desc">
                <div className="flex items-center">
                  <SortDesc className="h-4 w-4 mr-2" />
                  Alphabetical (Z-A)
                </div>
              </SelectItem>
              <SelectItem value="level-asc">
                <div className="flex items-center">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Level (A1-C2)
                </div>
              </SelectItem>
              <SelectItem value="level-desc">
                <div className="flex items-center">
                  <SortDesc className="h-4 w-4 mr-2" />
                  Level (C2-A1)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Word Frequency Analysis</CardTitle>
              <CardDescription>
                Showing {filteredWords.length} of {frequencyData.length} words
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredWords.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Word</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Level</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Frequency</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Texts</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredWords.map((word) => (
                        <tr
                          key={word.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleWordClick(word)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{word.text}</div>
                            <div className="text-xs text-gray-500">{word.translation}</div>
                          </td>
                          <td className="px-4 py-3 capitalize">{word.type.toLowerCase()}</td>
                          <td className="px-4 py-3">
                            <Badge>{word.level}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getFrequencyBadgeColor(word.frequency)}>{word.frequency}</Badge>
                          </td>
                          <td className="px-4 py-3">{word.textsCount}</td>
                          <td className="px-4 py-3">
                            {word.practiced ? (
                              <Badge variant="outline" className="bg-green-50 border-green-200">
                                Practiced
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                                Not Practiced
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No words found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid">
          {filteredWords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWords.map((word) => (
                <Card
                  key={word.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleWordClick(word)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{word.text}</CardTitle>
                      <Badge>{word.level}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1 capitalize">
                      {word.type.toLowerCase()}
                      {word.gender && ` • ${word.gender}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{word.translation}</p>
                    <div className="flex justify-between items-center">
                      <Badge className={getFrequencyBadgeColor(word.frequency)}>{word.frequency} occurrences</Badge>
                      <div className="text-sm text-gray-500">
                        {word.textsCount} {word.textsCount === 1 ? "text" : "texts"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No words found matching your criteria.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Word Detail Dialog */}
      <WordDetailModal
        word={selectedWord}
        isOpen={isWordDetailOpen}
        onOpenChange={setIsWordDetailOpen}
        onMarkAsPracticed={handleMarkAsPracticed}
      />
      <NewWordAnimation
        word={newWordAnimation.word}
        translation={newWordAnimation.translation}
        type={newWordAnimation.type}
        level={newWordAnimation.level}
        isVisible={newWordAnimation.isVisible}
        onComplete={() => setNewWordAnimation((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  )
}
