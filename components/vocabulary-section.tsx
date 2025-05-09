"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import VerbsSection from "@/components/verbs-section"
import NounsSection from "@/components/nouns-section"
import AdjectivesSection from "@/components/adjectives-section"

export default function VocabularySection() {
  const [activeTab, setActiveTab] = useState("verbs")

  return (
    <div className="space-y-4 md:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex min-w-full md:grid md:grid-cols-3 mb-4 md:mb-6">
            <TabsTrigger value="verbs">Verbs</TabsTrigger>
            <TabsTrigger value="nouns">Nouns</TabsTrigger>
            <TabsTrigger value="adjectives">Adjectives</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="verbs">
          <VerbsSection />
        </TabsContent>

        <TabsContent value="nouns">
          <NounsSection />
        </TabsContent>

        <TabsContent value="adjectives">
          <AdjectivesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
