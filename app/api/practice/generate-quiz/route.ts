// app/api/practice/generate-quiz/route.ts
import { createTranslator } from '@/lib/translator';
import { NextRequest, NextResponse } from 'next/server';

// Mock function to generate quiz options
const generateOptions = (correctAnswer: { text: string; type: string }) => {
  const dummyOptions = [
    { text: 'Apple', isCorrect: false },
    { text: 'House', isCorrect: false },
    { text: 'To Go', isCorrect: false },
    { text: 'The Book', isCorrect: false },
  ];
  const options = dummyOptions
    .filter(opt => opt.text !== correctAnswer.text)
    .slice(0, 3);
  
  options.push({ text: correctAnswer.text, isCorrect: true });

  // Shuffle the options
  return options
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }, i) => ({ ...value, id: `option-${i + 1}` }));
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseForm, type, context } = body;

    if (!baseForm || !type) {
      return NextResponse.json({ error: 'Missing baseForm or type' }, { status: 400 });
    }

    // In a real app, you would fetch the translation and generate distractors
    // using a dictionary or another AI call. For now, we'll mock it.
    const translator = createTranslator();
    
    // Use the translator to get the actual translation
    const translationResult = await translator.translate(baseForm, { from: 'de', to: 'en' });
    const realTranslation = translationResult; // The translator.ts file you provided returns a string directly.


    const quizData = {
      word: {
        german: baseForm, // You might pass the inflected form here too
        baseForm: baseForm,
        type: type,
      },
      options: generateOptions({ text: realTranslation, type: type }),
    };

    return NextResponse.json(quizData);

  } catch (error) {
    console.error('Failed to generate quiz:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}