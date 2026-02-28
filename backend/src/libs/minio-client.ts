import * as Minio from 'minio';
import { config } from '../config';
import { logger } from './logger';

/**
 * MinIO Client Singleton
 * 
 * Internal connection (Docker network):
 * - Endpoint: 'minio' (Docker service name)
 * - Port: 9000
 * - SSL: false (internal communication)
 * 
 * The client connects to MinIO using internal Docker networking.
 * Presigned URLs will be generated using MINIO_PUBLIC_URL for external access.
 */
class MinIOClient {
    private client: Minio.Client;
    private bucketName: string;
    private isInitialized = false;

    constructor() {
        this.client = new Minio.Client({
            endPoint: config.minio.endpoint,
            port: config.minio.port,
            useSSL: config.minio.useSSL,
            accessKey: config.minio.accessKey,
            secretKey: config.minio.secretKey,
        });

        this.bucketName = config.minio.bucketName;
    }

    /**
     * Initialize MinIO: Create bucket if it doesn't exist
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            const bucketExists = await this.client.bucketExists(this.bucketName);

            if (!bucketExists) {
                await this.client.makeBucket(this.bucketName, 'us-east-1');
                logger.info(`MinIO bucket created: ${this.bucketName}`);

                // Set bucket to private (default, but explicit)
                // No public policy - all access via presigned URLs
            } else {
                logger.info(`MinIO bucket exists: ${this.bucketName}`);
            }

            this.isInitialized = true;
        } catch (error) {
            logger.error('Failed to initialize MinIO:', error as Error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Generate a presigned PUT URL for uploading
     * @param objectKey - The S3 object key (path)
     * @param expirySeconds - URL expiry time (default: 5 minutes)
     * @returns Presigned PUT URL
     */
    async generatePresignedPutUrl(
        objectKey: string,
        expirySeconds: number = 300 // 5 minutes
    ): Promise<string> {
        try {
            const url = await this.client.presignedPutObject(
                this.bucketName,
                objectKey,
                expirySeconds
            );

            // Replace internal Docker endpoint with public URL for client access
            const publicUrl = this.replaceWithPublicUrl(url);
            return publicUrl;
        } catch (error) {
            logger.error('Failed to generate presigned PUT URL:', error as Error);
            throw new Error('Failed to generate upload URL');
        }
    }

    /**
     * Generate a presigned GET URL for downloading/viewing
     * @param objectKey - The S3 object key (path)
     * @param expirySeconds - URL expiry time (default: 1 hour)
     * @returns Presigned GET URL
     */
    async generatePresignedGetUrl(
        objectKey: string,
        expirySeconds: number = 3600 // 1 hour
    ): Promise<string> {
        try {
            const url = await this.client.presignedGetObject(
                this.bucketName,
                objectKey,
                expirySeconds
            );

            // Replace internal Docker endpoint with public URL
            const publicUrl = this.replaceWithPublicUrl(url);
            return publicUrl;
        } catch (error) {
            logger.error('Failed to generate presigned GET URL:', error as Error);
            throw new Error('Failed to generate download URL');
        }
    }

    /**
     * Delete an object from MinIO
     * @param objectKey - The S3 object key to delete
     */
    async deleteObject(objectKey: string): Promise<void> {
        try {
            await this.client.removeObject(this.bucketName, objectKey);
            logger.info(`Deleted object: ${objectKey}`);
        } catch (error) {
            logger.error('Failed to delete object:', error as Error);
            throw new Error('Failed to delete file');
        }
    }

    /**
     * Check if an object exists
     * @param objectKey - The S3 object key to check
     */
    async objectExists(objectKey: string): Promise<boolean> {
        try {
            await this.client.statObject(this.bucketName, objectKey);
            return true;
        } catch (error: any) {
            if (error.code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Get object metadata
     * @param objectKey - The S3 object key
     */
    async getObjectStat(objectKey: string) {
        try {
            return await this.client.statObject(this.bucketName, objectKey);
        } catch (error) {
            logger.error('Failed to get object stat:', error as Error);
            throw new Error('Failed to get file metadata');
        }
    }

    /**
     * Replace internal MinIO endpoint with public URL
     * This is critical for presigned URLs to work from external clients
     */
    private replaceWithPublicUrl(internalUrl: string): string {
        const internalEndpoint = `http${config.minio.useSSL ? 's' : ''}://${config.minio.endpoint}:${config.minio.port}`;
        const publicUrl = config.minio.publicUrl;

        return internalUrl.replace(internalEndpoint, publicUrl);
    }

    /**
     * Get the bucket name
     */
    getBucketName(): string {
        return this.bucketName;
    }
}

// Export singleton instance
export const minioClient = new MinIOClient();
