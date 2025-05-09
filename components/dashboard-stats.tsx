"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { BookOpen, BookText, Brain, GraduationCap, Languages, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { log } from "console"

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
      dateAdded: string
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

export default function DashboardStats() {
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

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data")
        }

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
      <div className="space-y-6 flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-lg">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="mb-4">No data available. Start by processing some texts.</p>
              <Button asChild>
                <Link href="/process-text">Process Text</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { stats, frequencyDistribution } = dashboardData
  

  // Format date for activity items
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return "Today"
    } else if (diffDays === 1) {
      return "Yesterday"
    } else {
      return `${diffDays} days ago`
    }
  }

  // Group recent activity by type
  const groupedActivity = (stats.recentActivity || []).reduce(
    (acc, item) => {
      const date = formatDate(item.dateAdded);
      const key = `${item.type}_${date}_${item.savedText?.title || 'untitled'}`;
  
      if (acc[key]) {
        acc[key].count++;
      } else {
        acc[key] = {
          type: item.type,
          date,
          count: 1,
          level: item.level || 'unknown',
          textTitle: item.savedText?.title || 'Untitled',
        };
      }
  
      return acc;
    },
    {} as Record<string, { type: string; date: string; count: number; level: string; textTitle: string }>
  );

  const activityItems = Object.values(groupedActivity).sort((a, b) => {
    const dateOrder = { Today: 0, Yesterday: 1 }
    const aOrder = dateOrder[a.date as keyof typeof dateOrder] ?? 2
    const bOrder = dateOrder[b.date as keyof typeof dateOrder] ?? 2
    return aOrder - bOrder
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-500" />
              Total Vocabulary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalWords}</div>
            <p className="text-sm text-gray-500 mt-1">Words in your collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-teal-500" />
              Current Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.currentLevel}</div>
            <p className="text-sm text-gray-500 mt-1">
              {stats.progressToNextLevel}% to{" "}
              {stats.currentLevel === "A1"
                ? "A2"
                : stats.currentLevel === "A2"
                  ? "B1"
                  : stats.currentLevel === "B1"
                    ? "B2"
                    : "C1"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-teal-500" />
              Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.streak} {stats.streak === 1 ? "day" : "days"}
            </div>
            <p className="text-sm text-gray-500 mt-1">{stats.streak > 0 ? "Keep it up!" : "Start learning today!"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your vocabulary learning progress</CardDescription>
          </CardHeader>
          <CardContent>
            {activityItems.length > 0 ? (
              <div className="space-y-4">
                {activityItems.slice(0, 3).map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="bg-teal-100 p-3 rounded-full">
                      {activity.type.toLowerCase() === "verb" ? (
                        <Languages className="h-5 w-5 text-teal-600" />
                      ) : (
                        <BookText className="h-5 w-5 text-teal-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium">
                          Added {activity.count} new {activity.type.toLowerCase()}
                          {activity.count !== 1 ? "s" : ""}
                        </h4>
                        <span className="text-sm text-gray-500">{activity.date}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        From {activity.level} level • {activity.textTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No recent activity. Start by processing some texts.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Level Distribution</CardTitle>
            <CardDescription>Your vocabulary by CEFR level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">A1</span>
                  <span className="text-sm text-gray-500">{stats.levelA1}/500</span>
                </div>
                <Progress value={Math.min((stats.levelA1 / 500) * 100, 100)} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">A2</span>
                  <span className="text-sm text-gray-500">{stats.levelA2}/600</span>
                </div>
                <Progress value={Math.min((stats.levelA2 / 600) * 100, 100)} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">B1</span>
                  <span className="text-sm text-gray-500">{stats.levelB1}/800</span>
                </div>
                <Progress value={Math.min((stats.levelB1 / 800) * 100, 100)} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">B2</span>
                  <span className="text-sm text-gray-500">{stats.levelB2}/1000</span>
                </div>
                <Progress value={Math.min((stats.levelB2 / 1000) * 100, 100)} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">C1</span>
                  <span className="text-sm text-gray-500">{stats.levelC1}/1200</span>
                </div>
                <Progress value={Math.min((stats.levelC1 / 1200) * 100, 100)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stories</CardTitle>
            <CardDescription>View structured learning program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">0 of 586 Story Decks Finished</span>
              <Button size="sm" asChild>
                <Link href="/stories">Start</Link>
              </Button>
            </div>
            <Progress value={0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vocabulary Trainer</CardTitle>
            <CardDescription>Create custom vocab trainer decks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {stats.practicedWords} of {stats.totalWords} Words Practiced
              </span>
              <Button size="sm" asChild>
                <Link href="/practice">Start</Link>
              </Button>
            </div>
            <Progress
              value={stats.totalWords > 0 ? (stats.practicedWords / stats.totalWords) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
