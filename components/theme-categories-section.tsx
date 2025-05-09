"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { ThemeCategory } from "@/lib/types"

type ThemeCategoriesSectionProps = {}

export default function ThemeCategoriesSection({}: ThemeCategoriesSectionProps) {
  const [themes, setThemes] = useState<ThemeCategory[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    } catch (error) {
      console.error("Error fetching themes:", error)
      setError("Failed to load themes. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredThemes = themes.filter((theme) => theme.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search themes..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && <div className="text-red-500">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Theme Categories</CardTitle>
          <CardDescription>Browse available theme categories</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading themes...</div>
          ) : filteredThemes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredThemes.map((theme) => (
                <div key={theme.id} className="border rounded-md p-3">
                  <h3 className="font-medium">{theme.name}</h3>
                  <p className="text-sm text-gray-500">{theme.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>No themes found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
