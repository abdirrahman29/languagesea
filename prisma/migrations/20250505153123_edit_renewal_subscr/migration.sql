-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'A1',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verbsLearned" INTEGER NOT NULL DEFAULT 0,
    "nounsLearned" INTEGER NOT NULL DEFAULT 0,
    "adjectivesLearned" INTEGER NOT NULL DEFAULT 0,
    "textsProcessed" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verb" (
    "id" SERIAL NOT NULL,
    "baseForm" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "infinitive" TEXT,
    "infinitiveId" INTEGER,
    "coOccurrenceBitmask" TEXT,
    "bigramsAndPositionHex" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerbConjugation" (
    "id" TEXT NOT NULL,
    "verbId" INTEGER NOT NULL,
    "tense" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "formId" INTEGER,

    CONSTRAINT "VerbConjugation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Noun" (
    "id" SERIAL NOT NULL,
    "baseForm" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "gender" TEXT,
    "coOccurrenceBitmask" TEXT,
    "bigramsAndPositionHex" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Noun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NounCase" (
    "id" TEXT NOT NULL,
    "nounId" INTEGER NOT NULL,
    "case" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "formId" INTEGER,

    CONSTRAINT "NounCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjective" (
    "id" SERIAL NOT NULL,
    "baseForm" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "coOccurrenceBitmask" TEXT,
    "bigramsAndPositionHex" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjectiveDeclension" (
    "id" TEXT NOT NULL,
    "adjectiveId" INTEGER NOT NULL,
    "case" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "formId" INTEGER,

    CONSTRAINT "AdjectiveDeclension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjectiveComparison" (
    "id" TEXT NOT NULL,
    "adjectiveId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "example" TEXT,

    CONSTRAINT "AdjectiveComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedText" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "excerpt" TEXT,
    "wordCount" INTEGER NOT NULL,
    "readingTime" INTEGER NOT NULL,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextStats" (
    "id" TEXT NOT NULL,
    "savedTextId" TEXT NOT NULL,
    "totalWords" INTEGER NOT NULL,
    "verbs" INTEGER NOT NULL,
    "nouns" INTEGER NOT NULL,
    "adjectives" INTEGER NOT NULL,
    "adverbs" INTEGER NOT NULL,
    "newWords" INTEGER NOT NULL,
    "practicedWords" INTEGER NOT NULL,
    "knownFromOtherTexts" INTEGER NOT NULL,
    "levelA1" INTEGER NOT NULL,
    "levelA2" INTEGER NOT NULL,
    "levelB1" INTEGER NOT NULL,
    "levelB2Plus" INTEGER NOT NULL,

    CONSTRAINT "TextStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedWord" (
    "id" TEXT NOT NULL,
    "savedTextId" TEXT NOT NULL,
    "baseForm" TEXT NOT NULL,
    "originalForm" TEXT,
    "type" TEXT NOT NULL,
    "level" TEXT,
    "gender" TEXT,
    "case" TEXT,
    "tense" TEXT,
    "translation" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "sentence" TEXT,
    "sentenceTranslation" TEXT,
    "isRepeat" BOOLEAN NOT NULL DEFAULT false,
    "verbId" INTEGER,
    "nounId" INTEGER,
    "adjectiveId" INTEGER,

    CONSTRAINT "ExtractedWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticedWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseForm" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "practiced" BOOLEAN NOT NULL DEFAULT false,
    "lastPracticed" TIMESTAMP(3),
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "verbId" INTEGER,
    "nounId" INTEGER,
    "adjectiveId" INTEGER,

    CONSTRAINT "PracticedWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordCollocation" (
    "id" TEXT NOT NULL,
    "firstWord" TEXT NOT NULL,
    "secondWord" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "example" TEXT,
    "themes" TEXT[],

    CONSTRAINT "WordCollocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ThemeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeCategoryWord" (
    "id" TEXT NOT NULL,
    "themeCategoryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "gender" TEXT,

    CONSTRAINT "ThemeCategoryWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_key" ON "UserProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TextStats_savedTextId_key" ON "TextStats"("savedTextId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticedWord_userId_baseForm_type_key" ON "PracticedWord"("userId", "baseForm", "type");

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerbConjugation" ADD CONSTRAINT "VerbConjugation_verbId_fkey" FOREIGN KEY ("verbId") REFERENCES "Verb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NounCase" ADD CONSTRAINT "NounCase_nounId_fkey" FOREIGN KEY ("nounId") REFERENCES "Noun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjectiveDeclension" ADD CONSTRAINT "AdjectiveDeclension_adjectiveId_fkey" FOREIGN KEY ("adjectiveId") REFERENCES "Adjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjectiveComparison" ADD CONSTRAINT "AdjectiveComparison_adjectiveId_fkey" FOREIGN KEY ("adjectiveId") REFERENCES "Adjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedText" ADD CONSTRAINT "SavedText_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextStats" ADD CONSTRAINT "TextStats_savedTextId_fkey" FOREIGN KEY ("savedTextId") REFERENCES "SavedText"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedWord" ADD CONSTRAINT "ExtractedWord_savedTextId_fkey" FOREIGN KEY ("savedTextId") REFERENCES "SavedText"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedWord" ADD CONSTRAINT "ExtractedWord_verbId_fkey" FOREIGN KEY ("verbId") REFERENCES "Verb"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedWord" ADD CONSTRAINT "ExtractedWord_nounId_fkey" FOREIGN KEY ("nounId") REFERENCES "Noun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedWord" ADD CONSTRAINT "ExtractedWord_adjectiveId_fkey" FOREIGN KEY ("adjectiveId") REFERENCES "Adjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticedWord" ADD CONSTRAINT "PracticedWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticedWord" ADD CONSTRAINT "PracticedWord_verbId_fkey" FOREIGN KEY ("verbId") REFERENCES "Verb"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticedWord" ADD CONSTRAINT "PracticedWord_nounId_fkey" FOREIGN KEY ("nounId") REFERENCES "Noun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticedWord" ADD CONSTRAINT "PracticedWord_adjectiveId_fkey" FOREIGN KEY ("adjectiveId") REFERENCES "Adjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeCategoryWord" ADD CONSTRAINT "ThemeCategoryWord_themeCategoryId_fkey" FOREIGN KEY ("themeCategoryId") REFERENCES "ThemeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
