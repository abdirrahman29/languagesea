"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calendar, ArrowUpDown, BookOpen } from "lucide-react"
import type { VerbData } from "@/lib/types"
// import { fetchVerbs } from "@/lib/data" // Remove direct import from data
import { useSession } from "next-auth/react"


export default function VerbsSection() {
  const [verbs, setVerbs] = useState<VerbData[]>([])
  const [filteredVerbs, setFilteredVerbs] = useState<VerbData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [sortBy, setSortBy] = useState("alphabetical")
  const [selectedVerb, setSelectedVerb] = useState<VerbData | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [isLoading, setIsLoading] = useState(true)
  const { data: session } = useSession()

  useEffect(() => {
    const loadVerbs = async () => {
      setIsLoading(true)
      try {
        // Fetch verbs from the API endpoint with userId if available
              // @ts-ignore

        const userId = session?.user?.id
        const url = userId ? `/api/vocabulary/verbs?userId=${userId}` : "/api/vocabulary/verbs"
        const response = await fetch(url)

        if (response.ok) {
          const verbData = await response.json()
          setVerbs(verbData)
          setFilteredVerbs(verbData)
        } else {
          console.error("Failed to fetch verbs:", response.statusText)
          setVerbs([])
          setFilteredVerbs([])
        }
      } catch (error) {
        console.error("Error loading verbs:", error)
        setVerbs([])
        setFilteredVerbs([])
      } finally {
        setIsLoading(false)
      }
    }

    loadVerbs()
          // @ts-ignore

  }, [session?.user?.id])

  useEffect(() => {
    let result = [...verbs]

    if (searchTerm) {
      result = result.filter((verb) => verb.base_form.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (levelFilter !== "all") {
      result = result.filter((verb) => verb.level === levelFilter)
    }

    // Sort the results
    if (sortBy === "alphabetical") {
      result.sort((a, b) => a.base_form.localeCompare(b.base_form))
    } else if (sortBy === "level") {
      const levelOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
      result.sort((a, b) => {
        const levelA = levelOrder[a.level as keyof typeof levelOrder] || 999
        const levelB = levelOrder[b.level as keyof typeof levelOrder] || 999
        return levelA - levelB
      })
    } else if (sortBy === "date-added") {
      // In a real app, you would sort by the date added
      // For now, we'll just use the ID as a proxy for date added
      result.sort((a, b) => b.id - a.id)
    }

    setFilteredVerbs(result)
  }, [searchTerm, levelFilter, sortBy, verbs])

  const handleVerbSelect = (verb: VerbData) => {
    setSelectedVerb(verb)
  }

  const groupVerbsByLevel = () => {
    const groups: Record<string, VerbData[]> = {}

    filteredVerbs.forEach((verb) => {
      const level = verb.level || "Unknown"
      if (!groups[level]) {
        groups[level] = []
      }
      groups[level].push(verb)
    })

    return groups
  }

  const renderVerbList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      )
    }

    if (filteredVerbs.length === 0) {
      return <div className="p-4 text-center text-gray-500">No verbs found matching your criteria</div>
    }

    if (viewMode === "grid") {
      const groups = groupVerbsByLevel()

      return (
        <div className="space-y-6">
          {Object.entries(groups).map(([level, verbs]) => (
            <div key={level}>
              <h3 className="font-medium text-lg mb-2 px-4">
                {level} Level ({verbs.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 px-4">
                {verbs.map((verb) => (
                  <div
                    key={verb.id}
                    className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${selectedVerb?.id === verb.id ? "bg-gray-100 border-teal-500" : ""}`}
                    onClick={() => handleVerbSelect(verb)}
                  >
                    <div className="font-medium">{verb.base_form}</div>
                    <div className="text-xs text-gray-500">ID: {verb.id}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="divide-y">
        {filteredVerbs.map((verb) => (
          <div
            key={verb.id}
            className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedVerb?.id === verb.id ? "bg-gray-100" : ""}`}
            onClick={() => handleVerbSelect(verb)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{verb.base_form}</h4>
                <p className="text-sm text-gray-500">ID: {verb.id}</p>
              </div>
              <Badge>{verb.level}</Badge>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search verbs..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
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

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">
                <div className="flex items-center">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Alphabetical
                </div>
              </SelectItem>
              <SelectItem value="level">
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  By Level
                </div>
              </SelectItem>
              <SelectItem value="date-added">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Added
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("grid")}
            >
              Grid
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1 h-[400px] md:h-[600px] overflow-y-auto border rounded-lg">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h3 className="font-medium">Verbs ({filteredVerbs.length})</h3>
          </div>
          {renderVerbList()}
        </div>

        <div className="lg:col-span-2">
          {selectedVerb ? (
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedVerb.base_form}</CardTitle>
                    <CardDescription>ID: {selectedVerb.id}</CardDescription>
                  </div>
                  <Badge>{selectedVerb.level}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <Tabs defaultValue="present">
                  <div className="overflow-x-auto pb-2">
                    <TabsList className="inline-flex min-w-full md:grid md:grid-cols-3 mb-4">
                      <TabsTrigger value="present">Present</TabsTrigger>
                      <TabsTrigger value="past">Past</TabsTrigger>
                      <TabsTrigger value="imperative">Imperative</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="present">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Indicative</h4>
                        <div className="space-y-2">
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">ich</span>
                              <span>{selectedVerb.present?.indicative?.SG?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">du</span>
                              <span>{selectedVerb.present?.indicative?.SG?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">er/sie/es</span>
                              <span>{selectedVerb.present?.indicative?.SG?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">wir</span>
                              <span>{selectedVerb.present?.indicative?.PL?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">ihr</span>
                              <span>{selectedVerb.present?.indicative?.PL?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">sie/Sie</span>
                              <span>{selectedVerb.present?.indicative?.PL?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Subjunctive</h4>
                        <div className="space-y-2">
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">ich</span>
                              <span>{selectedVerb.present?.subjunctive?.SG?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">du</span>
                              <span>{selectedVerb.present?.subjunctive?.SG?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">er/sie/es</span>
                              <span>{selectedVerb.present?.subjunctive?.SG?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">wir</span>
                              <span>{selectedVerb.present?.subjunctive?.PL?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">ihr</span>
                              <span>{selectedVerb.present?.subjunctive?.PL?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">sie/Sie</span>
                              <span>{selectedVerb.present?.subjunctive?.PL?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="past">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Indicative</h4>
                        <div className="space-y-2">
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">ich</span>
                              <span>{selectedVerb.past?.indicative?.SG?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">du</span>
                              <span>{selectedVerb.past?.indicative?.SG?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">er/sie/es</span>
                              <span>{selectedVerb.past?.indicative?.SG?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">wir</span>
                              <span>{selectedVerb.past?.indicative?.PL?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">ihr</span>
                              <span>{selectedVerb.past?.indicative?.PL?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">sie/Sie</span>
                              <span>{selectedVerb.past?.indicative?.PL?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Subjunctive</h4>
                        <div className="space-y-2">
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Singular</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">ich</span>
                              <span>{selectedVerb.past?.subjunctive?.SG?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">du</span>
                              <span>{selectedVerb.past?.subjunctive?.SG?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">er/sie/es</span>
                              <span>{selectedVerb.past?.subjunctive?.SG?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                          <div className="border rounded-md p-3">
                            <h5 className="text-sm font-medium mb-1">Plural</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-gray-500">wir</span>
                              <span>{selectedVerb.past?.subjunctive?.PL?.[1]?.form || "-"}</span>
                              <span className="text-gray-500">ihr</span>
                              <span>{selectedVerb.past?.subjunctive?.PL?.[2]?.form || "-"}</span>
                              <span className="text-gray-500">sie/Sie</span>
                              <span>{selectedVerb.past?.subjunctive?.PL?.[3]?.form || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="imperative">
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Imperative Forms</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h5 className="text-sm font-medium mb-1">Singular</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500">du</span>
                            <span>{selectedVerb.imperative?.SG?.[0]?.form || "-"}</span>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-1">Plural</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500">ihr</span>
                            <span>{selectedVerb.imperative?.PL?.[0]?.form || "-"}</span>
                            <span className="text-gray-500">Sie</span>
                            <span>{selectedVerb.imperative?.PL?.[1]?.form || "-"}</span>
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
                <h3 className="text-lg font-medium mb-2">Select a verb</h3>
                <p className="text-gray-500">Choose a verb from the list to view its conjugation details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
