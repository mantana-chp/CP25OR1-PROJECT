import prisma from '../../libs/db';
import { v4 as uuidv4 } from 'uuid';

export const registerPushToken = async (userId: string, token: string) => {
  return await prisma.$transaction(async (tx) => {

    // 1. Delete any old tokens for this user.
    await tx.push_tokens.deleteMany({
      where: {
        user_id: userId,
      },
    });

    // 2. Create the new token.
    const newPushToken = await tx.push_tokens.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        token: token,
        last_seen_at: new Date(),
      },
    });

    return newPushToken;
  });
  // success or fail together
};
