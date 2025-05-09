"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Menu, Loader2 } from "lucide-react"
import DashboardStats from "@/components/dashboard-stats"
import TextProcessingSection from "@/components/text-processing-section"
import SavedTextsSection from "@/components/saved-texts-section"
import FrequencyAnalysisSection from "@/components/frequency-analysis-section"
import VocabularySection from "@/components/vocabulary-section"
import WordRelationshipsSection from "@/components/word-relationships-section"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface DashboardData {
  stats: {
    totalWords: number
    verbs: number
    nouns: number
    adjectives: number
    adverbs: number
    levelA1: number
    levelA2: number
    levelB1: number
    levelB2: number
    levelC1: number
    levelC2: number
    practicedWords: number
    totalTexts: number
    streak: number
    currentLevel: string
    progressToNextLevel: number
    recentActivity: Array<{
      id: string
      text: string
      type: string
      level: string
      createdAt: string
      savedText: {
        title: string
      }
    }>
  }
  frequencyDistribution: {
    range50Plus: number
    range30to49: number
    range20to29: number
    range10to19: number
    range5to9: number
    range1to4: number
  }
  recentTexts: Array<{
    id: string
    title: string
    excerpt: string
    level: string
    dateAdded: string
  }>
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
            // @ts-ignore

      if (!session?.user?.id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
              // @ts-ignore

        const response = await fetch(`/api/dashboard?userId=${session.user.id}`)
        
        if (!response.ok) throw new Error("Failed to fetch dashboard data")
        const data = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setError("Failed to load dashboard data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
          // @ts-ignore

  }, [session?.user?.id])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        {error}
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>No data available. Process some texts to get started.</p>
      </div>
    )
  }

  const { stats, frequencyDistribution } = dashboardData

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="dashboard" className="w-full">
              <div className="overflow-x-auto pb-2">
                <TabsList className="inline-flex min-w-full md:grid md:grid-cols-7 mb-4 md:mb-6">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
                  <TabsTrigger value="practice">Practice</TabsTrigger>
                  <TabsTrigger value="process">Process Text</TabsTrigger>
                  <TabsTrigger value="saved-texts">Saved Texts</TabsTrigger>
                  <TabsTrigger value="frequency">Frequency</TabsTrigger>
                  <TabsTrigger value="relationships">Relationships</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="dashboard">
                <DashboardStats />
              </TabsContent>

              <TabsContent value="vocabulary">
                <VocabularySection />
              </TabsContent>

              <TabsContent value="practice">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle>Conjugation Practice</CardTitle>
                      <CardDescription>Practice verb conjugations in different tenses</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">0 of 3,388 Conjugation Cards Seen</span>
                        <Button size="sm">Start</Button>
                      </div>
                      <Progress value={0} className="h-2 mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle>Gender Practice</CardTitle>
                      <CardDescription>Master noun genders with interactive exercises</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">0 of 5,247 Gender Cards Seen</span>
                        <Button size="sm">Start</Button>
                      </div>
                      <Progress value={0} className="h-2 mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle>Plural Forms</CardTitle>
                      <CardDescription>Learn regular and irregular plural forms</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">0 of 7,907 Plural Cards Seen</span>
                        <Button size="sm">Start</Button>
                      </div>
                      <Progress value={0} className="h-2 mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle>Case Practice</CardTitle>
                      <CardDescription>Practice nominative, accusative, dative and genitive cases</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">0 of 4,125 Case Cards Seen</span>
                        <Button size="sm">Start</Button>
                      </div>
                      <Progress value={0} className="h-2 mt-2" />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="process">
                <TextProcessingSection />
              </TabsContent>

              <TabsContent value="saved-texts">
                <SavedTextsSection />
              </TabsContent>

              <TabsContent value="frequency">
                <FrequencyAnalysisSection />
              </TabsContent>

              <TabsContent value="relationships">
                <WordRelationshipsSection />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Stats Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle>My Level</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="flex justify-center mb-4">
                  <div className="bg-gray-200 rounded-full h-20 w-20 md:h-24 md:w-24 flex items-center justify-center text-2xl md:text-3xl font-bold text-teal-600">
                    {stats.currentLevel}
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress 
                    value={stats.progressToNextLevel} 
                    className="h-2 bg-gray-200 rounded-full"
                  />
                  <div className="flex justify-between text-xs md:text-sm">
                    <span>A1</span>
                    <span>A2</span>
                    <span>B1</span>
                    <span>B2</span>
                    <span>C1</span>
                    <span>C2</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle>Vocabulary Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Verbs</span>
                      <span className="text-sm text-gray-500">
                        {stats.verbs}/2500
                      </span>
                    </div>
                    <Progress 
                      value={(stats.verbs / 2500) * 100} 
                      className="h-2" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Nouns</span>
                      <span className="text-sm text-gray-500">
                        {stats.nouns}/3000
                      </span>
                    </div>
                    <Progress 
                      value={(stats.nouns / 3000) * 100} 
                      className="h-2" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Adjectives</span>
                      <span className="text-sm text-gray-500">
                        {stats.adjectives}/1500
                      </span>
                    </div>
                    <Progress 
                      value={(stats.adjectives / 1500) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
  <CardHeader className="p-4 md:p-6">
    <CardTitle className="flex justify-between items-center">
      <span>Word Frequency</span>
      <Button variant="link" className="p-0 h-auto text-sm" asChild>
        <Link href="#frequency">
          View all
        </Link>
      </Button>
    </CardTitle>
  </CardHeader>
  <CardContent className="p-4 md:p-6 pt-0">
    <div className="space-y-2">
      {[
        { 
          range: "50+ occurrences", 
          count: frequencyDistribution.range50Plus, 
          color: "bg-teal-600" 
        },
        { 
          range: "30-49 occurrences", 
          count: frequencyDistribution.range30to49, 
          color: "bg-teal-500" 
        },
        { 
          range: "20-29 occurrences", 
          count: frequencyDistribution.range20to29, 
          color: "bg-teal-400" 
        },
        { 
          range: "10-19 occurrences", 
          count: frequencyDistribution.range10to19, 
          color: "bg-teal-300" 
        },
        { 
          range: "5-9 occurrences", 
          count: frequencyDistribution.range5to9, 
          color: "bg-teal-200 text-teal-800" 
        },
        { 
          range: "1-4 occurrences", 
          count: frequencyDistribution.range1to4, 
          color: "bg-teal-100 text-teal-800" 
        },
      ].map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          <Badge
            className={`${item.color} ${
              item.color?.includes("teal-600") || item.color?.includes("teal-500") 
                ? "text-white" 
                : ""
            }`}
          >
            {item.range}
          </Badge>
          <span className="text-sm text-gray-500">{item.count} words</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
          </div>
        </div>
      </main>
    </div>
  )
}