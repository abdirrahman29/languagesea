// Ultra-robust translator.ts - Process sentences individually for maximum reliability
import OpenAI from 'openai'

// Initialize Groq API client
const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY!
})

// Current supported models
const GROQ_MODELS = {
  LLAMA_33_70B: 'llama-3.3-70b-versatile',
  LLAMA_31_8B: 'llama-3.1-8b-instant',
  GEMMA2_9B: 'gemma2-9b-it'
}

const DEFAULT_MODEL = GROQ_MODELS.LLAMA_33_70B

// Improved JSON extraction with better error handling
function extractJsonFromResponse(text: string): string {
  console.log("Raw response length:", text.length)
  
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }
  
  // Try to find JSON object boundaries
  const startIndex = text.indexOf('{')
  const lastIndex = text.lastIndexOf('}')
  
  if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
    return text.substring(startIndex, lastIndex + 1)
  }
  
  return text.trim()
}

// Safe JSON parser with multiple fallback strategies
function safeParseJson(jsonString: string): any {
  const attempts = [
    // Attempt 1: Parse as-is
    () => JSON.parse(jsonString),
    
    // Attempt 2: Fix common issues
    () => {
      let fixed = jsonString
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([^"])\n/g, '$1') // Remove unexpected newlines
        .replace(/,\s*$/, '') // Remove final trailing comma
      
      // Fix incomplete strings
      fixed = fixed.replace(/"([^"]*?)$/gm, '"$1"')
      
      return JSON.parse(fixed)
    },
    
    // Attempt 3: Aggressive cleanup
    () => {
      let fixed = jsonString
      
      // Remove any incomplete final entries
      fixed = fixed.replace(/,\s*"[^"]*":\s*\{[^}]*$/g, '')
      fixed = fixed.replace(/,\s*"[^"]*":\s*"[^"]*$/g, '')
      fixed = fixed.replace(/,\s*"[^"]*":\s*\[[^\]]*$/g, '')
      
      // Ensure proper structure
      if (fixed.includes('"sentences"') && !fixed.includes('"sentences": [')) {
        fixed = '{"sentences": []}'
      }
      
      // Add missing closing brackets
      const openBraces = (fixed.match(/{/g) || []).length
      const closeBraces = (fixed.match(/}/g) || []).length
      fixed += '}'.repeat(Math.max(0, openBraces - closeBraces))
      
      const openBrackets = (fixed.match(/\[/g) || []).length
      const closeBrackets = (fixed.match(/\]/g) || []).length
      fixed += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
      
      return JSON.parse(fixed)
    }
  ]
  
  for (let i = 0; i < attempts.length; i++) {
    try {
      console.log(`JSON Parse attempt ${i + 1}...`)
      return attempts[i]()
    } catch (error) {
      console.log(`Parse attempt ${i + 1} failed:`, error.message)
      if (i === attempts.length - 1) {
        console.log("All parse attempts failed. JSON preview:", jsonString.substring(0, 200) + "...")
        throw error
      }
    }
  }
}

export function createTranslator() {
  return {
    generateContent: async (prompt: string) => {
      try {
        console.log("Generating content with Groq:", prompt.substring(0, 100) + "...")
        
        const completion = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        })
        
        const generatedText = completion.choices[0]?.message?.content?.trim() || ""
        console.log("Generated content length:", generatedText.length)
        return generatedText
      } catch (error) {
        console.error("Error generating content with Groq:", error)
        throw new Error(`Failed to generate content: ${error}`)
      }
    },

    translate: async (text: string, options: { from: string; to: string }, context?: string) => {
      try {
        let prompt: string
        
        if (context) {
          prompt = `Translate the German word "${text}" to English considering this context: "${context}". 
          Provide only the most appropriate English translation based on the context. 
          Do not include explanations, just the translation.`
        } else {
          prompt = `Translate this German text to English: "${text}". 
          Provide only the translation, no explanations.`
        }

        const completion = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 500
        })
        
        const translation = completion.choices[0]?.message?.content?.trim() || `[Translation of: ${text}]`
        return translation
      } catch (error) {
        console.error("Error translating with Groq:", error)
        return `[Translation of: ${text}]`
      }
    },

    getVerbConjugations: async (baseForm: string) => {
      try {
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
      }
    }
  }
}

