// Updated app/api/practice/generate-quiz/route.ts
import { createTranslator } from '@/lib/translator';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { baseForm, type, context } = body;

    if (!baseForm || !type) {
      return NextResponse.json({ error: 'Missing baseForm or type' }, { status: 400 });
    }

    console.log(`Generating quiz for: ${baseForm} (${type})`);

    // Get the translation for the target word
    const translator = createTranslator();
    let targetTranslation = '';

    // First try to get translation from our database
    const existingWord = await getWordFromDatabase(baseForm, type, session.user.id);
    if (existingWord && existingWord.translation) {
      targetTranslation = existingWord.translation;
    } else {
      // Fallback to AI translation
      targetTranslation = await translator.translate(baseForm, { from: 'de', to: 'en' }, context);
    }

    console.log(`Target translation: ${targetTranslation}`);

    // Generate distractors with improved randomization
    const distractors = await generateRandomizedDistractors(baseForm, type, session.user.id, targetTranslation);
    
    console.log(`Generated ${distractors.length} distractors:`, distractors.map(d => d.text));

    // Create quiz options
    const options = [
      {
        id: 'correct',
        text: targetTranslation,
        isCorrect: true
      },
      ...distractors.map((distractor, index) => ({
        id: `option-${index + 1}`,
        text: distractor.text,
        isCorrect: false
      }))
    ];

    // Shuffle options
    const shuffledOptions = options
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);

    const quizData = {
      word: {
        german: baseForm,
        baseForm: baseForm,
        type: type,
      },
      options: shuffledOptions,
    };

    return NextResponse.json(quizData);

  } catch (error) {
    console.error('Failed to generate quiz:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}

async function getWordFromDatabase(baseForm: string, type: string, userId: string) {
  try {
    // Try to find the word in user's extracted words first
    const extractedWord = await prisma.extractedWord.findFirst({
      where: {
        baseForm: { equals: baseForm, mode: 'insensitive' },
        type: type,
        savedText: { userId: userId },
        translation: { not: null }
      }
    });

    if (extractedWord) {
      return extractedWord;
    }

    // Try theme category words
    const themeWord = await prisma.themeCategoryWord.findFirst({
      where: {
        text: { equals: baseForm, mode: 'insensitive' },
        type: type
      }
    });

    return themeWord;
  } catch (error) {
    console.error('Error getting word from database:', error);
    return null;
  }
}

async function generateRandomizedDistractors(
  targetWord: string, 
  type: string, 
  userId: string,
  targetTranslation: string
): Promise<Array<{ text: string; source: string }>> {
  const distractors: Array<{ text: string; source: string }> = [];
  const usedTranslations = new Set([targetTranslation.toLowerCase()]);
  
  try {
    // Strategy 1: Random selection from user's vocabulary with the same type
    const userWords = await getRandomUserWords(targetWord, type, userId, 15); // Get more words to choose from
    
    // Randomly select from user's words
    const shuffledUserWords = userWords
      .filter(word => word.translation && !usedTranslations.has(word.translation.toLowerCase()))
      .sort(() => Math.random() - 0.5) // Randomize order
      .slice(0, 3); // Take up to 3

    shuffledUserWords.forEach(word => {
      if (word.translation && distractors.length < 3 && !usedTranslations.has(word.translation.toLowerCase())) {
        distractors.push({
          text: word.translation,
          source: 'user_vocabulary'
        });
        usedTranslations.add(word.translation.toLowerCase());
      }
    });

    console.log(`Found ${distractors.length} distractors from user vocabulary`);

    // Strategy 2: Random theme words of the same type
    if (distractors.length < 3) {
      const themeWords = await getRandomThemeWords(targetWord, type, 10);
      
      const shuffledThemeWords = themeWords
        .filter(word => word.translation && !usedTranslations.has(word.translation.toLowerCase()))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 - distractors.length);

      shuffledThemeWords.forEach(word => {
        if (distractors.length < 3 && !usedTranslations.has(word.translation.toLowerCase())) {
          distractors.push({
            text: word.translation,
            source: 'theme_vocabulary'
          });
          usedTranslations.add(word.translation.toLowerCase());
        }
      });

      console.log(`Added ${shuffledThemeWords.length} distractors from theme vocabulary`);
    }

    // Strategy 3: Mixed type words from user's vocabulary (if same-type not enough)
    if (distractors.length < 3) {
      const mixedUserWords = await getRandomMixedUserWords(targetWord, userId, 10);
      
      const shuffledMixedWords = mixedUserWords
        .filter(word => word.translation && !usedTranslations.has(word.translation.toLowerCase()))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 - distractors.length);

      shuffledMixedWords.forEach(word => {
        if (distractors.length < 3 && !usedTranslations.has(word.translation.toLowerCase())) {
          distractors.push({
            text: word.translation,
            source: 'mixed_user_vocabulary'
          });
          usedTranslations.add(word.translation.toLowerCase());
        }
      });

      console.log(`Added ${shuffledMixedWords.length} distractors from mixed user vocabulary`);
    }

    // Strategy 4: Randomized type-specific fallbacks
    if (distractors.length < 3) {
      const typeSpecificFallbacks = getRandomizedTypeSpecificFallbacks(type, targetTranslation, 5);
      
      typeSpecificFallbacks.forEach(fallback => {
        if (distractors.length < 3 && !usedTranslations.has(fallback.toLowerCase())) {
          distractors.push({
            text: fallback,
            source: 'type_fallback'
          });
          usedTranslations.add(fallback.toLowerCase());
        }
      });

      console.log(`Added ${typeSpecificFallbacks.length} type-specific fallback distractors`);
    }

    // Strategy 5: Final random fallbacks
    if (distractors.length < 3) {
      const finalFallbacks = getRandomizedGenericFallbacks(targetTranslation, usedTranslations);
      
      finalFallbacks.forEach(fallback => {
        if (distractors.length < 3) {
          distractors.push({
            text: fallback,
            source: 'final_fallback'
          });
        }
      });

      console.log(`Added final fallbacks, total distractors: ${distractors.length}`);
    }

    return distractors.slice(0, 3);

  } catch (error) {
    console.error('Error generating distractors:', error);
    
    // Emergency fallback with randomization
    const emergency = ['House', 'Car', 'Book', 'Water', 'Food', 'Tree', 'Dog', 'Cat', 'Sun', 'Moon']
      .filter(word => word.toLowerCase() !== targetTranslation.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
      
    return emergency.map(text => ({ text, source: 'emergency' }));
  }
}

// New helper function for random user words
async function getRandomUserWords(targetWord: string, type: string, userId: string, limit: number) {
  try {
    // Use raw SQL for better randomization
    const randomUserWords = await prisma.$queryRaw`
      SELECT "baseForm", "type", "translation"
      FROM "ExtractedWord" ew
      JOIN "SavedText" st ON ew."savedTextId" = st.id
      WHERE st."userId" = ${userId}
        AND ew."type" = ${type}
        AND LOWER(ew."baseForm") != LOWER(${targetWord})
        AND ew."translation" IS NOT NULL
        AND ew."translation" != ''
      ORDER BY RANDOM()
      LIMIT ${limit}
    ` as Array<{ baseForm: string; type: string; translation: string }>;

    return randomUserWords;
  } catch (error) {
    console.error('Error getting random user words:', error);
    return [];
  }
}

// New helper function for random theme words
async function getRandomThemeWords(targetWord: string, type: string, limit: number) {
  try {
    const randomThemeWords = await prisma.$queryRaw`
      SELECT "text", "type", "translation"
      FROM "ThemeCategoryWord"
      WHERE "type" = ${type}
        AND LOWER("text") != LOWER(${targetWord})
        AND "translation" IS NOT NULL
        AND "translation" != ''
      ORDER BY RANDOM()
      LIMIT ${limit}
    ` as Array<{ text: string; type: string; translation: string }>;

    return randomThemeWords;
  } catch (error) {
    console.error('Error getting random theme words:', error);
    return [];
  }
}

// New helper function for mixed user words (different types)
async function getRandomMixedUserWords(targetWord: string, userId: string, limit: number) {
  try {
    const randomMixedWords = await prisma.$queryRaw`
      SELECT "baseForm", "type", "translation"
      FROM "ExtractedWord" ew
      JOIN "SavedText" st ON ew."savedTextId" = st.id
      WHERE st."userId" = ${userId}
        AND LOWER(ew."baseForm") != LOWER(${targetWord})
        AND ew."translation" IS NOT NULL
        AND ew."translation" != ''
      ORDER BY RANDOM()
      LIMIT ${limit}
    ` as Array<{ baseForm: string; type: string; translation: string }>;

    return randomMixedWords;
  } catch (error) {
    console.error('Error getting random mixed words:', error);
    return [];
  }
}

function getRandomizedTypeSpecificFallbacks(type: string, targetTranslation: string, count: number): string[] {
  let fallbacks: string[] = [];
  
  switch (type.toUpperCase()) {
    case 'VERB':
      fallbacks = [
        'to run', 'to eat', 'to sleep', 'to walk', 'to speak', 'to read', 'to write', 
        'to think', 'to play', 'to work', 'to sing', 'to dance', 'to cook', 'to drive',
        'to learn', 'to teach', 'to help', 'to buy', 'to sell', 'to travel'
      ];
      break;
    
    case 'NOUN':
      fallbacks = [
        'house', 'car', 'book', 'table', 'chair', 'dog', 'cat', 'tree', 'flower', 
        'water', 'bread', 'milk', 'phone', 'computer', 'school', 'hospital',
        'restaurant', 'park', 'beach', 'mountain'
      ];
      break;
    
    case 'ADJ':
    case 'ADJECTIVE':
      fallbacks = [
        'big', 'small', 'red', 'blue', 'fast', 'slow', 'hot', 'cold', 'good', 'bad',
        'beautiful', 'ugly', 'smart', 'stupid', 'happy', 'sad', 'young', 'old',
        'rich', 'poor'
      ];
      break;
    
    case 'ADVERB':
      fallbacks = [
        'quickly', 'slowly', 'carefully', 'loudly', 'quietly', 'here', 'there',
        'now', 'later', 'always', 'never', 'sometimes', 'often', 'rarely',
        'everywhere', 'nowhere', 'today', 'tomorrow', 'yesterday', 'well'
      ];
      break;
    
    default:
      fallbacks = [
        'house', 'car', 'book', 'water', 'food', 'big', 'small', 'to run', 
        'quickly', 'here', 'good', 'bad', 'tree', 'dog', 'cat'
      ];
  }

  // Filter out the target translation and randomize
  return fallbacks
    .filter(word => word.toLowerCase() !== targetTranslation.toLowerCase())
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function getRandomizedGenericFallbacks(targetTranslation: string, usedTranslations: Set<string>): string[] {
  const generic = [
    'House', 'Car', 'Book', 'Water', 'Food', 'Tree', 'Dog', 'Cat', 'Sun', 'Moon',
    'Red', 'Blue', 'Big', 'Small', 'Good', 'Bad', 'Fast', 'Slow', 'Hot', 'Cold',
    'to go', 'to see', 'to have', 'to be', 'to do', 'to get', 'to make', 'to take',
    'quickly', 'slowly', 'well', 'here', 'there', 'now', 'always', 'never'
  ];

  return generic
    .filter(word => 
      word.toLowerCase() !== targetTranslation.toLowerCase() && 
      !usedTranslations.has(word.toLowerCase())
    )
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      supportedTypes: ['VERB', 'NOUN', 'ADJ', 'ADVERB'],
      message: 'Quiz generation service is available with improved randomization'
    });

  } catch (error) {
    console.error('Error in quiz generation service:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}