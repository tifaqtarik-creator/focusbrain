-- AlterTable : préférences linguistiques pour l'appariement
ALTER TABLE "users" ADD COLUMN "preferredLanguages" TEXT[];

-- AlterTable : types de sessions (instantanée / planifiée / récurrente) + description
ALTER TABLE "slots" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "recurrenceRule" TEXT,
ADD COLUMN     "seriesId" TEXT;
