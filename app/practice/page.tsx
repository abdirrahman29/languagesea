// Practice page
import { Suspense } from "react"
import { Metadata } from "next"
import PracticeSession from "@/components/practice/practice-session"
import { BookOpen, Sparkles, Target, Brain } from "lucide-react"

export const metadata: Metadata = {
  title: "German Practice | AI-Powered Vocabulary Learning",
  description: "Practice German vocabulary with AI-generated content tailored to your learning level. Interactive stories, articles, and conversations with spaced repetition.",
}

function PracticeLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Settings skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-10 bg-gray-200 rounded w-full mt-4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain size={24} className="text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Practice Session
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Practice German vocabulary with AI-generated content that adapts to your learning level. 
              Click on highlighted words to test your knowledge.
            </p>
            
            {/* Feature highlights */}
            <div className="flex items-center justify-center gap-8 mt-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-500" />
                <span>AI-Generated Content</span>
              </div>
              <div className="flex items-center gap-2">
                <Target size={16} className="text-green-500" />
                <span>Personalized Difficulty</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-blue-500" />
                <span>Interactive Learning</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Practice Session */}
      <Suspense fallback={<PracticeLoading />}>
        <PracticeSession />
      </Suspense>

      {/* Help Section */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Choose Theme</h3>
              <p className="text-sm text-gray-600">
                Select a topic that interests you from our curated themes
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Generates</h3>
              <p className="text-sm text-gray-600">
                Content tailored to your level with target vocabulary words
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-orange-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Practice</h3>
              <p className="text-sm text-gray-600">
                Click colored words to test your knowledge with quizzes
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-600">4</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Master</h3>
              <p className="text-sm text-gray-600">
                Track progress as words change from red to green
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Color System</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-700">🔴 Unknown (new words)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">🟠 Learning (1-2 times)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700">🟡 Familiar (3-5 times)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">🟢 Mastered (6+ times)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}