Provide accurate German conjugations. Return ONLY valid JSON, no additional text.`

        const completion = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a German language expert. Provide accurate verb conjugations in JSON format."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
        
        const conjugationText = completion.choices[0]?.message?.content?.trim() || ""
        const cleanJson = extractJsonFromResponse(conjugationText)
        const conjugations = safeParseJson(cleanJson)
        
        console.log("Successfully retrieved conjugations for:", baseForm)
        return conjugations
      } catch (error) {
        console.error("Error getting verb conjugations with Groq:", error)
        return {
          baseForm,
          conjugations: {
            present: { indicative: { SG: {}, PL: {} } }
          }
        }
      }
    },

    // NEW APPROACH: Process each sentence individually for maximum reliability
    batchAnalyzeEntireText: async (
      sentences: Array<{text: string, words: string[]}>, 
      extractedThemes?: any[], 
      includeConjugations: boolean = false,
      maxWordsPerBatch: number = 50 // Process very small chunks or individual sentences
    ) => {
      try {
        console.log(`Processing ${sentences.length} sentences individually with Groq (${DEFAULT_MODEL})`)
        
        const allResults = []
        const themes = extractedThemes || []
        const themeNames = themes.map(t => t.name).join(', ')
        
        for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex++) {
          const sentence = sentences[sentenceIndex]
          console.log(`Processing sentence ${sentenceIndex + 1}/${sentences.length}: "${sentence.text.substring(0, 50)}..."`)
          
          const wordsToAnalyze = sentence.words.slice(0, 15) // Limit words per sentence to prevent overload
          
          const conjugationInstruction = includeConjugations ? `
          
For VERBS ONLY, also include basic conjugation information:
"conjugationHint": {
  "presentSG3": "er/sie/es form",
  "pastSG1": "ich past form", 
  "imperativeSG": "du imperative form"
}` : ''

          const prompt = `Analyze this German sentence and all its words:

Sentence: "${sentence.text}"
Words to analyze: ${wordsToAnalyze.map(w => `"${w}"`).join(', ')}

Available themes: ${themeNames}

CRITICAL INSTRUCTIONS:
- Identify ALL VERBS correctly (infinitives ending -en, conjugated forms, past participles with ge-)
- Common verbs: sein (ist, sind), haben (hat, haben), werden (wird), geben, machen, kommen, gehen
- Return COMPLETE, VALID JSON only

