import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard';
import {
    deleteMedicalDocument,
    getMedicalDocuments,
    requestMedicalDocumentUploadUrls,
    saveMedicalDocuments,
} from './pet-medical-document-controller';

const router = Router();

router.post(
    '/:petId/medical-documents/request-urls',
    authGuard,
    requestMedicalDocumentUploadUrls,
);
router.post('/:petId/medical-documents/save', authGuard, saveMedicalDocuments);
router.get('/:petId/medical-documents', authGuard, getMedicalDocuments);
router.delete(
    '/:petId/medical-documents/:documentId',
    authGuard,
    deleteMedicalDocument,
);

export default router;
