"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { WordData } from "@/lib/types"

interface WordDetailModalProps {
  word: WordData | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onMarkAsPracticed?: (wordId: number) => void
}

export default function WordDetailModal({ word, isOpen, onOpenChange, onMarkAsPracticed }: WordDetailModalProps) {
  if (!word) return null

  const getFrequencyBadgeColor = (frequency?: number) => {
    if (!frequency) return "bg-gray-200 text-gray-800"
    if (frequency >= 50) return "bg-teal-600 text-white"
    if (frequency >= 30) return "bg-teal-500 text-white"
    if (frequency >= 20) return "bg-teal-400 text-white"
    if (frequency >= 10) return "bg-teal-300"
    if (frequency >= 5) return "bg-teal-200 text-teal-800"
    return "bg-gray-200 text-gray-800"
  }

  const handleMarkAsPracticed = () => {
    if (onMarkAsPracticed) {
      onMarkAsPracticed(word.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-start">
            <span>{word.text}</span>
            <Badge>{word.level}</Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="capitalize">{word.type.toLowerCase()}</span>
            {word.gender && (
              <>
                <span className="mx-1">•</span>
                <span className="capitalize">{word.gender}</span>
              </>
            )}
            {word.practiced && (
              <>
                <span className="mx-1">•</span>
                <Badge variant="outline" className="bg-green-50 border-green-200">
                  Practiced
                </Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Definition</h3>
            <p className="text-gray-700">{word.translation}</p>
          </div>

          {(word.additionalInfo || word.tense || word.case || word.conjugation || word.declension) && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Additional Information</h3>
              <div className="space-y-2">
                {word.tense && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tense:</span>
                    <span>{word.tense}</span>
                  </div>
                )}
                {word.case && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Case:</span>
                    <span>{word.case}</span>
                  </div>
                )}
                {word.conjugation && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Conjugation:</span>
                    <span>{word.conjugation}</span>
                  </div>
                )}
                {word.declension && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Declension:</span>
                    <span>{word.declension}</span>
                  </div>
                )}
                {word.additionalInfo?.frequency && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frequency:</span>
                    <Badge className={getFrequencyBadgeColor(word.additionalInfo.frequency)}>
                      {word.additionalInfo.frequency} occurrences
                    </Badge>
                  </div>
                )}
                {word.additionalInfo?.textsCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Appears in:</span>
                    <span>
                      {word.additionalInfo.textsCount} {word.additionalInfo.textsCount === 1 ? "text" : "texts"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {word.occurrences && word.occurrences.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Occurrences</h3>
              <div className="space-y-2">
                {word.occurrences.map((occurrence, index) => (
                  <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{occurrence.textTitle}</span>
                      <span className="text-sm text-gray-500">{occurrence.date}</span>
                    </div>
                    <p className="text-sm text-gray-700">{occurrence.sentence}</p>
                    <p className="text-sm text-gray-500 italic mt-1">{occurrence.translation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!word.practiced && onMarkAsPracticed && <Button onClick={handleMarkAsPracticed}>Mark as Practiced</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
