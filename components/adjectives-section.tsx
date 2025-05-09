"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"
import type { AdjectiveData } from "@/lib/types"
// import { fetchAdjectives } from "@/lib/data" // Remove this import
import { useSession } from "next-auth/react"


export default function AdjectivesSection() {
  const [adjectives, setAdjectives] = useState<AdjectiveData[]>([])
  const [filteredAdjectives, setFilteredAdjectives] = useState<AdjectiveData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [selectedAdjective, setSelectedAdjective] = useState<AdjectiveData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { data: session } = useSession()


  
  useEffect(() => {
    const loadAdjectives = async () => {
      setIsLoading(true)
      try {
        // Fetch adjectives from the API with userId if available
              // @ts-ignore

        const userId = session?.user?.id
        const url = userId ? `/api/vocabulary/adjectives?userId=${userId}` : "/api/vocabulary/adjectives"
        const response = await fetch(url)

        if (response.ok) {
          const adjectiveData = await response.json()
          setAdjectives(adjectiveData)
          setFilteredAdjectives(adjectiveData)
        } else {
          // If API fails, set empty arrays
          setAdjectives([])
          setFilteredAdjectives([])
        }
      } catch (error) {
        console.error("Error loading adjectives:", error)
        setAdjectives([])
        setFilteredAdjectives([])
      } finally {
        setIsLoading(false)
      }
    }

    loadAdjectives()
          // @ts-ignore

  }, [session?.user?.id])

  useEffect(() => {
    let result = adjectives

    if (searchTerm) {
      result = result.filter((adjective) => adjective.base_form.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (levelFilter !== "all") {
      result = result.filter((adjective) => adjective.level === levelFilter)
    }

    setFilteredAdjectives(result)
  }, [searchTerm, levelFilter, adjectives])

  const handleAdjectiveSelect = (adjective: AdjectiveData) => {
    setSelectedAdjective(adjective)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search adjectives..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-[600px] overflow-y-auto border rounded-lg">
          <div className="p-4 border-b sticky top-0 bg-white">
            <h3 className="font-medium">Adjectives ({filteredAdjectives.length})</h3>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-4 text-center">Loading adjectives...</div>
            ) : filteredAdjectives.length > 0 ? (
              filteredAdjectives.map((adjective) => (
                <div
                  key={adjective.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedAdjective?.id === adjective.id ? "bg-gray-100" : ""}`}
                  onClick={() => handleAdjectiveSelect(adjective)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{adjective.base_form}</h4>
                      <p className="text-sm text-gray-500">ID: {adjective.id}</p>
                    </div>
                    <Badge>{adjective.level}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No adjectives found matching your criteria</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedAdjective ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedAdjective.base_form}</CardTitle>
                    <CardDescription>ID: {selectedAdjective.id}</CardDescription>
                  </div>
                  <Badge>{selectedAdjective.level}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Declension Forms</h3>
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Attributive Forms</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <h5 className="text-sm font-medium mb-1">Masculine</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nom:</span>
                              <span>{selectedAdjective.forms?.attributive?.masculine?.nominative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Acc:</span>
                              <span>{selectedAdjective.forms?.attributive?.masculine?.accusative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Dat:</span>
                              <span>{selectedAdjective.forms?.attributive?.masculine?.dative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Gen:</span>
                              <span>{selectedAdjective.forms?.attributive?.masculine?.genitive || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium mb-1">Feminine</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nom:</span>
                              <span>{selectedAdjective.forms?.attributive?.feminine?.nominative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Acc:</span>
                              <span>{selectedAdjective.forms?.attributive?.feminine?.accusative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Dat:</span>
                              <span>{selectedAdjective.forms?.attributive?.feminine?.dative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Gen:</span>
                              <span>{selectedAdjective.forms?.attributive?.feminine?.genitive || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium mb-1">Neuter</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nom:</span>
                              <span>{selectedAdjective.forms?.attributive?.neuter?.nominative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Acc:</span>
                              <span>{selectedAdjective.forms?.attributive?.neuter?.accusative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Dat:</span>
                              <span>{selectedAdjective.forms?.attributive?.neuter?.dative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Gen:</span>
                              <span>{selectedAdjective.forms?.attributive?.neuter?.genitive || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium mb-1">Plural</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nom:</span>
                              <span>{selectedAdjective.forms?.attributive?.plural?.nominative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Acc:</span>
                              <span>{selectedAdjective.forms?.attributive?.plural?.accusative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Dat:</span>
                              <span>{selectedAdjective.forms?.attributive?.plural?.dative || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Gen:</span>
                              <span>{selectedAdjective.forms?.attributive?.plural?.genitive || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Comparative and Superlative</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Comparative</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Form:</span>
                            <span>{selectedAdjective.forms?.comparative || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Example:</span>
                            <span>{selectedAdjective.examples?.comparative || "-"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Superlative</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Form:</span>
                            <span>{selectedAdjective.forms?.superlative || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Example:</span>
                            <span>{selectedAdjective.examples?.superlative || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Usage Examples</h3>
                    <div className="border rounded-md p-4">
                      <div className="space-y-3">
                                            {/*       @ts-ignore*/}

                        {selectedAdjective.examples?.usage ? (
                                // @ts-ignore

                          selectedAdjective.examples.usage.map((example, index) => (
                            <div key={index} className="space-y-1">
                              <p className="text-sm">{example.german}</p>
                              <p className="text-sm text-gray-500">{example.english}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No usage examples available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg p-8">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Select an adjective</h3>
                <p className="text-gray-500">Choose an adjective from the list to view its declension details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
