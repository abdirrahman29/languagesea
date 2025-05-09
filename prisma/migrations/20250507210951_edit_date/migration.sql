/*
  Warnings:

  - The primary key for the `SavedText` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `SavedText` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `savedTextId` on the `ExtractedWord` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `savedTextId` on the `TextStats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ExtractedWord" DROP CONSTRAINT "ExtractedWord_savedTextId_fkey";

-- DropForeignKey
ALTER TABLE "TextStats" DROP CONSTRAINT "TextStats_savedTextId_fkey";

-- AlterTable
ALTER TABLE "ExtractedWord" ADD COLUMN     "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "savedTextId",
ADD COLUMN     "savedTextId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SavedText" DROP CONSTRAINT "SavedText_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "SavedText_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TextStats" DROP COLUMN "savedTextId",
ADD COLUMN     "savedTextId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TextStats_savedTextId_key" ON "TextStats"("savedTextId");

-- AddForeignKey
ALTER TABLE "TextStats" ADD CONSTRAINT "TextStats_savedTextId_fkey" FOREIGN KEY ("savedTextId") REFERENCES "SavedText"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedWord" ADD CONSTRAINT "ExtractedWord_savedTextId_fkey" FOREIGN KEY ("savedTextId") REFERENCES "SavedText"("id") ON DELETE CASCADE ON UPDATE CASCADE;
