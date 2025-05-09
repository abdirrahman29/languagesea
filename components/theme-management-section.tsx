"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash, BookOpen, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ThemeCategory, ThemeCategoryWord } from "@/lib/types"
import AddWordsToThemeDialog from "@/components/add-words-to-theme-dialog"

export default function ThemeManagementSection() {
  const router = useRouter()
  const [themes, setThemes] = useState<ThemeCategory[]>([])
  const [selectedTheme, setSelectedTheme] = useState<ThemeCategory | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddWordsDialogOpen, setIsAddWordsDialogOpen] = useState(false)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeDescription, setNewThemeDescription] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchThemes()
  }, [])

  const fetchThemes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/themes")
      if (!response.ok) {
        throw new Error("Failed to fetch themes")
      }
      const data = await response.json()
      setThemes(data)
      if (data.length > 0 && !selectedTheme) {
        setSelectedTheme(data[0])
      }
    } catch (error) {
      console.error("Error fetching themes:", error)
      setError("Failed to load themes. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) {
      setError("Theme name is required")
      return
    }

    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newThemeName,
          description: newThemeDescription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create theme")
      }

      const newTheme = await response.json()
      setThemes([...themes, { ...newTheme, words: [] }])
      setSelectedTheme({ ...newTheme, words: [] })
      setNewThemeName("")
      setNewThemeDescription("")
      setIsCreateDialogOpen(false)
      setError(null)
    } catch (error) {
      console.error("Error creating theme:", error)
      setError("Failed to create theme. Please try again.")
    }
  }

  const handleUpdateTheme = async () => {
    if (!selectedTheme || !newThemeName.trim()) {
      setError("Theme name is required")
      return
    }

    try {
      const response = await fetch(`/api/themes/${selectedTheme.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newThemeName,
          description: newThemeDescription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update theme")
      }

      const updatedTheme = await response.json()
      setThemes(
        themes.map((theme) =>
          theme.id === selectedTheme.id ? { ...updatedTheme, words: selectedTheme.words } : theme,
        ),
      )
      setSelectedTheme({ ...updatedTheme, words: selectedTheme.words })
      setIsEditDialogOpen(false)
      setError(null)
    } catch (error) {
      console.error("Error updating theme:", error)
      setError("Failed to update theme. Please try again.")
    }
  }

  const handleDeleteTheme = async () => {
    if (!selectedTheme) return

    try {
      const response = await fetch(`/api/themes/${selectedTheme.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete theme")
      }

      const updatedThemes = themes.filter((theme) => theme.id !== selectedTheme.id)
      setThemes(updatedThemes)
      setSelectedTheme(updatedThemes.length > 0 ? updatedThemes[0] : null)
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting theme:", error)
      setError("Failed to delete theme. Please try again.")
    }
  }

  const handleEditClick = () => {
    if (selectedTheme) {
      setNewThemeName(selectedTheme.name)
      setNewThemeDescription(selectedTheme.description || "")
      setIsEditDialogOpen(true)
    }
  }

  const handleDeleteClick = () => {
    if (selectedTheme) {
      setIsDeleteDialogOpen(true)
    }
  }

  const handleAddWordsClick = () => {
    if (selectedTheme) {
      setIsAddWordsDialogOpen(true)
    }
  }

  const handleWordAdded = (word: ThemeCategoryWord) => {
    if (selectedTheme) {
      const updatedTheme = {
        ...selectedTheme,
        words: [...selectedTheme.words, word],
      }
      setSelectedTheme(updatedTheme)
      setThemes(themes.map((theme) => (theme.id === selectedTheme.id ? updatedTheme : theme)))
    }
  }

  const handleRemoveWord = async (wordId: string) => {
    if (!selectedTheme) return

    try {
      const response = await fetch(`/api/themes/${selectedTheme.id}/words?wordId=${wordId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove word from theme")
      }

      const updatedWords = selectedTheme.words.filter((word) => word.id !== wordId)
      const updatedTheme = { ...selectedTheme, words: updatedWords }
      setSelectedTheme(updatedTheme)
      setThemes(themes.map((theme) => (theme.id === selectedTheme.id ? updatedTheme : theme)))
    } catch (error) {
      console.error("Error removing word from theme:", error)
      setError("Failed to remove word from theme. Please try again.")
    }
  }

  const filteredThemes = themes.filter((theme) => theme.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search themes..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" /> Create New Theme
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="p-4">
              <CardTitle>Theme Collections</CardTitle>
              <CardDescription>Organize vocabulary by themes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center">Loading themes...</div>
                ) : filteredThemes.length > 0 ? (
                  <div className="divide-y">
                    {filteredThemes.map((theme) => (
                      <div
                        key={theme.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center ${
                          selectedTheme?.id === theme.id ? "bg-gray-100" : ""
                        }`}
                        onClick={() => setSelectedTheme(theme)}
                      >
                        <div>
                          <div className="font-medium">{theme.name}</div>
                          <div className="text-xs text-gray-500">{theme.words.length} words</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">No themes found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {selectedTheme ? (
            <Card>
              <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedTheme.name}</CardTitle>
                    <CardDescription>{selectedTheme.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditClick}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeleteClick} className="text-red-500">
                      <Trash className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Tabs defaultValue="all">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="all">All Words</TabsTrigger>
                    <TabsTrigger value="verbs">Verbs</TabsTrigger>
                    <TabsTrigger value="nouns">Nouns</TabsTrigger>
                    <TabsTrigger value="adjectives">Adjectives</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedTheme.words.length > 0 ? (
                        selectedTheme.words.map((word) => (
                          <div key={word.id} className="border rounded-md p-3 relative group">
                            <button
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveWord(word.id)}
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                            </button>
                            <div className="flex justify-between items-start">
                              <div className="font-medium">{word.text}</div>
                              <Badge>{word.level}</Badge>
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {word.type.toLowerCase()} {word.gender && `(${word.gender})`}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 italic">{word.translation}</div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p className="mb-4">No words in this theme yet</p>
                          <Button onClick={handleAddWordsClick} className="bg-teal-600 hover:bg-teal-700">
                            <Plus className="h-4 w-4 mr-2" /> Add Words
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="verbs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedTheme.words.filter((word) => word.type.toUpperCase() === "VERB").length > 0 ? (
                        selectedTheme.words
                          .filter((word) => word.type.toUpperCase() === "VERB")
                          .map((word) => (
                            <div key={word.id} className="border rounded-md p-3 relative group">
                              <button
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveWord(word.id)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </button>
                              <div className="flex justify-between items-start">
                                <div className="font-medium">{word.text}</div>
                                <Badge>{word.level}</Badge>
                              </div>
                              <div className="text-sm text-gray-500 capitalize">{word.type.toLowerCase()}</div>
                              <div className="text-sm text-gray-600 mt-1 italic">{word.translation}</div>
                            </div>
                          ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          <p className="mb-4">No verbs in this theme yet</p>
                          <Button onClick={handleAddWordsClick} className="bg-teal-600 hover:bg-teal-700">
                            <Plus className="h-4 w-4 mr-2" /> Add Verbs
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="nouns">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedTheme.words.filter((word) => word.type.toUpperCase() === "NOUN").length > 0 ? (
                        selectedTheme.words
                          .filter((word) => word.type.toUpperCase() === "NOUN")
                          .map((word) => (
                            <div key={word.id} className="border rounded-md p-3 relative group">
                              <button
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveWord(word.id)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </button>
                              <div className="flex justify-between items-start">
                                <div className="font-medium">{word.text}</div>
                                <Badge>{word.level}</Badge>
                              </div>
                              <div className="text-sm text-gray-500 capitalize">
                                {word.type.toLowerCase()} {word.gender && `(${word.gender})`}
                              </div>
                              <div className="text-sm text-gray-600 mt-1 italic">{word.translation}</div>
                            </div>
                          ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          <p className="mb-4">No nouns in this theme yet</p>
                          <Button onClick={handleAddWordsClick} className="bg-teal-600 hover:bg-teal-700">
                            <Plus className="h-4 w-4 mr-2" /> Add Nouns
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="adjectives">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedTheme.words.filter(
                        (word) => word.type.toUpperCase() === "ADJECTIVE" || word.type.toUpperCase() === "ADJ",
                      ).length > 0 ? (
                        selectedTheme.words
                          .filter(
                            (word) => word.type.toUpperCase() === "ADJECTIVE" || word.type.toUpperCase() === "ADJ",
                          )
                          .map((word) => (
                            <div key={word.id} className="border rounded-md p-3 relative group">
                              <button
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveWord(word.id)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </button>
                              <div className="flex justify-between items-start">
                                <div className="font-medium">{word.text}</div>
                                <Badge>{word.level}</Badge>
                              </div>
                              <div className="text-sm text-gray-500 capitalize">{word.type.toLowerCase()}</div>
                              <div className="text-sm text-gray-600 mt-1 italic">{word.translation}</div>
                            </div>
                          ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          <p className="mb-4">No adjectives in this theme yet</p>
                          <Button onClick={handleAddWordsClick} className="bg-teal-600 hover:bg-teal-700">
                            <Plus className="h-4 w-4 mr-2" /> Add Adjectives
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-end">
                <Button onClick={handleAddWordsClick} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" /> Add Words
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg p-8">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <h3 className="text-lg font-medium mb-2">No theme selected</h3>
                <p className="text-gray-500 mb-4">Select a theme from the list or create a new one</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" /> Create New Theme
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Theme Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="theme-name" className="text-sm font-medium">
                Theme Name
              </label>
              <Input
                id="theme-name"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Enter theme name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="theme-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="theme-description"
                value={newThemeDescription}
                onChange={(e) => setNewThemeDescription(e.target.value)}
                placeholder="Enter theme description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTheme} className="bg-teal-600 hover:bg-teal-700">
              Create Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Theme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-theme-name" className="text-sm font-medium">
                Theme Name
              </label>
              <Input
                id="edit-theme-name"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Enter theme name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-theme-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="edit-theme-description"
                value={newThemeDescription}
                onChange={(e) => setNewThemeDescription(e.target.value)}
                placeholder="Enter theme description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTheme} className="bg-teal-600 hover:bg-teal-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Theme Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the theme "{selectedTheme?.name}"? This action cannot be undone and will
              remove all words associated with this theme.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTheme}>
              Delete Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Words Dialog */}
      {selectedTheme && (
        <AddWordsToThemeDialog
          isOpen={isAddWordsDialogOpen}
          onOpenChange={setIsAddWordsDialogOpen}
          themeId={selectedTheme.id}
          onWordAdded={handleWordAdded}
        />
      )}
    </div>
  )
}
