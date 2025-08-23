// Enhanced translator.ts - Added content generation method
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Helper function to extract JSON from markdown code blocks
function extractJsonFromResponse(text: string): string {
  console.log("Raw Gemini response:", text)
  
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    console.log("Extracted JSON from code blocks:", jsonMatch[1])
    return jsonMatch[1].trim()
  }
  
  // If no code blocks, return the text as-is
  console.log("No code blocks found, using raw text")
  return text.trim()
}

export function createTranslator() {
  return {
    // NEW: Dedicated content generation method
    generateContent: async (prompt: string) => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        
        console.log("Generating content with prompt:", prompt.substring(0, 100) + "...")
        
        const result = await model.generateContent(prompt)
        const response = await result.response
        const generatedText = response.text().trim()
        
        console.log("Generated content length:", generatedText.length)
        console.log("Generated content preview:", generatedText.substring(0, 200) + "...")
        
        return generatedText
      } catch (error) {
        console.error("Error generating content with Gemini:", error)
        throw new Error(`Failed to generate content: ${error}`)
      }
    },

    translate: async (text: string, options: { from: string; to: string }, context?: string) => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        
        let prompt: string
        
        if (context) {
          // Context-aware translation
          prompt = `Translate the German word "${text}" to English considering this context: "${context}". 
          Provide only the most appropriate English translation based on the context. 
          Do not include explanations, just the translation.`
        } else {
          // Simple translation
          prompt = `Translate this German text to English: "${text}". 
          Provide only the translation, no explanations.`
        }

        const result = await model.generateContent(prompt)
        const response = await result.response
        const translation = response.text().trim()
        
        return translation
      } catch (error) {
        console.error("Error translating with Gemini:", error)
        return `[Translation of: ${text}]`
      }
    },

    // Method to get verb conjugations
    getVerbConjugations: async (baseForm: string) => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        
        const prompt = `Provide complete conjugation for the German verb "${baseForm}".

Please provide a JSON response with the following structure (return ONLY the JSON, no markdown formatting):
{
  "baseForm": "${baseForm}",
  "conjugations": {
    "present": {
      "indicative": {
        "SG": {
          "1": { "form": "ich form", "person": "1" },
          "2": { "form": "du form", "person": "2" },
          "3": { "form": "er/sie/es form", "person": "3" }
        },
        "PL": {
          "1": { "form": "wir form", "person": "1" },
          "2": { "form": "ihr form", "person": "2" },
          "3": { "form": "sie/Sie form", "person": "3" }
        }
      },
      "subjunctive": {
        "SG": {
          "1": { "form": "ich form", "person": "1" },
          "2": { "form": "du form", "person": "2" },
          "3": { "form": "er/sie/es form", "person": "3" }
        },
        "PL": {
          "1": { "form": "wir form", "person": "1" },
          "2": { "form": "ihr form", "person": "2" },
          "3": { "form": "sie/Sie form", "person": "3" }
        }
      }
    },
    "past": {
      "indicative": {
        "SG": {
          "1": { "form": "ich form", "person": "1" },
          "2": { "form": "du form", "person": "2" },
          "3": { "form": "er/sie/es form", "person": "3" }
        },
        "PL": {
          "1": { "form": "wir form", "person": "1" },
          "2": { "form": "ihr form", "person": "2" },
          "3": { "form": "sie/Sie form", "person": "3" }
        }
      },
      "subjunctive": {
        "SG": {
          "1": { "form": "ich form", "person": "1" },
          "2": { "form": "du form", "person": "2" },
          "3": { "form": "er/sie/es form", "person": "3" }
        },
        "PL": {
          "1": { "form": "wir form", "person": "1" },
          "2": { "form": "ihr form", "person": "2" },
          "3": { "form": "sie/Sie form", "person": "3" }
        }
      }
    },
    "imperative": {
      "SG": [
        { "form": "du imperative form", "person": "2" }
      ],
      "PL": [
        { "form": "ihr imperative form", "person": "2" },
        { "form": "Sie imperative form", "person": "3" }
      ]
    }
  }
}

Provide accurate German conjugations for all tenses and moods. Return ONLY valid JSON, no additional text or markdown formatting.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const conjugationText = response.text().trim()
        
        const cleanJson = extractJsonFromResponse(conjugationText)
        const conjugations = JSON.parse(cleanJson)
        
        console.log("Successfully retrieved conjugations for:", baseForm)
        return conjugations
      } catch (error) {
        console.error("Error getting verb conjugations with Gemini:", error)
        return {
          baseForm,
          conjugations: {
            present: { indicative: { SG: {}, PL: {} }, subjunctive: { SG: {}, PL: {} } },
            past: { indicative: { SG: {}, PL: {} }, subjunctive: { SG: {}, PL: {} } },
            imperative: { SG: [], PL: [] }
          }
        }
      }
    },

    // Enhanced batch analysis that can optionally include conjugations
    batchAnalyzeText: async (
      sentences: Array<{text: string, words: string[]}>, 
      extractedThemes?: any[], 
      includeConjugations: boolean = false
    ) => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        
        const sentencesText = sentences.map((s, idx) => 
          `Sentence ${idx + 1}: "${s.text}"\nWords to analyze: ${s.words.map(w => `"${w}"`).join(', ')}`
        ).join('\n\n')
        
        const themesContext = extractedThemes ? 
          `\n\nIdentified themes in this text: ${extractedThemes.map(t => t.name).join(', ')}` : ''
        
        const conjugationInstruction = includeConjugations ? `
        
