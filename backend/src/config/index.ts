
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
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX_NAME || '',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
    bucketName: process.env.MINIO_BUCKET_NAME || 'pet-attachments',
    publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
  },
};
