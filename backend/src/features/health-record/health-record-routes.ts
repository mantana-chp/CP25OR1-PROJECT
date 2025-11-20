import { Router } from 'express';
import { getHealthRecordsController } from './health-record-controller';
import { authGuard } from '../../middlewares/authGuard';

const healthRecordRoutes = Router();

healthRecordRoutes.get('/', authGuard, getHealthRecordsController);

export default healthRecordRoutes;
