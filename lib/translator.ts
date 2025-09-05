// Updated translator.ts - Dynamic language support
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

// Language-specific configurations
const LANGUAGE_CONFIGS = {
  de: {
    name: 'German',
    hasGender: true,
    hasCases: true,
    hasConjugations: true,
    verbEnding: 'en',
    commonVerbs: ['sein', 'haben', 'werden', 'gehen', 'kommen', 'sehen', 'machen', 'können', 'müssen', 'sollen'],
    grammarFeatures: ['conjugations', 'cases', 'gender']
  },
  es: {
    name: 'Spanish',
    hasGender: true,
    hasCases: false,
    hasConjugations: true,
    verbEnding: 'ar|er|ir',
    commonVerbs: ['ser', 'estar', 'tener', 'hacer', 'ir', 'ver', 'dar', 'saber', 'querer', 'llegar'],
    grammarFeatures: ['conjugations', 'gender']
  },
  fr: {
    name: 'French',
    hasGender: true,
    hasCases: false,
    hasConjugations: true,
    verbEnding: 'er|ir|re',
    commonVerbs: ['être', 'avoir', 'faire', 'dire', 'aller', 'voir', 'savoir', 'prendre', 'venir', 'vouloir'],
    grammarFeatures: ['conjugations', 'gender']
  },
  it: {
    name: 'Italian',
    hasGender: true,
    hasCases: false,
    hasConjugations: true,
    verbEnding: 'are|ere|ire',
    commonVerbs: ['essere', 'avere', 'fare', 'dire', 'andare', 'vedere', 'sapere', 'dare', 'stare', 'venire'],
    grammarFeatures: ['conjugations', 'gender']
  },
  pt: {
    name: 'Portuguese',
    hasGender: true,
    hasCases: false,
    hasConjugations: true,
    verbEnding: 'ar|er|ir',
    commonVerbs: ['ser', 'estar', 'ter', 'fazer', 'ir', 'ver', 'dar', 'saber', 'querer', 'chegar'],
    grammarFeatures: ['conjugations', 'gender']
  },
  tr: {
    name: 'Turkish',
    hasGender: false,
    hasCases: true,
    hasConjugations: true,
    verbEnding: 'mak|mek',
    commonVerbs: ['olmak', 'etmek', 'yapmak', 'gelmek', 'gitmek', 'görmek', 'bilmek', 'almak', 'vermek', 'çıkmak'],
    grammarFeatures: ['conjugations', 'cases']
  },
  nl: {
    name: 'Dutch',
    hasGender: true,
    hasCases: false,
    hasConjugations: true,
    verbEnding: 'en',
    commonVerbs: ['zijn', 'hebben', 'worden', 'gaan', 'komen', 'zien', 'maken', 'kunnen', 'moeten', 'willen'],
    grammarFeatures: ['conjugations', 'gender']
  },
  sv: {
    name: 'Swedish',
    hasGender: true,
    hasCases: false,
    hasConjugations: true,
    verbEnding: 'a',
    commonVerbs: ['vara', 'ha', 'bli', 'gå', 'komma', 'se', 'göra', 'kunna', 'ska', 'vilja'],
    grammarFeatures: ['conjugations', 'gender']
  }
}

