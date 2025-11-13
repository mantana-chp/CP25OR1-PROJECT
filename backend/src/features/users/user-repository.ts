import prisma from '../../libs/db';
import { v4 as uuidv4 } from 'uuid';

export const deletePushTokensByUserId = async (userId: string) => {
  return await prisma.push_tokens.deleteMany({
    where: {
      user_id: userId,
    },
  });
};

export const createPushToken = async (userId: string, token: string, provider: string) => {
  return await prisma.push_tokens.create({
    data: {
      id: uuidv4(),
      user_id: userId,
      token: token,
      provider: provider,
      last_seen_at: new Date(),
    },
  });
};
