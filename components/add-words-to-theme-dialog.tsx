"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { ThemeCategoryWord } from "@/lib/types"

interface AddWordsToThemeDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  themeId: string
  onWordAdded: (word: ThemeCategoryWord) => void
}

export default function AddWordsToThemeDialog({
  isOpen,
  onOpenChange,
  themeId,
  onWordAdded,
}: AddWordsToThemeDialogProps) {
  const [activeTab, setActiveTab] = useState("auto-categorized")
  const [searchTerm, setSearchTerm] = useState("")
  const [words, setWords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<any | null>(null)
  const [translation, setTranslation] = useState("")
  const [gender, setGender] = useState<string | undefined>(undefined)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (activeTab === "auto-categorized") {
        fetchAutoCategorizedWords()
      } else {
        fetchWords(activeTab)
      }
    }
  }, [isOpen, activeTab])

  const fetchAutoCategorizedWords = async () => {
    setIsLoading(true)
    setWords([])
    setSelectedWord(null)
    setTranslation("")
    setGender(undefined)

    try {
      // Fetch words from other themes that could be relevant to this theme
      const response = await fetch(`/api/themes/suggested-words?themeId=${themeId}&search=${searchTerm}`)
      if (!response.ok) {
        throw new Error("Failed to fetch auto-categorized words")
      }
      const data = await response.json()
      setWords(data)
    } catch (error) {
      console.error("Error fetching auto-categorized words:", error)
      setError("Failed to load auto-categorized words. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWords = async (type: string) => {
    setIsLoading(true)
    setWords([])
    setSelectedWord(null)
    setTranslation("")
    setGender(undefined)

    try {
      const response = await fetch(`/api/vocabulary/by-type?type=${type}&search=${searchTerm}`)
      if (!response.ok) {
        throw new Error("Failed to fetch words")
      }
      const data = await response.json()
      setWords(data)
    } catch (error) {
      console.error(`Error fetching ${type}:`, error)
      setError(`Failed to load ${type}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setSearchTerm("")
    setSelectedWord(null)
    setTranslation("")
    setGender(undefined)
  }

  const handleSearch = () => {
    if (activeTab === "auto-categorized") {
      fetchAutoCategorizedWords()
    } else {
      fetchWords(activeTab)
    }
  }

  const handleWordSelect = (word: any) => {
    setSelectedWord(word)
    setTranslation(word.translation || "")
    setGender(word.gender || undefined)
  }

  const handleAddWord = async () => {
    if (!selectedWord) return

    setIsAdding(true)
    setError(null)

    try {
      let wordData
      
      if (activeTab === "auto-categorized") {
        // For auto-categorized words, use the existing data structure
        wordData = {
          text: selectedWord.text,
          type: selectedWord.type,
          level: selectedWord.level,
          translation: translation || selectedWord.translation,
          gender: gender || selectedWord.gender,
        }
      } else {
        // For manual words, convert the type format
        wordData = {
          text: selectedWord.text,
          type: activeTab.toUpperCase() === "ADJECTIVES" ? "ADJECTIVE" : activeTab.toUpperCase().slice(0, -1),
          level: selectedWord.level,
          translation: translation,
          gender: gender,
        }
      }

      const response = await fetch(`/api/themes/${themeId}/words`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wordData),
      })

      if (!response.ok) {
        throw new Error("Failed to add word to theme")
      }

      const addedWord = await response.json()
      onWordAdded(addedWord)
      setSelectedWord(null)
      setTranslation("")
      setGender(undefined)
    } catch (error) {
      console.error("Error adding word to theme:", error)
      setError("Failed to add word to theme. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Words to Theme</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="auto-categorized" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="auto-categorized" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Suggested
            </TabsTrigger>
            <TabsTrigger value="verbs">Verbs</TabsTrigger>
            <TabsTrigger value="nouns">Nouns</TabsTrigger>
            <TabsTrigger value="adjectives">Adjectives</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder={
                  activeTab === "auto-categorized" 
                    ? "Search AI-suggested words..." 
                    : `Search ${activeTab}...`
                }
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="bg-teal-600 hover:bg-teal-700">
              Search
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md h-[350px] overflow-y-auto">
              <div className="p-2 border-b font-medium flex items-center gap-2">
                {activeTab === "auto-categorized" && <Sparkles className="h-4 w-4 text-yellow-500" />}
                {activeTab === "auto-categorized" ? "AI-Suggested Words" : `Available ${activeTab}`}
              </div>
              {isLoading ? (
                <div className="p-4 text-center">Loading...</div>
              ) : words.length > 0 ? (
                <div className="divide-y">
                  {words.map((word) => (
                    <div
                      key={word.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedWord?.id === word.id ? "bg-gray-100" : ""
                      }`}
                      onClick={() => handleWordSelect(word)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{word.text}</div>
                          {activeTab === "auto-categorized" && (
                            <div className="text-xs text-blue-600 mt-1">
                              {word.type} • From: {word.sourceTheme || "Processing"}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Badge>{word.level}</Badge>
                          {activeTab === "auto-categorized" && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              AI
                            </Badge>
                          )}
                        </div>
                      </div>
                      {word.gender && <div className="text-xs text-gray-500">Gender: {word.gender}</div>}
                      {word.translation && (
                        <div className="text-xs text-gray-600 mt-1">"{word.translation}"</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? "No words found matching your search" : 
                   activeTab === "auto-categorized" ? "No AI-suggested words available" : 
                   "Search for words to add"}
                </div>
              )}
            </div>

            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-4">Word Details</h3>
              {selectedWord ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Word</div>
                    <div className="p-2 border rounded-md">{selectedWord.text}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Type</div>
                    <div className="p-2 border rounded-md capitalize">
                      {activeTab === "auto-categorized" ? selectedWord.type : activeTab.slice(0, -1)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Level</div>
                    <div className="p-2 border rounded-md">{selectedWord.level}</div>
                  </div>

                  {activeTab === "auto-categorized" && selectedWord.sourceTheme && (
                    <div>
                      <div className="text-sm font-medium mb-1">Source Theme</div>
                      <div className="p-2 border rounded-md bg-blue-50 text-blue-700">
                        {selectedWord.sourceTheme}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="translation" className="text-sm font-medium">
                      Translation
                    </Label>
                    <Input
                      id="translation"
                      value={translation}
                      onChange={(e) => setTranslation(e.target.value)}
                      placeholder="Enter translation"
                      className="mt-1"
                    />
                  </div>

                  {(activeTab === "nouns" || (activeTab === "auto-categorized" && selectedWord.type === "NOUN")) && (
                    <div>
                      <Label htmlFor="gender" className="text-sm font-medium">
                        Gender
                      </Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger id="gender" className="mt-1">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MASC">Masculine</SelectItem>
                          <SelectItem value="FEM">Feminine</SelectItem>
                          <SelectItem value="NEUT">Neuter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    onClick={handleAddWord}
                    disabled={isAdding || !translation}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    {isAdding ? "Adding..." : "Add to Theme"}
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Select a word from the list to add it to the theme</p>
                  {activeTab === "auto-categorized" && (
                    <p className="text-xs mt-2 text-blue-600">
                      AI-suggested words are automatically categorized from processed texts
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}