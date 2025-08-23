// Quiz popup component
"use client"

import { useState, useEffect } from "react"
import { X, Check, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

interface QuizModalProps {
  isOpen: boolean
  onClose: () => void
  word: {
    german: string
    baseForm: string
    type: string
    context?: string
  }
  options: QuizOption[]
  onAnswer: (selectedOptionId: string, responseTime: number, difficultyRating?: 'easy' | 'hard') => void
  onDifficultyRating?: (rating: 'easy' | 'hard') => void
}

export default function QuizModal({
  isOpen,
  onClose,
  word,
  options,
  onAnswer,
  onDifficultyRating
}: QuizModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [responseTime, setResponseTime] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setStartTime(Date.now())
      setSelectedOption(null)
      setShowResult(false)
      setIsCorrect(false)
      setResponseTime(0)
    }
  }, [isOpen])

  const handleOptionSelect = (optionId: string) => {
    if (showResult) return
    
    const endTime = Date.now()
    const timeTaken = endTime - startTime
    setResponseTime(timeTaken)
    
    setSelectedOption(optionId)
    const selectedOptionData = options.find(opt => opt.id === optionId)
    const correct = selectedOptionData?.isCorrect || false
    setIsCorrect(correct)
    setShowResult(true)
    
  }

  const handleContinue = () => {
    // Calls onAnswer WITHOUT a difficulty rating.
    if (selectedOption) {
      onAnswer(selectedOption, responseTime)
    }
  }

  const handleDifficultyRating = (rating: 'easy' | 'hard') => {
    // Calls onAnswer WITH the selected difficulty rating.
    if (selectedOption) {
      onAnswer(selectedOption, responseTime, rating)
    }
  }

  if (!isOpen) return null

  const correctOption = options.find(opt => opt.isCorrect)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Word Quiz
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              What does <span className="font-medium text-blue-600">"{word.german}"</span> mean?
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Context */}
        {word.context && (
          <div className="px-6 py-4 bg-gray-50 border-b">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Context:</span> "{word.context}"
            </p>
          </div>
        )}

        {/* Options */}
        <div className="p-6">
          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = selectedOption === option.id
              const isCorrectOption = option.isCorrect
              
              let optionStyle = "p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300"
              
              if (!showResult) {
                optionStyle += " border-gray-200 hover:bg-blue-50"
              } else {
                if (isSelected && isCorrectOption) {
                  optionStyle += " border-green-500 bg-green-50"
                } else if (isSelected && !isCorrectOption) {
                  optionStyle += " border-red-500 bg-red-50"
                } else if (isCorrectOption) {
                  optionStyle += " border-green-500 bg-green-50"
                } else {
                  optionStyle += " border-gray-200 bg-gray-50"
                }
              }
              
              return (
                <div
                  key={option.id}
                  className={optionStyle}
                  onClick={() => handleOptionSelect(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">
                      {option.text}
                    </span>
                    {showResult && isSelected && (
                      <div className="ml-2">
                        {isCorrectOption ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <AlertCircle size={20} className="text-red-600" />
                        )}
                      </div>
                    )}
                    {showResult && !isSelected && isCorrectOption && (
                      <Check size={20} className="text-green-600 ml-2" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Result and Actions */}
        {showResult && (
          <div className="px-6 pb-6">
            {/* Result message */}
            <div className={cn(
              "p-4 rounded-lg mb-4",
              isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <Check size={20} className="text-green-600" />
                ) : (
                  <AlertCircle size={20} className="text-red-600" />
                )}
                <div>
                  <p className={cn(
                    "font-semibold",
                    isCorrect ? "text-green-800" : "text-red-800"
                  )}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </p>
                  {!isCorrect && correctOption && (
                    <p className="text-sm text-red-700 mt-1">
                      The correct answer is: <strong>{correctOption.text}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Response time */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
              <Clock size={16} />
              <span>Response time: {(responseTime / 1000).toFixed(1)}s</span>
            </div>

            {/* Difficulty rating (only for correct answers) */}
            {isCorrect && onDifficultyRating && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2 text-center">
                  How difficult was this word?
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => handleDifficultyRating('easy')}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    Easy
                  </button>
                  <button
                    onClick={() => handleDifficultyRating('hard')}
                    className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                  >
                    Hard
                  </button>
                </div>
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continue Reading
            </button>
          </div>
        )}
      </div>
    </div>
  )
}