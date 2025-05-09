"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter } from "lucide-react"
import type { NounData } from "@/lib/types"
// import { fetchNouns } from "@/lib/data" // Remove this import
import { useSession } from "next-auth/react"

export default function NounsSection() {
  const [nouns, setNouns] = useState<NounData[]>([])
  const [filteredNouns, setFilteredNouns] = useState<NounData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [selectedNoun, setSelectedNoun] = useState<NounData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { data: session } = useSession()


  useEffect(() => {
    const loadNouns = async () => {
      setIsLoading(true)
      try {
        // Fetch nouns from the API with userId if available
              // @ts-ignore

        const userId = session?.user?.id
        const url = userId ? `/api/vocabulary/nouns?userId=${userId}` : "/api/vocabulary/nouns"
        const response = await fetch(url)

        if (response.ok) {
          const nounData = await response.json()
          setNouns(nounData)
          setFilteredNouns(nounData)
        } else {
          // If API fails, set empty arrays
          setNouns([])
          setFilteredNouns([])
        }
      } catch (error) {
        console.error("Error loading nouns:", error)
        setNouns([])
        setFilteredNouns([])
      } finally {
        setIsLoading(false)
      }
    }

    loadNouns()
          // @ts-ignore

  }, [session?.user?.id])

  useEffect(() => {
    let result = nouns

    if (searchTerm) {
      result = result.filter((noun) => noun.base_form.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (levelFilter !== "all") {
      result = result.filter((noun) => noun.level === levelFilter)
    }

    setFilteredNouns(result)
  }, [searchTerm, levelFilter, nouns])

  const handleNounSelect = (noun: NounData) => {
    setSelectedNoun(noun)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search nouns..."
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
            <h3 className="font-medium">Nouns ({filteredNouns.length})</h3>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-4 text-center">Loading nouns...</div>
            ) : filteredNouns.length > 0 ? (
              filteredNouns.map((noun) => (
                <div
                  key={noun.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedNoun?.id === noun.id ? "bg-gray-100" : ""}`}
                  onClick={() => handleNounSelect(noun)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{noun.base_form}</h4>
                      <p className="text-sm text-gray-500">ID: {noun.id}</p>
                    </div>
                    <Badge>{noun.level}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No nouns found matching your criteria</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedNoun ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedNoun.base_form}</CardTitle>
                    <CardDescription>ID: {selectedNoun.id}</CardDescription>
                  </div>
                  <Badge>{selectedNoun.level}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="nominative">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="nominative">Nominative</TabsTrigger>
                    <TabsTrigger value="accusative">Accusative</TabsTrigger>
                    <TabsTrigger value="dative">Dative</TabsTrigger>
                    <TabsTrigger value="genitive">Genitive</TabsTrigger>
                  </TabsList>

                  <TabsContent value="nominative">
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Masculine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">der</span>
                              <span>{selectedNoun.cases?.NOM?.MASC?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.NOM?.MASC?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Feminine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.NOM?.FEM?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.NOM?.FEM?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Neuter</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">das</span>
                              <span>{selectedNoun.cases?.NOM?.NEUT?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.NOM?.NEUT?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="accusative">
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Masculine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">den</span>
                              <span>{selectedNoun.cases?.ACC?.MASC?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.ACC?.MASC?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Feminine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.ACC?.FEM?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.ACC?.FEM?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Neuter</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">das</span>
                              <span>{selectedNoun.cases?.ACC?.NEUT?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">die</span>
                              <span>{selectedNoun.cases?.ACC?.NEUT?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="dative">
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Masculine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">dem</span>
                              <span>{selectedNoun.cases?.DAT?.MASC?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">den</span>
                              <span>{selectedNoun.cases?.DAT?.MASC?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Feminine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">der</span>
                              <span>{selectedNoun.cases?.DAT?.FEM?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">den</span>
                              <span>{selectedNoun.cases?.DAT?.FEM?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Neuter</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">dem</span>
                              <span>{selectedNoun.cases?.DAT?.NEUT?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">den</span>
                              <span>{selectedNoun.cases?.DAT?.NEUT?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="genitive">
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Masculine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">des</span>
                              <span>{selectedNoun.cases?.GEN?.MASC?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">der</span>
                              <span>{selectedNoun.cases?.GEN?.MASC?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Feminine</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">der</span>
                              <span>{selectedNoun.cases?.GEN?.FEM?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">der</span>
                              <span>{selectedNoun.cases?.GEN?.FEM?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4">
                        <h4 className="font-medium mb-2">Neuter</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">des</span>
                              <span>{selectedNoun.cases?.GEN?.NEUT?.SG?.form || "-"}</span>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-gray-500">der</span>
                              <span>{selectedNoun.cases?.GEN?.NEUT?.PL?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg p-8">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Select a noun</h3>
                <p className="text-gray-500">Choose a noun from the list to view its declension details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
