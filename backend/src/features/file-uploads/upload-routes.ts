import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import {
    requestUploadUrlSchema,
    confirmUploadSchema,
} from './upload-schema';
import * as uploadController from './upload-controller';

const router = Router();

/**
 * @swagger
 * /api/uploads/request-url:
 *   post:
 *     summary: Request presigned URL for file upload
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *               - fileSize
 *               - category
 *               - entityId
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "my-pet.jpg"
 *               fileType:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp, application/pdf]
 *               fileSize:
 *                 type: number
 *                 example: 1048576
 *               category:
 *                 type: string
 *                 enum: [pet-profile, reminder-attachment]
 *               entityId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 */
router.post(
    '/request-url',
    authGuard,
    validate(requestUploadUrlSchema),
    uploadController.requestUploadUrl
);

/**
 * @swagger
 * /api/uploads/confirm:
 *   post:
 *     summary: Confirm file upload completion
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - objectKey
 *               - entityId
 *               - category
 *             properties:
 *               objectKey:
 *                 type: string
 *               entityId:
 *                 type: string
 *                 format: uuid
 *               category:
 *                 type: string
 *                 enum: [pet-profile, reminder-attachment]
 *     responses:
 *       200:
 *         description: Upload confirmed
 */
router.post(
    '/confirm',
    authGuard,
    validate(confirmUploadSchema),
    uploadController.confirmUpload
);

/**
 * @swagger
 * /api/uploads/download:
 *   get:
 *     summary: Get download URL for a file
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The MinIO object key (e.g. pet-images/userId/petId/uuid.jpg)
 *     responses:
 *       200:
 *         description: Download URL generated
 */
router.get(
    '/download',
    authGuard,
    uploadController.getDownloadUrl
);

export default router;
