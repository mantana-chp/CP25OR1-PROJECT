import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import * as medicalDocumentService from './pet-medical-document-service';
import {
    documentIdParamsSchema,
    petIdParamsSchema,
    requestMedicalDocumentUploadUrlsSchema,
    saveMedicalDocumentsSchema,
} from './pet-medical-document-schema';

export const requestMedicalDocumentUploadUrls = asyncHandler(
    async (req: Request, res: Response) => {
        const {
            params: { petId },
            body,
        } = requestMedicalDocumentUploadUrlsSchema.parse(req);
        const { id: userId } = req.user!;

        const result = await medicalDocumentService.requestMedicalDocumentUploadUrls(
            petId,
            userId,
            body,
        );

        sendSuccess(res, { files: result }, 200);
    },
);

export const saveMedicalDocuments = asyncHandler(
    async (req: Request, res: Response) => {
        const {
            params: { petId },
            body,
        } = saveMedicalDocumentsSchema.parse(req);
        const { id: userId } = req.user!;

        const documents = await medicalDocumentService.saveMedicalDocuments(
            petId,
            userId,
            body,
        );

        sendSuccess(res, { documents }, 201);
    },
);

export const getMedicalDocuments = asyncHandler(
    async (req: Request, res: Response) => {
        const { petId } = petIdParamsSchema.parse(req.params);
        const { id: userId } = req.user!;

        const documents = await medicalDocumentService.getMedicalDocuments(
            petId,
            userId,
        );

        sendSuccess(res, { documents }, 200);
    },
);

export const deleteMedicalDocument = asyncHandler(
    async (req: Request, res: Response) => {
        const {
            petId,
            documentId,
        } = documentIdParamsSchema.parse(req.params);
        const { id: userId } = req.user!;

        await medicalDocumentService.deleteMedicalDocument(
            petId,
            documentId,
            userId,
        );

        sendSuccess(res, undefined, 200);
    },
);
