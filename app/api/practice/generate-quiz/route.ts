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

    // Generate distractors based on word type and user's vocabulary
    const distractors = await generateTypeSpecificDistractors(baseForm, type, session.user.id);
    
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

async function generateTypeSpecificDistractors(
  targetWord: string, 
  type: string, 
  userId: string
): Promise<Array<{ text: string; source: string }>> {
  const distractors: Array<{ text: string; source: string }> = [];
  
  try {
    // First priority: Get words of the same type from user's vocabulary
    const userWords = await prisma.extractedWord.findMany({
      where: {
        type: type,
        NOT: { baseForm: { equals: targetWord, mode: 'insensitive' } },
        savedText: { userId: userId },
        translation: { not: null }
      },
      take: 5,
      orderBy: {
        dateAdded: 'desc' // Prefer recently learned words
      }
    });

    userWords.forEach(word => {
      if (word.translation && distractors.length < 3) {
        distractors.push({
          text: word.translation,
          source: 'user_vocabulary'
        });
      }
    });

    console.log(`Found ${distractors.length} distractors from user vocabulary`);

    // Second priority: Get words from theme categories of the same type
    if (distractors.length < 3) {
      const themeWords = await prisma.themeCategoryWord.findMany({
        where: {
          type: type,
          NOT: { text: { equals: targetWord, mode: 'insensitive' } },
          translation: { not: null }
        },
        take: 5 - distractors.length,
        orderBy: {
          text: 'asc'
        }
      });

      themeWords.forEach(word => {
        if (distractors.length < 3) {
          distractors.push({
            text: word.translation,
            source: 'theme_vocabulary'
          });
        }
      });

      console.log(`Added ${themeWords.length} distractors from theme vocabulary`);
    }

    // Third priority: Type-specific fallback options
    if (distractors.length < 3) {
      const typeSpecificFallbacks = getTypeSpecificFallbacks(type);
      
      typeSpecificFallbacks.forEach(fallback => {
        if (distractors.length < 3) {
          distractors.push({
            text: fallback,
            source: 'fallback'
          });
        }
      });

      console.log(`Added ${typeSpecificFallbacks.length} fallback distractors`);
    }

    // Final fallback: Generic options
    if (distractors.length < 3) {
      const genericFallbacks = ['House', 'Car', 'Book', 'Water', 'Food'];
      
      genericFallbacks.forEach(fallback => {
        if (distractors.length < 3) {
          distractors.push({
            text: fallback,
            source: 'generic_fallback'
          });
        }
      });

      console.log(`Added generic fallbacks, total distractors: ${distractors.length}`);
    }

    return distractors.slice(0, 3); // Ensure we only return 3 distractors

  } catch (error) {
    console.error('Error generating distractors:', error);
    
    // Emergency fallback
    return [
      { text: 'House', source: 'emergency' },
      { text: 'Car', source: 'emergency' },
      { text: 'Book', source: 'emergency' }
    ];
  }
}

function getTypeSpecificFallbacks(type: string): string[] {
  switch (type.toUpperCase()) {
    case 'VERB':
      return [
        'to run', 'to eat', 'to sleep', 'to walk', 'to speak', 
        'to read', 'to write', 'to think', 'to play', 'to work'
      ];
    
    case 'NOUN':
      return [
        'house', 'car', 'book', 'table', 'chair', 
        'dog', 'cat', 'tree', 'flower', 'water'
      ];
    
    case 'ADJ':
    case 'ADJECTIVE':
      return [
        'big', 'small', 'red', 'blue', 'fast', 
        'slow', 'hot', 'cold', 'good', 'bad'
      ];
    
    case 'ADVERB':
      return [
        'quickly', 'slowly', 'carefully', 'loudly', 'quietly', 
        'here', 'there', 'now', 'later', 'always'
      ];
    
    default:
      return [
        'house', 'car', 'book', 'water', 'food',
        'big', 'small', 'to run', 'quickly', 'here'
      ];
  }
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
      message: 'Quiz generation service is available'
    });

  } catch (error) {
    console.error('Error in quiz generation service:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}