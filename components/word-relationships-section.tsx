"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WordCollocationsSection from "@/components/word-collocations-section"
import ThemeCategoriesSection from "@/components/theme-categories-section"
import ThemeManagementSection from "@/components/theme-management-section"

export default function WordRelationshipsSection() {
  const [activeTab, setActiveTab] = useState("themes")

  return (
    <div className="space-y-4 md:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex min-w-full md:grid md:grid-cols-2 mb-4 md:mb-6">
            <TabsTrigger value="themes">Theme Categories</TabsTrigger>
            <TabsTrigger value="collocations">Word Collocations</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="themes">
          <ThemeManagementSection />
        </TabsContent>

        <TabsContent value="collocations">
          <WordCollocationsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
