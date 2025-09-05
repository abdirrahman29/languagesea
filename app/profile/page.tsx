// app/profile/page.tsx - User Profile and Settings Page
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  User, 
  Settings, 
  Globe, 
  BarChart3, 
  Trophy, 
  Calendar,
  Clock,
  Target,
  BookOpen,
  Save,
  RefreshCw,
  Camera
} from "lucide-react"
import { toast } from "sonner"
import LanguageSettings from "@/components/language-settings"

interface UserStats {
  totalWords: number
  verbs: number
  nouns: number
  adjectives: number
  adverbs: number
  textsProcessed: number
  practiceStreak: number
  totalPracticeTime: number
  currentLevel: string
  progressToNextLevel: number
}

interface ProfileData {
  name: string
  email: string
  joinedDate: string
  stats: UserStats
  recentActivity: Array<{
    type: string
    description: string
    date: string
  }>
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: ""
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/auth/signin")
    }
  }, [status])

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!session?.user?.id) return
      
      try {
        setIsLoading(true)
        const response = await fetch('/api/user/profile')
        
        if (response.ok) {
          const data = await response.json()
          setProfileData(data.profile)
          setProfileForm({
            name: data.profile.name || "",
            email: data.profile.email || ""
          })
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
        toast.error('Failed to load profile data')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProfileData()
  }, [session?.user?.id])

  const handleProfileUpdate = async () => {
    if (!session?.user?.id) return
    
    try {
      setIsSaving(true)
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfileData(prev => prev ? { ...prev, ...data.profile } : null)
        
        // Update session data
        await update({
          ...session,
          user: {
            ...session.user,
            name: profileForm.name
          }
        })
        
        toast.success('Profile updated successfully!')
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!session || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Failed to load profile data</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
          <p className="text-gray-600">Manage your account and learning preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User size={16} />
              Profile
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe size={16} />
              Language
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 size={16} />
              Stats
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings size={16} />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Info */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={session.user?.image || ""} />
                        <AvatarFallback className="text-lg">
                          {getInitials(profileData.name || session.user?.name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Camera size={16} />
                          Change Photo
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          JPG, PNG up to 2MB
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({
                            ...prev,
                            name: e.target.value
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleProfileUpdate}
                        disabled={isSaving}
                        className="flex items-center gap-2"
                      >
                        {isSaving ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Learning Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {profileData.stats.currentLevel}
                      </div>
                      <p className="text-sm text-gray-600">Current Level</p>
                      <Progress 
                        value={profileData.stats.progressToNextLevel} 
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-green-600">
                          {profileData.stats.practiceStreak}
                        </div>
                        <p className="text-xs text-gray-600">Day Streak</p>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-purple-600">
                          {profileData.stats.totalWords}
                        </div>
                        <p className="text-xs text-gray-600">Words Learned</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-gray-500" />
                      <span>Joined {formatDate(profileData.joinedDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} className="text-gray-500" />
                      <span>{formatTime(profileData.stats.totalPracticeTime)} practiced</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen size={16} className="text-gray-500" />
                      <span>{profileData.stats.textsProcessed} texts processed</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Language Settings Tab */}
          <TabsContent value="language">
            <LanguageSettings />
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{profileData.stats.verbs}</p>
                      <p className="text-sm text-gray-600">Verbs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BookOpen size={24} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{profileData.stats.nouns}</p>
                      <p className="text-sm text-gray-600">Nouns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Trophy size={24} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{profileData.stats.adjectives}</p>
                      <p className="text-sm text-gray-600">Adjectives</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{profileData.stats.adverbs}</p>
                      <p className="text-sm text-gray-600">Adverbs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest learning activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profileData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BookOpen size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-gray-600">{formatDate(activity.date)}</p>
                      </div>
                      <Badge variant="outline">{activity.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Additional account settings will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}