// Spaced Repetition Algorithm for optimal word review scheduling
// Based on SM-2 algorithm with German language learning adaptations

export interface ReviewCard {
    baseForm: string
    type: 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB'
    easeFactor: number // How easy the word is (1.3 - 2.5)
    interval: number // Days until next review
    repetitions: number // Number of successful reviews
    nextReview: Date
    lastReview?: Date
    quality: number // Last response quality (0-5)
  }
  
  export class SpacedRepetitionEngine {
    private static readonly MIN_EASE_FACTOR = 1.3
    private static readonly MAX_EASE_FACTOR = 2.5
    private static readonly DEFAULT_EASE_FACTOR = 2.5
  
    /**
     * Calculate next review date based on SM-2 algorithm
     * @param card Current review card
     * @param quality Response quality (0=wrong, 3=hard, 4=good, 5=easy)
     * @returns Updated card with new schedule
     */
    static updateCard(card: ReviewCard, quality: number): ReviewCard {
      const updatedCard = { ...card }
      updatedCard.quality = quality
      updatedCard.lastReview = new Date()
  
      if (quality >= 3) {
        // Correct response
        if (updatedCard.repetitions === 0) {
          updatedCard.interval = 1
        } else if (updatedCard.repetitions === 1) {
          updatedCard.interval = 6
        } else {
          updatedCard.interval = Math.round(
            updatedCard.interval * updatedCard.easeFactor
          )
        }
        updatedCard.repetitions += 1
      } else {
        // Incorrect response - reset repetitions but keep some progress
        updatedCard.repetitions = 0
        updatedCard.interval = 1
      }
  
      // Update ease factor
      updatedCard.easeFactor = Math.max(
        SpacedRepetitionEngine.MIN_EASE_FACTOR,
        updatedCard.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      )
  
      // Set next review date
      updatedCard.nextReview = new Date()
      updatedCard.nextReview.setDate(
        updatedCard.nextReview.getDate() + updatedCard.interval
      )
  
      return updatedCard
    }
  
    /**
     * Create initial review card for a new word
     */
    static createCard(
      baseForm: string,
      type: ReviewCard['type'],
      initialDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
    ): ReviewCard {
      const easeFactorMap = {
        easy: 2.5,
        medium: 2.2,
        hard: 1.8
      }
  
      return {
        baseForm,
        type,
        easeFactor: easeFactorMap[initialDifficulty],
        interval: 1,
        repetitions: 0,
        nextReview: new Date(), // Due immediately
        quality: 0
      }
    }
  
    /**
     * Get cards that are due for review
     */
    static getDueCards(cards: ReviewCard[]): ReviewCard[] {
      const now = new Date()
      return cards.filter(card => card.nextReview <= now)
    }
  
    /**
     * Sort cards by priority (most urgent first)
     */
    static sortByPriority(cards: ReviewCard[]): ReviewCard[] {
      const now = new Date()
      
      return cards.sort((a, b) => {
        // Overdue cards first
        const aOverdue = Math.max(0, now.getTime() - a.nextReview.getTime())
        const bOverdue = Math.max(0, now.getTime() - b.nextReview.getTime())
        
        if (aOverdue !== bOverdue) {
          return bOverdue - aOverdue // Most overdue first
        }
  
        // Then by repetitions (newer cards first)
        if (a.repetitions !== b.repetitions) {
          return a.repetitions - b.repetitions
        }
  
        // Finally by ease factor (harder cards first)
        return a.easeFactor - b.easeFactor
      })
    }
  
    /**
     * Convert quality response to SM-2 scale
     * Based on user interaction patterns in German learning
     */
    static convertResponseToQuality(
      isCorrect: boolean,
      responseTime: number, // milliseconds
      difficultyRating?: 'easy' | 'hard'
    ): number {
      if (!isCorrect) {
        return responseTime < 3000 ? 1 : 0 // Quick wrong vs slow wrong
      }
  
      // Correct responses
      if (difficultyRating === 'easy') return 5
      if (difficultyRating === 'hard') return 3
      
      // Based on response time for "good" responses
      if (responseTime < 2000) return 5 // Very quick
      if (responseTime < 5000) return 4 // Normal
      return 3 // Slow but correct
    }
  
    /**
     * Calculate word mastery percentage
     */
    static calculateMastery(card: ReviewCard): number {
      const repetitionScore = Math.min(card.repetitions * 20, 60) // Max 60% from repetitions
      const easeScore = ((card.easeFactor - this.MIN_EASE_FACTOR) / 
                        (this.MAX_EASE_FACTOR - this.MIN_EASE_FACTOR)) * 25 // Max 25% from ease
      const intervalScore = Math.min(card.interval / 30, 1) * 15 // Max 15% from interval
      
      return Math.min(100, repetitionScore + easeScore + intervalScore)
    }
  
    /**
     * Get learning statistics for a set of cards
     */
    static getStats(cards: ReviewCard[]): {
      totalCards: number
      dueToday: number
      mastered: number // >80% mastery
      learning: number // 20-80% mastery  
      new: number // <20% mastery
      averageMastery: number
    } {
      const now = new Date()
      const dueToday = cards.filter(card => card.nextReview <= now).length
      
      const masteryLevels = cards.map(card => this.calculateMastery(card))
      const mastered = masteryLevels.filter(m => m >= 80).length
      const learning = masteryLevels.filter(m => m >= 20 && m < 80).length
      const newCards = masteryLevels.filter(m => m < 20).length
      
      const averageMastery = masteryLevels.reduce((sum, m) => sum + m, 0) / cards.length || 0
  
      return {
        totalCards: cards.length,
        dueToday,
        mastered,
        learning,
        new: newCards,
        averageMastery: Math.round(averageMastery)
      }
    }
  
    /**
     * Suggest optimal daily review count based on performance
     */
    static suggestDailyReview(
      cards: ReviewCard[],
      userPerformance: { averageAccuracy: number; averageSessionTime: number }
    ): number {
      const stats = this.getStats(cards)
      const baseReviewCount = Math.min(stats.dueToday, 20) // Cap at 20
      
      // Adjust based on accuracy
      let adjustment = 0
      if (userPerformance.averageAccuracy > 0.85) {
        adjustment = 5 // Can handle more
      } else if (userPerformance.averageAccuracy < 0.65) {
        adjustment = -5 // Reduce load
      }
  
      // Adjust based on session time
      if (userPerformance.averageSessionTime > 15 * 60 * 1000) { // >15 minutes
        adjustment -= 3 // Reduce if sessions too long
      }
  
      return Math.max(5, Math.min(25, baseReviewCount + adjustment))
    }
  
    /**
     * German-specific difficulty adjustments
     */
    static getGermanWordDifficulty(
      baseForm: string,
      type: ReviewCard['type']
    ): 'easy' | 'medium' | 'hard' {
      // German-specific patterns that are typically harder
      const hardPatterns = [
        /^(ge|be|ver|er|zer|ent|emp|miss)/, // Complex prefixes
        /(tion|heit|keit|ung|schaft)$/, // Abstract noun endings
        /ä|ö|ü/, // Umlauts
        /ß/, // Eszett
        /^(der|die|das)\s/, // Articles (for compound nouns)
      ]
  
      const isHard = hardPatterns.some(pattern => pattern.test(baseForm.toLowerCase()))
      
      // Type-specific difficulty
      if (type === 'VERB') {
        // Irregular verbs are typically harder
        const irregularVerbs = ['sein', 'haben', 'werden', 'gehen', 'kommen', 'sehen']
        if (irregularVerbs.includes(baseForm.toLowerCase())) {
          return 'hard'
        }
      }
  
      if (type === 'NOUN') {
        // Compound nouns and gendered nouns can be tricky
        if (baseForm.length > 10 || isHard) {
          return 'hard'
        }
      }
  
      if (type === 'ADJ') {
        // Adjectives with comparison forms
        if (baseForm.includes('er') || baseForm.includes('est')) {
          return 'medium'
        }
      }
  
      return isHard ? 'hard' : 'easy'
    }
  }