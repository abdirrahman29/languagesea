// Enhanced verbs-section.tsx - Complete implementation
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calendar, ArrowUpDown, BookOpen, RefreshCw } from "lucide-react"
import type { VerbData } from "@/lib/types"
import { useSession } from "next-auth/react"

interface EnhancedVerbData extends VerbData {
  hasConjugations?: boolean
}

export default function VerbsSection() {
  const [verbs, setVerbs] = useState<EnhancedVerbData[]>([])
  const [filteredVerbs, setFilteredVerbs] = useState<EnhancedVerbData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [sortBy, setSortBy] = useState("alphabetical")
  const [selectedVerb, setSelectedVerb] = useState<EnhancedVerbData | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingConjugations, setIsGeneratingConjugations] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    const loadVerbs = async () => {
      setIsLoading(true)
      try {
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
      result.sort((a, b) => b.id - a.id)
    }

    setFilteredVerbs(result)
  }, [searchTerm, levelFilter, sortBy, verbs])

  const handleVerbSelect = async (verb: EnhancedVerbData) => {
    setSelectedVerb(verb)
    
    // If verb doesn't have conjugations, try to fetch them
    if (!verb.hasConjugations) {
      try {
        const response = await fetch(`/api/vocabulary/verbs?verbId=${verb.id}`)
        if (response.ok) {
          const verbWithConjugations = await response.json()
          setSelectedVerb(verbWithConjugations)
        }
      } catch (error) {
        console.error("Error fetching verb details:", error)
      }
    }
  }

  const handleGenerateConjugations = async (verb: EnhancedVerbData) => {
    if (!verb) return
    
    setIsGeneratingConjugations(true)
    try {
      const response = await fetch('/api/vocabulary/verbs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verbId: verb.id }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(result.message)
        
        // Refresh the verb data
        const updatedResponse = await fetch(`/api/vocabulary/verbs?verbId=${verb.id}`)
        if (updatedResponse.ok) {
          const updatedVerb = await updatedResponse.json()
          setSelectedVerb(updatedVerb)
          
          // Update the verb in the list
          setVerbs(prevVerbs => 
            prevVerbs.map(v => v.id === verb.id ? { ...v, hasConjugations: true } : v)
          )
        }
      } else {
        console.error('Failed to generate conjugations')
      }
    } catch (error) {
      console.error('Error generating conjugations:', error)
    } finally {
      setIsGeneratingConjugations(false)
    }
  }

  const groupVerbsByLevel = () => {
    const groups: Record<string, EnhancedVerbData[]> = {}

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
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{verb.base_form}</div>
                      {!verb.hasConjugations && (
                        <Badge variant="outline" className="text-xs">
                          No conjugations
                        </Badge>
                      )}
                    </div>
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
                {!verb.hasConjugations && (
                  <p className="text-xs text-orange-500">No conjugations available</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge>{verb.level}</Badge>
                {verb.hasConjugations && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ Conjugations
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderConjugationContent = (verb: EnhancedVerbData) => {
    if (!verb.hasConjugations || !verb.present) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-gray-500 mb-4">No conjugations available for this verb</p>
          <Button
            onClick={() => handleGenerateConjugations(verb)}
            disabled={isGeneratingConjugations}
            className="flex items-center gap-2"
          >
            {isGeneratingConjugations ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Conjugations
              </>
            )}
          </Button>
        </div>
      )
    }

    return (
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
                    <span>{verb.present?.indicative?.SG?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">du</span>
                    <span>{verb.present?.indicative?.SG?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">er/sie/es</span>
                    <span>{verb.present?.indicative?.SG?.[3]?.form || "-"}</span>
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <h5 className="text-sm font-medium mb-1">Plural</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">wir</span>
                    <span>{verb.present?.indicative?.PL?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">ihr</span>
                    <span>{verb.present?.indicative?.PL?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">sie/Sie</span>
                    <span>{verb.present?.indicative?.PL?.[3]?.form || "-"}</span>
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
                    <span>{verb.present?.subjunctive?.SG?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">du</span>
                    <span>{verb.present?.subjunctive?.SG?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">er/sie/es</span>
                    <span>{verb.present?.subjunctive?.SG?.[3]?.form || "-"}</span>
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <h5 className="text-sm font-medium mb-1">Plural</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">wir</span>
                    <span>{verb.present?.subjunctive?.PL?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">ihr</span>
                    <span>{verb.present?.subjunctive?.PL?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">sie/Sie</span>
                    <span>{verb.present?.subjunctive?.PL?.[3]?.form || "-"}</span>
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
                    <span>{verb.past?.indicative?.SG?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">du</span>
                    <span>{verb.past?.indicative?.SG?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">er/sie/es</span>
                    <span>{verb.past?.indicative?.SG?.[3]?.form || "-"}</span>
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <h5 className="text-sm font-medium mb-1">Plural</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">wir</span>
                    <span>{verb.past?.indicative?.PL?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">ihr</span>
                    <span>{verb.past?.indicative?.PL?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">sie/Sie</span>
                    <span>{verb.past?.indicative?.PL?.[3]?.form || "-"}</span>
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
                    <span>{verb.past?.subjunctive?.SG?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">du</span>
                    <span>{verb.past?.subjunctive?.SG?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">er/sie/es</span>
                    <span>{verb.past?.subjunctive?.SG?.[3]?.form || "-"}</span>
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <h5 className="text-sm font-medium mb-1">Plural</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">wir</span>
                    <span>{verb.past?.subjunctive?.PL?.[1]?.form || "-"}</span>
                    <span className="text-gray-500">ihr</span>
                    <span>{verb.past?.subjunctive?.PL?.[2]?.form || "-"}</span>
                    <span className="text-gray-500">sie/Sie</span>
                    <span>{verb.past?.subjunctive?.PL?.[3]?.form || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="imperative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Singular Forms (du)</h4>
              <div className="border rounded-md p-3">
                {verb.imperative?.SG && verb.imperative.SG.length > 0 ? (
                  verb.imperative.SG.map((form: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-gray-500">du</span>
                      <span className="font-medium">{form.form}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500">No forms available</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Plural Forms (ihr/Sie)</h4>
              <div className="border rounded-md p-3">
                {verb.imperative?.PL && verb.imperative.PL.length > 0 ? (
                  verb.imperative.PL.map((form: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-gray-500">
                        {form.person === "2" ? "ihr" : "Sie"}
                      </span>
                      <span className="font-medium">{form.form}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500">No forms available</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Verb Conjugations</h2>
        <p className="text-gray-600">Explore German verb conjugations with filtering and search</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search verbs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
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
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
            <SelectItem value="level">By Level</SelectItem>
            <SelectItem value="date-added">Date Added</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          {viewMode === "list" ? "Grid View" : "List View"}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verb List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Verbs ({filteredVerbs.length})
            </CardTitle>
            <CardDescription>
              Click on a verb to view its conjugations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto">
            {renderVerbList()}
          </CardContent>
        </Card>

        {/* Conjugation Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedVerb ? `Conjugations: ${selectedVerb.base_form}` : "Select a Verb"}
            </CardTitle>
            <CardDescription>
              {selectedVerb 
                ? `${selectedVerb.level} level verb conjugations`
                : "Choose a verb from the list to see its conjugations"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {selectedVerb ? (
              renderConjugationContent(selectedVerb)
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                Select a verb to view conjugations
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}