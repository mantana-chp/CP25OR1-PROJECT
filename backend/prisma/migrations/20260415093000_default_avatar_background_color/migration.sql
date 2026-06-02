UPDATE "pets"
SET "avatar_background_color" = '#5FA7D1'
WHERE "avatar_background_color" IS NULL OR TRIM("avatar_background_color") = '';

ALTER TABLE "pets"
ALTER COLUMN "avatar_background_color" SET DEFAULT '#5FA7D1';