JSON structure (return ONLY this, no markdown):
{
  "sentenceTranslation": "Complete English translation of the sentence",
  "words": {
    "${wordsToAnalyze[0] || 'word'}": {
      "baseForm": "base form",
      "wordType": "VERB|NOUN|ADJECTIVE|ADVERB|PREPOSITION|ARTICLE|PRONOUN",
      "level": "A1|A2|B1|B2|C1|C2",
      "translation": "English translation based on context",
      "themes": ["relevant", "themes"],${conjugationInstruction}
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

Include ALL words from the list. Ensure verbs are marked as "VERB". Return ONLY complete, valid JSON.`

          try {
            const completion = await groq.chat.completions.create({
              model: DEFAULT_MODEL,
              messages: [
                {
                  role: "system",
                  content: "You are a German language expert. Analyze sentences and identify ALL verbs correctly. Always return complete, valid JSON responses with all requested words analyzed."
                },
                { role: "user", content: prompt }
              ],
              temperature: 0.05, // Very low for maximum consistency
              max_tokens: 1500, // Conservative limit for individual sentences
              top_p: 0.8
            })
            
            const analysisText = completion.choices[0]?.message?.content?.trim() || ""
            
            if (!analysisText) {
              throw new Error("Empty response from Groq")
            }
            
            const cleanJson = extractJsonFromResponse(analysisText)
            const analysis = safeParseJson(cleanJson)
            
            // Validate the analysis structure
            if (!analysis.sentenceTranslation || !analysis.words) {
              throw new Error("Invalid analysis structure - missing required fields")
            }
            
            // Ensure all requested words are included
            const missingWords = wordsToAnalyze.filter(word => !analysis.words[word])
            if (missingWords.length > 0) {
              console.log(`Adding ${missingWords.length} missing words for sentence ${sentenceIndex + 1}`)
              
              // Add missing words with basic analysis
              missingWords.forEach(word => {
                const isLikelyVerb = word.endsWith('en') || word.startsWith('ge') || 
                  ['ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden', 'kann', 'muss'].includes(word.toLowerCase())
                
                analysis.words[word] = {
                  baseForm: word,
                  wordType: isLikelyVerb ? "VERB" : "NOUN",
                  level: "A2",
                  translation: `[Translation needed: ${word}]`,
                  themes: ["General"],
                  grammaticalInfo: {
                    gender: null,
                    case: null,
                    tense: isLikelyVerb ? "present" : null,
                    person: null,
                    number: null,
                    adverbType: null
                  }
                }
              })
            }
            
            // Convert to the expected format
            const sentenceResult = {
              sentenceTranslation: analysis.sentenceTranslation,
              words: analysis.words
            }
            
            allResults.push(sentenceResult)
            
            // Count verbs for debugging
            const verbCount = Object.values(analysis.words).filter((word: any) => word.wordType === 'VERB').length
            console.log(`Successfully processed sentence ${sentenceIndex + 1}, found ${verbCount} verbs`)
            
            // Delay between requests to prevent rate limiting
            if (sentenceIndex < sentences.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 800))
            }
            
          } catch (sentenceError) {
            console.error(`Error processing sentence ${sentenceIndex + 1}:`, sentenceError)
            console.log("Failed sentence:", sentence.text)
            
            // Fallback for this sentence with improved verb detection
            const fallbackWords: any = {}
            sentence.words.forEach(word => {
              const isLikelyVerb = word.endsWith('en') || word.startsWith('ge') || 
                ['ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden', 'kann', 'muss', 'soll', 'will'].includes(word.toLowerCase()) ||
                word.match(/^(präsentiert|synthetisiert|schöpfen|begann|gegründet|bewarben|ausgewählt|trainiert|arbeiteten|erhielten|stattfanden)$/i)
              
              fallbackWords[word] = {
                baseForm: word,
                wordType: isLikelyVerb ? "VERB" : "NOUN",
                level: "A2",
                translation: `[Translation of: ${word}]`,
                themes: themes.length > 0 ? [themes[0].name] : ["General"],
                grammaticalInfo: {
                  gender: null,
                  case: null,
                  tense: isLikelyVerb ? "present" : null,
                  person: null,
                  number: null,
                  adverbType: null
                }
              }
            })
            
            const fallbackSentence = {
              sentenceTranslation: `[Translation of: ${sentence.text}]`,
              words: fallbackWords
            }
            
            allResults.push(fallbackSentence)
          }
        }
        
        console.log(`Individual sentence processing complete: processed ${allResults.length} sentences`)
        
        // Log final verb statistics
        const totalVerbs = allResults.reduce((count, sentence) => {
          return count + Object.values(sentence.words || {}).filter((word: any) => word.wordType === 'VERB').length
        }, 0)
        console.log(`Total verbs found: ${totalVerbs}`)
        
        return { sentences: allResults }
        
      } catch (error) {
        console.error("Error in individual sentence processing:", error)
        
        // Complete fallback with improved verb detection
        const fallbackAnalysis = {
          sentences: sentences.map(s => ({
            sentenceTranslation: `[Translation of: ${s.text}]`,
            words: Object.fromEntries(s.words.map(word => {
              const isLikelyVerb = word.endsWith('en') || word.startsWith('ge') || 
                ['ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden'].includes(word.toLowerCase()) ||
                word.match(/^(präsentiert|synthetisiert|schöpfen|begann|gegründet|bewarben|ausgewählt|trainiert|arbeiteten|erhielten|stattfanden)$/i)
              
              return [word, {
                baseForm: word,
                wordType: isLikelyVerb ? "VERB" : "NOUN",
                level: "A2",
                translation: `[Translation of: ${word}]`,
                themes: ["General"],
                grammaticalInfo: {
                  gender: null,
                  case: null,
                  tense: isLikelyVerb ? "present" : null,
                  person: null,
                  number: null,
                  adverbType: null
                }
              }]
            }))
          }))
        }
        
        console.log("Using complete fallback analysis")
        return fallbackAnalysis
      }
    },

    // Legacy method kept for compatibility
    batchAnalyzeText: async (
      sentences: Array<{text: string, words: string[]}>, 
      extractedThemes?: any[], 
      includeConjugations: boolean = false
    ) => {
      console.log("Using individual sentence processing for maximum reliability")
      return this.batchAnalyzeEntireText(sentences, extractedThemes, includeConjugations, 50)
    },

    analyzeSentence: async (sentence: string, words: string[]) => {
      try {
        const prompt = `Analyze this German sentence: "${sentence}"

Words to analyze: ${words.map(w => `"${w}"`).join(', ')}

IMPORTANT: Identify ALL VERBS correctly. Return ONLY valid JSON:

{
  "sentenceTranslation": "Complete English translation of the sentence",
  "words": {
    "${words[0] || 'example'}": {
      "baseForm": "base form of the word",
      "wordType": "VERB|NOUN|ADJECTIVE|ADVERB|PREPOSITION|ARTICLE|PRONOUN",
      "level": "A1|A2|B1|B2|C1|C2",
      "translation": "English translation based on context",
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

Return ONLY valid JSON for all words.`

        const completion = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a German language expert. Analyze German sentences and identify ALL verbs correctly. Return complete JSON."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
        
        const analysisText = completion.choices[0]?.message?.content?.trim() || ""
        const cleanJson = extractJsonFromResponse(analysisText)
        const analysis = safeParseJson(cleanJson)
        
        console.log("Successfully parsed sentence analysis")
        return analysis
      } catch (error) {
        console.error("Error analyzing sentence with Groq:", error)
        
        // Improved fallback with verb detection
        const fallbackWords: any = {}
        words.forEach(word => {
          const isLikelyVerb = word.endsWith('en') || word.startsWith('ge') || 
            ['ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden'].includes(word.toLowerCase())
          
          fallbackWords[word] = {
            baseForm: word,
            wordType: isLikelyVerb ? "VERB" : "NOUN",
            level: "A2",
            translation: `[Translation of: ${word}]`,
            grammaticalInfo: {
              gender: null,
              case: null,
              tense: isLikelyVerb ? "present" : null,
              person: null,
              number: null,
              adverbType: null
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
        const prompt = `Analyze this German text about dance and identify the main themes:
        
        Title: "${title}"
        Text: "${text}"
        
        JSON response (ONLY JSON, no markdown):
        {
          "themes": [
            {
              "name": "Theme name in English",
              "description": "Brief description",
              "relevance": "high|medium|low",
              "keywords": ["german", "words", "related"]
            }
          ]
        }
        
        Focus on themes like: Dance & Music, Arts & Performance, Culture & Tradition, Travel & Tourism, Education & Training`

        const completion = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a text analysis expert. Identify themes in German texts and return valid JSON."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
        
        const analysisText = completion.choices[0]?.message?.content?.trim() || ""
        const cleanJson = extractJsonFromResponse(analysisText)
        const themes = safeParseJson(cleanJson)
        
        console.log("Successfully extracted themes:", themes)
        return themes
      } catch (error) {
        console.error("Error extracting themes with Groq:", error)
        return {
          themes: [
            {
              name: "Dance & Music",
              description: "Dance performances and musical elements",
              relevance: "high",
              keywords: ["tanz", "musik", "rhythmus"]
            },
            {
              name: "Culture & Tradition",
              description: "Cultural heritage and traditions",
              relevance: "high", 
              keywords: ["kultur", "tradition", "geschichte"]
            }
          ]
        }
      }
    }
  }
}