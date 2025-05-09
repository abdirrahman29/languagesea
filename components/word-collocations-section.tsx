"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ArrowRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCollocationData } from "@/lib/data"
import type { WordCollocation } from "@/lib/types"

export default function WordCollocationsSection() {
  const [collocations, setCollocations] = useState<WordCollocation[]>([])
  const [filteredCollocations, setFilteredCollocations] = useState<WordCollocation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [themeFilter, setThemeFilter] = useState("all")

  useEffect(() => {
    const loadCollocationData = async () => {
      const data = await getCollocationData()
      setCollocations(data)
      setFilteredCollocations(data)
    }

    loadCollocationData()
  }, [])

  useEffect(() => {
    let result = [...collocations]

    // Apply search filter
    if (searchTerm) {
      result = result.filter(
        (collocation) =>
          collocation.firstWord.toLowerCase().includes(searchTerm.toLowerCase()) ||
          collocation.secondWord.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply theme filter
    if (themeFilter !== "all") {
      result = result.filter((collocation) => collocation.themes.includes(themeFilter))
    }

    setFilteredCollocations(result)
  }, [searchTerm, themeFilter, collocations])

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return "bg-teal-600 text-white"
    if (strength >= 0.6) return "bg-teal-500 text-white"
    if (strength >= 0.4) return "bg-teal-400"
    if (strength >= 0.2) return "bg-teal-300"
    return "bg-teal-200 text-teal-800"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search collocations..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Themes</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="cooking">Cooking</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="daily">Daily Life</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Word Collocations</CardTitle>
          <CardDescription>Words that frequently appear together in German texts</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCollocations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCollocations.map((collocation, index) => (
                <div key={index} className="border rounded-md p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{collocation.firstWord}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">{collocation.secondWord}</span>
                    <Badge className={`ml-auto ${getStrengthColor(collocation.strength)}`}>
                      {Math.round(collocation.strength * 100)}%
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{collocation.example}</div>
                  <div className="flex flex-wrap gap-1">
                    {collocation.themes.map((theme, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No collocations found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
