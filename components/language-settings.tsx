// components/language-settings.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Globe, Volume2, Target, Settings, Save, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },  // Add this line
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' }
]

const NATIVE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' }
]

const DIFFICULTY_LEVELS = [
  { value: 'auto', label: 'Auto-detect', description: 'Based on your progress' },
  { value: 'easy', label: 'Easy', description: 'Simple words and structures' },
  { value: 'medium', label: 'Medium', description: 'Balanced difficulty' },
  { value: 'hard', label: 'Hard', description: 'Complex vocabulary and grammar' }
]

interface LanguageSettings {
  learningLanguage: string
  nativeLanguage: string
  languageCode: string
  translationCode: string
  showTranslations: boolean
  autoPlayAudio: boolean
  preferredVoice: string
  practiceReminders: boolean
  dailyGoal: number
  preferredDifficulty: string
  includeConjugations: boolean
  includeCases: boolean
  includeGender: boolean
}

export default function LanguageSettings() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<LanguageSettings>({
    learningLanguage: 'German',
    nativeLanguage: 'English',
    languageCode: 'de',
    translationCode: 'en',
    showTranslations: true,
    autoPlayAudio: false,
    preferredVoice: '',
    practiceReminders: true,
    dailyGoal: 20,
    preferredDifficulty: 'auto',
    includeConjugations: true,
    includeCases: true,
    includeGender: true
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!session?.user?.id) return
      
      try {
        setIsLoading(true)
        const response = await fetch('/api/user/language-settings')
        
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setSettings(data.settings)
          }
        }
      } catch (error) {
        console.error('Failed to load language settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSettings()
  }, [session?.user?.id])

  const updateSetting = (key: keyof LanguageSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleLanguageChange = (languageCode: string, isLearning: boolean) => {
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode)
    if (!language) return
    
    if (isLearning) {
      updateSetting('learningLanguage', language.name)
      updateSetting('languageCode', language.code)
    } else {
      const nativeLanguage = NATIVE_LANGUAGES.find(lang => lang.code === languageCode)
      if (nativeLanguage) {
        updateSetting('nativeLanguage', nativeLanguage.name)
        updateSetting('translationCode', nativeLanguage.code)
      }
    }
  }

  const saveSettings = async () => {
    if (!session?.user?.id || !hasChanges) return
    
    try {
      setIsSaving(true)
      const response = await fetch('/api/user/language-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        setHasChanges(false)
        toast.success('Settings saved successfully!')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings({
      learningLanguage: 'German',
      nativeLanguage: 'English',
      languageCode: 'de',
      translationCode: 'en',
      showTranslations: true,
      autoPlayAudio: false,
      preferredVoice: '',
      practiceReminders: true,
      dailyGoal: 20,
      preferredDifficulty: 'auto',
      includeConjugations: true,
      includeCases: true,
      includeGender: true
    })
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Language Settings</h1>
          <p className="text-gray-600">Customize your language learning experience</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Reset
          </Button>
          <Button
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
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
      </div>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={20} />
            Languages
          </CardTitle>
          <CardDescription>
            Choose the language you're learning and your native language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Learning Language</Label>
              <Select
                value={settings.languageCode}
                onValueChange={(value) => handleLanguageChange(value, true)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Native Language</Label>
              <Select
                value={settings.translationCode}
                onValueChange={(value) => handleLanguageChange(value, false)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NATIVE_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Practice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} />
            Practice Preferences
          </CardTitle>
          <CardDescription>
            Customize how you practice and learn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Translations</Label>
                <p className="text-sm text-gray-500">Display translations during practice</p>
              </div>
              <Switch
                checked={settings.showTranslations}
                onCheckedChange={(checked) => updateSetting('showTranslations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Practice Reminders</Label>
                <p className="text-sm text-gray-500">Get daily practice notifications</p>
              </div>
              <Switch
                checked={settings.practiceReminders}
                onCheckedChange={(checked) => updateSetting('practiceReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-play Audio</Label>
                <p className="text-sm text-gray-500">Automatically play pronunciation</p>
              </div>
              <Switch
                checked={settings.autoPlayAudio}
                onCheckedChange={(checked) => updateSetting('autoPlayAudio', checked)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Daily Goal (words per day)</Label>
            <div className="px-4">
              <Slider
                value={[settings.dailyGoal]}
                onValueChange={(value) => updateSetting('dailyGoal', value[0])}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>5</span>
                <span className="font-medium">{settings.dailyGoal} words</span>
                <span>100</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Difficulty</Label>
            <Select
              value={settings.preferredDifficulty}
              onValueChange={(value) => updateSetting('preferredDifficulty', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-gray-500">{level.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grammar Features (Language-specific) */}
      {settings.languageCode === 'de' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={20} />
              German Grammar Features
            </CardTitle>
            <CardDescription>
              Enable or disable specific German grammar features in practice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Verb Conjugations</Label>
                <p className="text-sm text-gray-500">Practice verb forms and tenses</p>
              </div>
              <Switch
                checked={settings.includeConjugations}
                onCheckedChange={(checked) => updateSetting('includeConjugations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Include Noun Cases</Label>
                <p className="text-sm text-gray-500">Practice Nominativ, Akkusativ, Dativ, Genitiv</p>
              </div>
              <Switch
                checked={settings.includeCases}
                onCheckedChange={(checked) => updateSetting('includeCases', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Include Gender Practice</Label>
                <p className="text-sm text-gray-500">Practice der, die, das articles</p>
              </div>
              <Switch
                checked={settings.includeGender}
                onCheckedChange={(checked) => updateSetting('includeGender', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Turkish Grammar Features */}
      {settings.languageCode === 'tr' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={20} />
              Turkish Grammar Features
            </CardTitle>
            <CardDescription>
              Enable or disable specific Turkish grammar features in practice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Verb Conjugations</Label>
                <p className="text-sm text-gray-500">Practice verb forms, tenses, and personal endings</p>
              </div>
              <Switch
                checked={settings.includeConjugations}
                onCheckedChange={(checked) => updateSetting('includeConjugations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Include Case Suffixes</Label>
                <p className="text-sm text-gray-500">Practice noun cases and possessive forms</p>
              </div>
              <Switch
                checked={settings.includeCases}
                onCheckedChange={(checked) => updateSetting('includeCases', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changes indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">You have unsaved changes</p>
        </div>
      )}
    </div>
  )
}