For VERBS ONLY, also include basic conjugation information:
"conjugationHint": {
  "presentSG3": "er/sie/es form",
  "pastSG1": "ich past form", 
  "imperativeSG": "du imperative form"
}` : ''
        
        console.log(`Processing ${sentences.length} sentences with Gemini...`)
        
        const prompt = `Analyze all words in these German sentences:

${sentencesText}${themesContext}

Please provide a JSON response with the following structure (return ONLY the JSON, no markdown formatting):
{
  "sentences": [
    {
      "sentenceTranslation": "English translation of sentence 1",
      "words": {
        "word1": {
          "baseForm": "base form of the word",
          "wordType": "VERB|NOUN|ADJECTIVE|ADVERB",
          "level": "A1|A2|B1|B2|C1|C2",
          "translation": "English translation based on context",
          "themes": ["theme1", "theme2"],${conjugationInstruction}
          "grammaticalInfo": {
            "gender": "MASC|FEM|NEUT|null",
            "case": "NOM|ACC|DAT|GEN|null",
            "tense": "present|past|perfect|future|null",
            "person": "1|2|3|null",
            "number": "SG|PL|null",
            "adverbType": "time|place|manner|degree|other|null"
          }
        }
      }
    }
  ]
}

For each word, identify which themes it belongs to based on the identified themes in the text. If a word doesn't fit any specific theme, you can omit the themes array or use ["General"].

