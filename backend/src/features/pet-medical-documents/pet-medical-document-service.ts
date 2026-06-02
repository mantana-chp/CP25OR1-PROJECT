import * as medicalDocumentRepository from './pet-medical-document-repository';
import { generateObjectKey } from '../file-uploads/upload-service';
import { minioClient } from '../../libs/minio-client';
import { canAccessPet } from '../pet-sharing/pet-sharing-repository';
import prisma from '../../libs/db';
import {
    ApiError,
    BadRequestError,
    NotFoundError,
} from '../../shared/errors';
import { logger } from '../../libs/logger';

const PRESIGNED_PUT_EXPIRY = 300;
const PRESIGNED_GET_EXPIRY = 3600;

export interface MedicalDocumentDto {
    id: string;
    petId: string;
    createdByUserId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    objectKey: string;
    downloadUrl: string;
    createdAt: Date;
}

export interface RequestUploadFileInput {
    fileName: string;
    fileType: string;
    fileSize: number;
}

export interface SaveMedicalDocumentInput {
    objectKey: string;
    fileName: string;
    fileType: string;
    fileSize: number;
}

async function assertCanAccessMedicalDocuments(petId: string, userId: string): Promise<void> {
    const hasAccess = await canAccessPet(petId, userId);
    if (!hasAccess) {
        throw new ApiError('Forbidden', 403, [
            { message: 'Access to this pet denied' },
        ]);
    }
}

async function getPetOwnerId(petId: string): Promise<string> {
    const pet = await prisma.pets.findUnique({
        where: { id: petId },
        select: { user_id: true },
    });
    if (!pet) throw new NotFoundError('Pet not found');
    return pet.user_id;
}

function assertMedicalDocumentObjectKey(
    objectKey: string,
    userId: string,
    petId: string,
): void {
    const expectedPrefix = `medical-documents/${userId}/${petId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
        throw new BadRequestError('Invalid object key for this medical document.');
    }
}

async function toDto(document: {
    id: string;
    pet_id: string;
    created_by_user_id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    object_key: string;
    created_at: Date;
}): Promise<MedicalDocumentDto> {
    const downloadUrl = await minioClient.generatePresignedGetUrl(
        document.object_key,
        PRESIGNED_GET_EXPIRY,
    );

    return {
        id: document.id,
        petId: document.pet_id,
        createdByUserId: document.created_by_user_id,
        fileName: document.file_name,
        fileType: document.file_type,
        fileSize: document.file_size,
        objectKey: document.object_key,
        downloadUrl,
        createdAt: document.created_at,
    };
}

export async function requestMedicalDocumentUploadUrls(
    petId: string,
    userId: string,
    files: RequestUploadFileInput[],
): Promise<Array<{ fileName: string; objectKey: string; uploadUrl: string; expiresIn: number }>> {
    await assertCanAccessMedicalDocuments(petId, userId);

    return Promise.all(
        files.map(async (file) => {
            const objectKey = generateObjectKey(
                'medical-document',
                userId,
                petId,
                file.fileName,
            );
            const uploadUrl = await minioClient.generatePresignedPutUrl(
                objectKey,
                PRESIGNED_PUT_EXPIRY,
            );
            return {
                fileName: file.fileName,
                objectKey,
                uploadUrl,
                expiresIn: PRESIGNED_PUT_EXPIRY,
            };
        }),
    );
}

export async function saveMedicalDocuments(
    petId: string,
    userId: string,
    files: SaveMedicalDocumentInput[],
): Promise<MedicalDocumentDto[]> {
    await assertCanAccessMedicalDocuments(petId, userId);

    for (const file of files) {
        assertMedicalDocumentObjectKey(file.objectKey, userId, petId);
        const objectExists = await minioClient.objectExists(file.objectKey);
        if (!objectExists) {
            throw new BadRequestError(
                `Uploaded file not found in storage for ${file.fileName}. Please upload again.`,
            );
        }
    }

    const created = [];
    for (const file of files) {
        const document = await medicalDocumentRepository.create({
            pet_id: petId,
            created_by_user_id: userId,
            object_key: file.objectKey,
            file_name: file.fileName,
            file_type: file.fileType,
            file_size: file.fileSize,
        });
        created.push(document);
    }

    return Promise.all(created.map(toDto));
}

export async function getMedicalDocuments(
    petId: string,
    userId: string,
): Promise<MedicalDocumentDto[]> {
    await assertCanAccessMedicalDocuments(petId, userId);
    const documents = await medicalDocumentRepository.findByPetId(petId);
    return Promise.all(documents.map(toDto));
}

export async function deleteMedicalDocument(
    petId: string,
    documentId: string,
    userId: string,
): Promise<void> {
    await assertCanAccessMedicalDocuments(petId, userId);

    const document = await medicalDocumentRepository.findById(documentId);
    if (!document) throw new NotFoundError('Medical document not found');
    if (document.pet_id !== petId) {
        throw new ApiError('Forbidden', 403, [
            { message: 'Medical document does not belong to this pet' },
        ]);
    }

    const petOwnerId = await getPetOwnerId(petId);
    const isPetOwner = petOwnerId === userId;
    if (!isPetOwner && document.created_by_user_id !== userId) {
        throw new ApiError('Forbidden', 403, [
            {
                message:
                    'Caregivers can only delete medical documents they uploaded themselves',
            },
        ]);
    }

    await minioClient.deleteObject(document.object_key).catch((err) => {
        logger.warn(
            `Could not delete medical document object ${document.object_key}: ${err}`,
        );
    });

    await medicalDocumentRepository.deleteById(documentId);
}
