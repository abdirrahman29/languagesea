import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Brain, 
  FileText, 
  BarChart3, 
  Lightbulb, 
  Target, 
  Zap, 
  Users,
  ChevronRight,
  Check,
  Globe,
  Sparkles,
  MessageCircle,
  Coffee,
  Heart
} from "lucide-react"

export default function GermanLearningLanding() {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: <FileText className="h-8 w-8" />,
      title: "AI Text Analysis That Actually Gets It",
      description: "Upload any German text and watch our AI work its magic. It doesn't just translate—it understands context, finds grammar patterns, and tells you exactly what level each word is.",
      details: "We use Google's Gemini AI because honestly? It's the best at understanding German nuances. Every word gets analyzed for difficulty, grammar role, and how it fits into your learning journey."
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "Smart Vocabulary That Sticks",
      description: "Finally, a system that tracks your German words the way they actually work—with all their crazy conjugations, cases, and genders included.",
      details: "We know German is complicated (trust us, we've been there). That's why we track verbs with their full conjugation tables, nouns with their plurals and cases, and even those tricky adjective endings."
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "AI Practice Sessions (This is New!)",
      description: "Here's where it gets exciting—AI generates personalized German stories, articles, and conversations based on words you need to practice. Click on colored words to quiz yourself!",
      details: "Our AI creates content just for you using words you're struggling with. Red words are new, orange means you're learning, yellow is familiar, and green means you've mastered it. It's like having a personal German tutor who never gets tired."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Progress Tracking That Makes Sense",
      description: "See exactly how you're improving with charts that don't require a PhD to understand. Track your vocabulary across CEFR levels and celebrate your wins.",
      details: "We show you the numbers that matter: how many A1 vs B2 words you know, which topics you're crushing, and where you might need a coffee break and some extra practice."
    }
  ]

  const stats = [
    { label: "Vocabulary Words", value: "15,000+", icon: <BookOpen className="h-5 w-5" /> },
    { label: "Grammar Patterns", value: "500+", icon: <Brain className="h-5 w-5" /> },
    { label: "Practice Themes", value: "20+", icon: <Globe className="h-5 w-5" /> },
    { label: "CEFR Levels", value: "A1-C2", icon: <Target className="h-5 w-5" /> }
  ]

  const benefits = [
    "Upload any German text (news, books, your favorite blogs)",
    "Get instant AI analysis that actually makes sense", 
    "Practice with AI-generated stories tailored to YOU",
    "Track progress across all CEFR levels (A1 to C2)",
    "Interactive word practice with spaced repetition",
    "Organize your texts by themes you care about"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 to-blue-600/10" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Now with AI Practice Sessions!
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-6">
              German Learning That
              <br />
              Actually Works
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Tired of boring German textbooks? We get it. Upload any text you love, and our AI creates 
              personalized practice sessions that make learning feel like reading your favorite stories.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8">
                Try It Free (Seriously, No Catch!)
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
                <Coffee className="mr-2 h-4 w-4" />
                Show Me How
              </Button>
            </div>

            <p className="text-sm text-gray-500 mb-12">
              Join 2,000+ German learners who've ditched the boring stuff ✨
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-2 text-teal-600">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Here's What Makes Us Different
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We built this because we were frustrated German learners too. Here's what we wish existed when we started:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            <div className="space-y-4">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all duration-300 ${
                    activeFeature === index 
                      ? 'border-teal-500 shadow-lg bg-teal-50' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        activeFeature === index 
                          ? 'bg-teal-600 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600">
                          {feature.description}
                        </p>
                        {index === 2 && (
                          <Badge className="mt-2 bg-orange-100 text-orange-800">
                            ✨ Brand New Feature!
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="md:pl-8">
              <Card className="border-0 shadow-2xl">
                <CardContent className="p-8">
                  <div className="text-teal-600 mb-4">
                    {features[activeFeature].icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    {features[activeFeature].title}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {features[activeFeature].details}
                  </p>
                  
                  {/* Demo visualizations */}
                  {activeFeature === 0 && (
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded border-l-4 border-teal-500">
                        <div className="text-sm text-gray-600">You upload:</div>
                        <div className="font-medium">"Der kleine Hund läuft schnell durch den großen Park."</div>
                      </div>
                      <div className="bg-teal-50 p-3 rounded">
                        <div className="text-sm text-teal-600 mb-2">We analyze:</div>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium text-red-600">kleine</span> - A1 Adjective (needs case practice)</div>
                          <div><span className="font-medium text-orange-600">läuft</span> - A2 Verb (laufen conjugation)</div>
                          <div><span className="font-medium text-green-600">der</span> - A1 Article (you know this!)</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeFeature === 1 && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="text-sm font-medium mb-2">Word: "laufen" 🏃‍♂️</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>ich</strong> laufe</div>
                          <div><strong>wir</strong> laufen</div>
                          <div><strong>du</strong> läufst</div>
                          <div><strong>sie</strong> laufen</div>
                        </div>
                        <div className="text-xs text-blue-600 mt-2">+ Past, Perfect, and all the tricky stuff!</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 p-3 rounded text-center">
                          <div className="text-2xl font-bold text-green-600">4,231</div>
                          <div className="text-sm text-gray-600">Nouns tracked</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded text-center">
                          <div className="text-2xl font-bold text-purple-600">2,847</div>
                          <div className="text-sm text-gray-600">Verbs conjugated</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeFeature === 2 && (
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded border border-orange-200">
                        <div className="text-sm font-medium text-orange-700 mb-2">🎯 AI-Generated Story for You:</div>
                        <div className="text-sm text-gray-700 mb-3">
                          "Lisa geht in ihr <span className="bg-red-200 px-1 rounded text-red-800 cursor-pointer">Lieblings</span><span className="bg-orange-200 px-1 rounded text-orange-800 cursor-pointer">restaurant</span>. 
                          Der <span className="bg-yellow-200 px-1 rounded text-yellow-800 cursor-pointer">Kellner</span> ist sehr freundlich..."
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded">🔴 New words to learn</span>
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">🟢 Words you've mastered</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="text-sm font-medium text-blue-700">Click any colored word to quiz yourself!</div>
                        <div className="text-xs text-blue-600 mt-1">Stories adapt based on words you need to practice</div>
                      </div>
                    </div>
                  )}
                  
                  {activeFeature === 3 && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>A1 Words (Basics) 🌱</span>
                          <span>234/500</span>
                        </div>
                        <Progress value={47} className="h-2" />
                        <div className="text-xs text-gray-500">You're crushing the basics!</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>B1 Words (Getting Real) 🚀</span>
                          <span>89/300</span>
                        </div>
                        <Progress value={30} className="h-2" />
                        <div className="text-xs text-gray-500">Nice progress on intermediate stuff</div>
                      </div>
                      <div className="bg-teal-50 p-3 rounded border border-teal-200">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-teal-600" />
                          <div className="text-sm font-medium text-teal-700">This week's wins:</div>
                        </div>
                        <div className="text-xs text-teal-600 mt-1">+12 new words mastered • 87% quiz accuracy</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Why German Learners Love This
              </h2>
              <p className="text-xl text-gray-600">
                We asked 500+ German learners what they wanted. Here's what we built:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-teal-600" />
                  What You Actually Get
                </h3>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="bg-teal-100 p-1 rounded-full mt-0.5">
                        <Check className="h-4 w-4 text-teal-600" />
                      </div>
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-800">
                    <strong>Real talk:</strong> We know learning German is hard. Der, die, das? Confusing cases? 
                    We've been there. That's exactly why we built tools that make it less painful and way more fun.
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="h-6 w-6 text-yellow-500" />
                      <h4 className="text-lg font-semibold">No More Boring Flashcards</h4>
                    </div>
                    <p className="text-gray-600">
                      Instead of memorizing isolated words, you practice them in real stories and contexts. 
                      It's like reading a good book, but you're actually learning!
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="h-6 w-6 text-blue-500" />
                      <h4 className="text-lg font-semibold">Learns How YOU Learn</h4>
                    </div>
                    <p className="text-gray-600">
                      Struggling with adjective endings? Our AI notices and creates more practice for that. 
                      Great at vocabulary but need help with cases? We adjust automatically.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Lightbulb className="h-6 w-6 text-orange-500" />
                      <h4 className="text-lg font-semibold">Actually Shows Your Progress</h4>
                    </div>
                    <p className="text-gray-600">
                      See exactly how many A1, A2, B1+ words you know. Watch words change from red 
                      (new) to green (mastered). It's satisfying, we promise.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 md:py-24 bg-gradient-to-r from-teal-600 to-blue-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Actually Enjoy Learning German?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join 2,000+ learners who've discovered that German doesn't have to be a struggle. 
              Your first practice session is on us—no credit card, no BS.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-gray-50 px-8">
                <Heart className="mr-2 h-5 w-5" />
                Start Learning Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Coffee className="mr-2 h-4 w-4" />
                See It In Action
              </Button>
            </div>
            <p className="text-sm mt-6 opacity-75">
              Seriously, no catch. We just want to help you learn German without the headaches.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}