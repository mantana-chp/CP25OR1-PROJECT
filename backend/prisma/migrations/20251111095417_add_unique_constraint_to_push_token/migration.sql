/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `push_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");
