
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET || 'super-duper-secret',
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
};
