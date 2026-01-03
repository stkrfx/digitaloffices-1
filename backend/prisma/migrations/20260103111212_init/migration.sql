-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('AUD', 'USD');

-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'AUD',
ALTER COLUMN "timezone" SET DEFAULT 'Australia/Sydney';