// Improved JSON extraction with better error handling
function extractJsonFromResponse(text: string): string {
  console.log("Raw response length:", text.length)
  
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }
  
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
    () => JSON.parse(jsonString),
    () => {
      let fixed = jsonString
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/([^"])\n/g, '$1')
        .replace(/,\s*$/, '')
      
      fixed = fixed.replace(/"([^"]*?)$/gm, '"$1"')
      return JSON.parse(fixed)
    },
    () => {
      let fixed = jsonString
      fixed = fixed.replace(/,\s*"[^"]*":\s*\{[^}]*$/g, '')
      fixed = fixed.replace(/,\s*"[^"]*":\s*"[^"]*$/g, '')
      fixed = fixed.replace(/,\s*"[^"]*":\s*\[[^\]]*$/g, '')
      
      if (fixed.includes('"sentences"') && !fixed.includes('"sentences": [')) {
        fixed = '{"sentences": []}'
      }
      
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

export function createTranslator(languageCode: string = 'de', translationCode: string = 'en') {
  const languageConfig = LANGUAGE_CONFIGS[languageCode as keyof typeof LANGUAGE_CONFIGS] || LANGUAGE_CONFIGS.de
  
  return {
    generateContent: async (prompt: string) => {
      try {
        console.log(`Generating content with Groq for ${languageConfig.name}:`, prompt.substring(0, 100) + "...")
        
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
        const fromLang = LANGUAGE_CONFIGS[options.from as keyof typeof LANGUAGE_CONFIGS]?.name || options.from
        const toLang = LANGUAGE_CONFIGS[options.to as keyof typeof LANGUAGE_CONFIGS]?.name || options.to
        
        let prompt: string
        
        if (context) {
          prompt = `Translate the ${fromLang} word "${text}" to ${toLang} considering this context: "${context}". 
          Provide only the most appropriate ${toLang} translation based on the context. 
          Do not include explanations, just the translation.`
        } else {
          prompt = `Translate this ${fromLang} text to ${toLang}: "${text}". 
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
      if (!languageConfig.hasConjugations) {
        console.log(`${languageConfig.name} does not support conjugations`)
        return { baseForm, conjugations: {} }
      }

      try {
        let conjugationStructure = ''
        let grammarInstructions = ''

        switch (languageCode) {
          case 'de':
            conjugationStructure = `{
              "present": {
                "indicative": {
                  "SG": { "1": { "form": "ich form" }, "2": { "form": "du form" }, "3": { "form": "er/sie/es form" } },
                  "PL": { "1": { "form": "wir form" }, "2": { "form": "ihr form" }, "3": { "form": "sie/Sie form" } }
                }
              }
            }`
            grammarInstructions = 'Provide accurate German verb conjugations including present and past tense.'
            break
          
          case 'es':
            conjugationStructure = `{
              "present": {
                "indicative": {
                  "SG": { "1": { "form": "yo form" }, "2": { "form": "tú form" }, "3": { "form": "él/ella form" } },
                  "PL": { "1": { "form": "nosotros form" }, "2": { "form": "vosotros form" }, "3": { "form": "ellos form" } }
                }
              }
            }`
            grammarInstructions = 'Provide accurate Spanish verb conjugations including present tense.'
            break

          case 'fr':
            conjugationStructure = `{
              "present": {
                "indicative": {
                  "SG": { "1": { "form": "je form" }, "2": { "form": "tu form" }, "3": { "form": "il/elle form" } },
                  "PL": { "1": { "form": "nous form" }, "2": { "form": "vous form" }, "3": { "form": "ils/elles form" } }
                }
              }
            }`
            grammarInstructions = 'Provide accurate French verb conjugations including present tense.'
            break

          case 'it':
            conjugationStructure = `{
              "present": {
                "indicative": {
                  "SG": { "1": { "form": "io form" }, "2": { "form": "tu form" }, "3": { "form": "lui/lei form" } },
                  "PL": { "1": { "form": "noi form" }, "2": { "form": "voi form" }, "3": { "form": "loro form" } }
                }
              }
            }`
            grammarInstructions = 'Provide accurate Italian verb conjugations including present tense.'
            break

          case 'tr':
            conjugationStructure = `{
              "present": {
                "indicative": {
                  "SG": { "1": { "form": "ben form" }, "2": { "form": "sen form" }, "3": { "form": "o form" } },
                  "PL": { "1": { "form": "biz form" }, "2": { "form": "siz form" }, "3": { "form": "onlar form" } }
                }
              }
            }`
            grammarInstructions = 'Provide accurate Turkish verb conjugations including present tense with personal endings.'
            break

          default:
            conjugationStructure = `{
              "present": {
                "indicative": {
                  "SG": { "1": { "form": "1st person singular" }, "2": { "form": "2nd person singular" }, "3": { "form": "3rd person singular" } },
                  "PL": { "1": { "form": "1st person plural" }, "2": { "form": "2nd person plural" }, "3": { "form": "3rd person plural" } }
                }
              }
            }`
            grammarInstructions = `Provide accurate ${languageConfig.name} verb conjugations.`
        }

        const prompt = `Provide complete conjugation for the ${languageConfig.name} verb "${baseForm}".

Please provide a JSON response with the following structure (return ONLY the JSON, no markdown formatting):
{
  "baseForm": "${baseForm}",
  "conjugations": ${conjugationStructure}
}

${grammarInstructions} Return ONLY valid JSON, no additional text.`

        const completion = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: `You are a ${languageConfig.name} language expert. Provide accurate verb conjugations in JSON format.`
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
        
        const conjugationText = completion.choices[0]?.message?.content?.trim() || ""
        const cleanJson = extractJsonFromResponse(conjugationText)
        const conjugations = safeParseJson(cleanJson)
        
        console.log(`Successfully retrieved conjugations for ${languageConfig.name} verb:`, baseForm)
        return conjugations
      } catch (error) {
        console.error(`Error getting verb conjugations for ${languageConfig.name}:`, error)
        return {
          baseForm,
          conjugations: {
            present: { indicative: { SG: {}, PL: {} } }
          }
        }
      }
    },

    batchAnalyzeEntireText: async (
      sentences: Array<{text: string, words: string[]}>, 
      extractedThemes?: any[], 
      includeConjugations: boolean = false,
      maxWordsPerBatch: number = 50
    ) => {
      try {
        console.log(`Processing ${sentences.length} sentences in ${languageConfig.name} with Groq (${DEFAULT_MODEL})`)
        
        const allResults = []
        const themes = extractedThemes || []
        const themeNames = themes.map(t => t.name).join(', ')
        
        // Generate verb detection patterns based on language
        const verbPatterns = languageConfig.commonVerbs.join('|')
        const verbEndingPattern = languageConfig.verbEnding
        
        for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex++) {
          const sentence = sentences[sentenceIndex]
          console.log(`Processing ${languageConfig.name} sentence ${sentenceIndex + 1}/${sentences.length}: "${sentence.text.substring(0, 50)}..."`)
          
          const wordsToAnalyze = sentence.words.slice(0, 15)
          
          const conjugationInstruction = includeConjugations && languageConfig.hasConjugations ? `
          
For VERBS ONLY, also include basic conjugation information:
"conjugationHint": {
  "presentSG3": "3rd person singular present form",
  "pastSG1": "1st person singular past form", 
  "imperativeSG": "singular imperative form"
}` : ''

          // Build grammar features instruction based on language
          let grammarFeatures = ''
          if (languageConfig.hasGender) {
            grammarFeatures += '"gender": "MASC|FEM|NEUT|null",'
          }
          if (languageConfig.hasCases) {
            grammarFeatures += '"case": "NOM|ACC|DAT|GEN|null",'
          }
          grammarFeatures += '"tense": "present|past|perfect|future|null",'
          grammarFeatures += '"person": "1|2|3|null",'
          grammarFeatures += '"number": "SG|PL|null",'
          grammarFeatures += '"adverbType": "time|place|manner|degree|other|null"'

          const prompt = `Analyze this ${languageConfig.name} sentence and all its words:

Sentence: "${sentence.text}"
Words to analyze: ${wordsToAnalyze.map(w => `"${w}"`).join(', ')}

Available themes: ${themeNames}

CRITICAL INSTRUCTIONS:
- Identify ALL VERBS correctly (infinitives, conjugated forms, participles)
- Common ${languageConfig.name} verbs: ${languageConfig.commonVerbs.join(', ')}
- Return COMPLETE, VALID JSON only

JSON structure (return ONLY this, no markdown):
{
  "sentenceTranslation": "Complete ${LANGUAGE_CONFIGS[translationCode as keyof typeof LANGUAGE_CONFIGS]?.name || 'English'} translation of the sentence",
  "words": {
    "${wordsToAnalyze[0] || 'word'}": {
      "baseForm": "base form",
      "wordType": "VERB|NOUN|ADJECTIVE|ADVERB|PREPOSITION|ARTICLE|PRONOUN",
      "level": "A1|A2|B1|B2|C1|C2",
      "translation": "${LANGUAGE_CONFIGS[translationCode as keyof typeof LANGUAGE_CONFIGS]?.name || 'English'} translation based on context",
      "themes": ["relevant", "themes"],${conjugationInstruction}
      "grammaticalInfo": {
        ${grammarFeatures}
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
                  content: `You are a ${languageConfig.name} language expert. Analyze sentences and identify ALL verbs correctly. Always return complete, valid JSON responses with all requested words analyzed.`
                },
                { role: "user", content: prompt }
              ],
              temperature: 0.05,
              max_tokens: 1500,
              top_p: 0.8
            })
            
            const analysisText = completion.choices[0]?.message?.content?.trim() || ""
            
            if (!analysisText) {
              throw new Error("Empty response from Groq")
            }
            
            const cleanJson = extractJsonFromResponse(analysisText)
            const analysis = safeParseJson(cleanJson)
            
            if (!analysis.sentenceTranslation || !analysis.words) {
              throw new Error("Invalid analysis structure - missing required fields")
            }
            
            // Ensure all requested words are included
            const missingWords = wordsToAnalyze.filter(word => !analysis.words[word])
            if (missingWords.length > 0) {
              console.log(`Adding ${missingWords.length} missing words for sentence ${sentenceIndex + 1}`)
              
              missingWords.forEach(word => {
                // Language-specific verb detection
                const isLikelyVerb = new RegExp(`(${verbEndingPattern})$`).test(word) || 
                  languageConfig.commonVerbs.some(v => word.toLowerCase().includes(v.toLowerCase()))
                
                analysis.words[word] = {
                  baseForm: word,
                  wordType: isLikelyVerb ? "VERB" : "NOUN",
                  level: "A2",
                  translation: `[Translation needed: ${word}]`,
                  themes: ["General"],
                  grammaticalInfo: Object.fromEntries([
                    ...(languageConfig.hasGender ? [["gender", null]] : []),
                    ...(languageConfig.hasCases ? [["case", null]] : []),
                    ["tense", isLikelyVerb ? "present" : null],
                    ["person", null],
                    ["number", null],
                    ["adverbType", null]
                  ])
                }
              })
            }
            
            const sentenceResult = {
              sentenceTranslation: analysis.sentenceTranslation,
              words: analysis.words
            }
            
            allResults.push(sentenceResult)
            
            const verbCount = Object.values(analysis.words).filter((word: any) => word.wordType === 'VERB').length
            console.log(`Successfully processed ${languageConfig.name} sentence ${sentenceIndex + 1}, found ${verbCount} verbs`)
            
            if (sentenceIndex < sentences.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 800))
            }
            
          } catch (sentenceError) {
            console.error(`Error processing ${languageConfig.name} sentence ${sentenceIndex + 1}:`, sentenceError)
            
            // Fallback for this sentence
            const fallbackWords: any = {}
            sentence.words.forEach(word => {
              const isLikelyVerb = new RegExp(`(${verbEndingPattern})$`).test(word) || 
                languageConfig.commonVerbs.some(v => word.toLowerCase().includes(v.toLowerCase()))
              
              fallbackWords[word] = {
                baseForm: word,
                wordType: isLikelyVerb ? "VERB" : "NOUN",
                level: "A2",
                translation: `[Translation of: ${word}]`,
                themes: themes.length > 0 ? [themes[0].name] : ["General"],
                grammaticalInfo: Object.fromEntries([
                  ...(languageConfig.hasGender ? [["gender", null]] : []),
                  ...(languageConfig.hasCases ? [["case", null]] : []),
                  ["tense", isLikelyVerb ? "present" : null],
                  ["person", null],
                  ["number", null],
                  ["adverbType", null]
                ])
              }
            })
            
            const fallbackSentence = {
              sentenceTranslation: `[Translation of: ${sentence.text}]`,
              words: fallbackWords
            }
            
            allResults.push(fallbackSentence)
          }
        }
        
        console.log(`${languageConfig.name} sentence processing complete: processed ${allResults.length} sentences`)
        
        const totalVerbs = allResults.reduce((count, sentence) => {
          return count + Object.values(sentence.words || {}).filter((word: any) => word.wordType === 'VERB').length
        }, 0)
        console.log(`Total ${languageConfig.name} verbs found: ${totalVerbs}`)
        
        return { sentences: allResults }
        
      } catch (error) {
        console.error(`Error in ${languageConfig.name} sentence processing:`, error)
        
        // Complete fallback
        const fallbackAnalysis = {
          sentences: sentences.map(s => ({
            sentenceTranslation: `[Translation of: ${s.text}]`,
            words: Object.fromEntries(s.words.map(word => {
              const isLikelyVerb = new RegExp(`(${verbEndingPattern})$`).test(word) || 
                languageConfig.commonVerbs.some(v => word.toLowerCase().includes(v.toLowerCase()))
              
              return [word, {
                baseForm: word,
                wordType: isLikelyVerb ? "VERB" : "NOUN",
                level: "A2",
                translation: `[Translation of: ${word}]`,
                themes: ["General"],
                grammaticalInfo: Object.fromEntries([
                  ...(languageConfig.hasGender ? [["gender", null]] : []),
                  ...(languageConfig.hasCases ? [["case", null]] : []),
                  ["tense", isLikelyVerb ? "present" : null],
                  ["person", null],
                  ["number", null],
                  ["adverbType", null]
                ])
              }]
            }))
          }))
        }
        
        console.log(`Using complete fallback analysis for ${languageConfig.name}`)
        return fallbackAnalysis
      }
    },

    extractThemes: async (text: string, title: string) => {
      try {
        const prompt = `Analyze this ${languageConfig.name} text and identify the main themes:
        
        Title: "${title}"
        Text: "${text}"
        
        JSON response (ONLY JSON, no markdown):
        {
          "themes": [
            {
              "name": "Theme name in ${LANGUAGE_CONFIGS[translationCode as keyof typeof LANGUAGE_CONFIGS]?.name || 'English'}",
              "description": "Brief description",
              "relevance": "high|medium|low",
              "keywords": ["${languageCode}", "words", "related"]
            }
          ]
        }
        
        Focus on themes relevant to ${languageConfig.name} language learning.`

        const completion = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: `You are a text analysis expert. Identify themes in ${languageConfig.name} texts and return valid JSON.`
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
        
        const analysisText = completion.choices[0]?.message?.content?.trim() || ""
        const cleanJson = extractJsonFromResponse(analysisText)
        const themes = safeParseJson(cleanJson)
        
        console.log(`Successfully extracted themes for ${languageConfig.name}:`, themes)
        return themes
      } catch (error) {
        console.error(`Error extracting themes for ${languageConfig.name}:`, error)
        return {
          themes: [
            {
              name: "Language Learning",
              description: `${languageConfig.name} language learning content`,
              relevance: "high",
              keywords: ["language", "learning", "practice"]
            }
          ]
        }
      }
    }
  }
}