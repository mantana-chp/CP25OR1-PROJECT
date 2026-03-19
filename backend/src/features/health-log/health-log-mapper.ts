import { health_logs } from '../../generated/prisma/client';
import { HealthLogDto } from './health-log-types';

type HealthLogWithCreator = health_logs & {
  created_by: {
    id: string;
    current_installation_id: string;
  };
};

export const toDto = (log: HealthLogWithCreator, createdBy: string): HealthLogDto => {
  return {
    id: log.id,
    petId: log.pet_id,
    createdByUserId: log.created_by_user_id,
    createdBy,
    description: log.description,
    weight: log.weight ? parseFloat(log.weight.toString()) : undefined,
    note: log.note || undefined,
    loggedAt: log.logged_at,
    createdAt: log.created_at,
    updatedAt: log.updated_at,
  };
};