Provide analysis for each sentence and its words. Return ONLY valid JSON, no additional text, explanations, or markdown code block formatting.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const analysisText = response.text().trim()
        
        console.log("Gemini batch analysis response received, length:", analysisText.length)
        
        const cleanJson = extractJsonFromResponse(analysisText)
        const analysis = JSON.parse(cleanJson)
        
        console.log(`Successfully parsed batch analysis for ${analysis.sentences?.length || 0} sentences`)
        return analysis
      } catch (error) {
        console.error("Error batch analyzing text with Gemini:", error)
        console.log("Sentences that failed:", sentences.map(s => s.text))
        
        const fallbackAnalysis = {
          sentences: sentences.map(s => ({
            sentenceTranslation: `[Translation of: ${s.text}]`,
            words: Object.fromEntries(s.words.map(word => [word, {
              baseForm: word,
              wordType: "ADVERB",
              level: "A2",
              translation: `[Translation of: ${word}]`,
              themes: ["General"],
              grammaticalInfo: {
                gender: null,
                case: null,
                tense: null,
                person: null,
                number: null,
                adverbType: "other"
              }
            }]))
          }))
        }
        
        console.log("Using fallback analysis for", sentences.length, "sentences")
        return fallbackAnalysis
      }
    },

    analyzeSentence: async (sentence: string, words: string[]) => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        
        const prompt = `Analyze all words in this German sentence: "${sentence}"

Words to analyze: ${words.map(w => `"${w}"`).join(', ')}

Please provide a JSON response with the following structure (return ONLY the JSON, no markdown formatting):
{
  "sentenceTranslation": "Complete English translation of the sentence",
  "words": {
    "${words[0]}": {
      "baseForm": "base form of the word",
      "wordType": "VERB|NOUN|ADJECTIVE|ADVERB",
      "level": "A1|A2|B1|B2|C1|C2",
      "translation": "English translation based on context",
      "grammaticalInfo": {
        "gender": "MASC|FEM|NEUT|null (for nouns only)",
        "case": "NOM|ACC|DAT|GEN|null (for nouns/adjectives)",
        "tense": "present|past|perfect|future|null (for verbs only)",
        "person": "1|2|3|null (for verbs only)",
        "number": "SG|PL|null (for verbs/nouns)",
        "adverbType": "time|place|manner|degree|other|null (for adverbs only)"
      }
    }
  }
}

Include analysis for each word in the "words" object using the word as the key. Provide only valid JSON, no additional text, explanations, or markdown formatting.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const analysisText = response.text().trim()
        
        // Extract JSON from the response (handles markdown code blocks)
        const cleanJson = extractJsonFromResponse(analysisText)
        
        // Parse the JSON response
        const analysis = JSON.parse(cleanJson)
        console.log("Successfully parsed sentence analysis:", analysis)
        return analysis
      } catch (error) {
        console.error("Error analyzing sentence with Gemini:", error)
        // Return a fallback analysis
        const fallbackWords: any = {}
        words.forEach(word => {
          fallbackWords[word] = {
            baseForm: word,
            wordType: "ADVERB",
            level: "A2",
            translation: `[Translation of: ${word}]`,
            grammaticalInfo: {
              gender: null,
              case: null,
              tense: null,
              person: null,
              number: null,
              adverbType: "other"
            }
          }
        })
        
        return {
          sentenceTranslation: `[Translation of: ${sentence}]`,
          words: fallbackWords
        }
      }
    },

    extractThemes: async (text: string, title: string) => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        
        const prompt = `Analyze this German text and identify the main themes/topics it covers. 
        
        Text Title: "${title}"
        Text Content: "${text}"
        
        Please provide a JSON response with the following structure (return ONLY the JSON, no markdown formatting):
        {
          "themes": [
            {
              "name": "Theme name in English",
              "description": "Brief description of the theme",
              "relevance": "high|medium|low",
              "keywords": ["german", "words", "related", "to", "this", "theme"]
            }
          ]
        }
        
        Identify 2-5 main themes that best represent the content. Focus on concrete topics like:
        - Family & Relationships
        - Education & School
        - Sports & Activities
        - Food & Cooking
        - Travel & Transportation
        - Work & Career
        - Health & Medicine
        - Technology
        - Nature & Environment
        - Daily Routine
        - Shopping & Money
        - Housing & Living
        
        Return ONLY valid JSON, no additional text or markdown formatting.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const analysisText = response.text().trim()
        
        const cleanJson = extractJsonFromResponse(analysisText)
        const themes = JSON.parse(cleanJson)
        
        console.log("Successfully extracted themes:", themes)
        return themes
      } catch (error) {
        console.error("Error extracting themes with Gemini:", error)
        return {
          themes: [
            {
              name: "General",
              description: "General vocabulary",
              relevance: "medium",
              keywords: []
            }
          ]
        }
      }
    }
  }
}