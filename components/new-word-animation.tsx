"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"

interface NewWordAnimationProps {
  word: string
  translation: string
  type: string
  level: string
  isVisible: boolean
  onComplete: () => void
}

export default function NewWordAnimation({
  word,
  translation,
  type,
  level,
  isVisible,
  onComplete,
}: NewWordAnimationProps) {
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isVisible) {
      // Reset progress when becoming visible
      setProgress(0)

      // Start progress animation
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 1
          if (newProgress >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            // Delay the onComplete to allow the animation to finish
            setTimeout(onComplete, 500)
            return 100
          }
          return newProgress
        })
      }, 30)
    } else {
      // Clear interval when not visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        className="fixed bottom-8 right-8 z-50 bg-white rounded-lg shadow-lg border border-teal-200 p-4 max-w-sm"
      >
        <div className="flex items-start gap-3">
          <div className="bg-teal-100 p-2 rounded-full">
            <CheckCircle className="h-6 w-6 text-teal-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-lg">New Word Added!</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">{word}</span>
                <span className="bg-teal-100 text-teal-800 text-xs px-2 py-0.5 rounded">{level}</span>
              </div>
              <p className="text-gray-500 text-sm capitalize">{type.toLowerCase()}</p>
              <p className="text-gray-600 text-sm italic">{translation}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="bg-teal-500 h-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
