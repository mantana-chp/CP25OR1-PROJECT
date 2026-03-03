import cron from 'node-cron';
import { logger } from '../libs/logger';
import * as petRepository from '../features/pets/pet-repository';
import { deleteFile } from '../features/file-uploads/upload-service';

const SOFT_DELETE_RETENTION_DAYS = 30;

/**
 * Hard-delete pets that have been soft-deleted for more than 30 days.
 * The cascade on the DB relations will clean up reminders and notifications.
 */
const cleanupDeletedPets = async () => {
    logger.info('[PetCleanup] Checking for pets to permanently delete...');

    const petsToDelete = await petRepository.findSoftDeletedPetsOlderThan(SOFT_DELETE_RETENTION_DAYS);

    if (petsToDelete.length === 0) {
        logger.info('[PetCleanup] No pets to permanently delete.');
        return;
    }

    logger.info(`[PetCleanup] Found ${petsToDelete.length} pet(s) to permanently delete.`);

    for (const pet of petsToDelete) {
        try {
            // Delete profile image from MinIO if it exists
            if (pet.profile_image_key) {
                try {
                    await deleteFile(pet.profile_image_key);
                    logger.info(`[PetCleanup] Deleted profile image for pet ${pet.id}`);
                } catch (error: unknown) {
                    logger.error(`[PetCleanup] Failed to delete profile image for pet ${pet.id}:`, error instanceof Error ? error : new Error(String(error)));
                    // Continue with hard delete even if image deletion fails
                }
            }

            // Hard delete the pet (cascade deletes reminders & notifications)
            await petRepository.hardDeletePet(pet.id);
            logger.info(`[PetCleanup] Permanently deleted pet ${pet.id}`);
        } catch (error: unknown) {
            logger.error(`[PetCleanup] Failed to permanently delete pet ${pet.id}:`, error instanceof Error ? error : new Error(String(error)));
        }
    }

    logger.info(`[PetCleanup] Cleanup complete. Processed ${petsToDelete.length} pet(s).`);
};

// Run daily at midnight UTC
const petCleanupJob = cron.schedule('0 0 * * *', async () => {
    logger.info('Running job: Pet cleanup (hard-delete expired soft-deleted pets)...');
    try {
        await cleanupDeletedPets();
        logger.info('Finished job: Pet cleanup.');
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error('Error running pet cleanup job:', error);
        } else {
            logger.error('Error running pet cleanup job:', new Error(String(error)));
        }
    }
}, {
    timezone: 'Etc/UTC'
});

export const startPetCleanupScheduler = () => {
    petCleanupJob.start();

    const now = new Date();
    const nowUTC = now.toISOString();

    logger.info('========================================');
    logger.info('🗑️ Pet Cleanup Scheduler Started');
    logger.info('========================================');
    logger.info(`Current time: ${nowUTC} (UTC)`);
    logger.info('Schedule: 0 0 * * * (daily at midnight UTC)');
    logger.info(`Description: Permanently deletes pets soft-deleted more than ${SOFT_DELETE_RETENTION_DAYS} days ago`);
    logger.info('========================================');
};
