-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "toothNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
