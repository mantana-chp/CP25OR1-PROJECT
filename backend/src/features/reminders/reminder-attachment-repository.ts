import prisma from '../../libs/db';
import { reminder_attachments } from '../../generated/prisma/client';

export const findByReminderId = (reminderId: string): Promise<reminder_attachments[]> => {
    return prisma.reminder_attachments.findMany({
        where: { reminder_id: reminderId },
        orderBy: { created_at: 'asc' },
    });
};

export const countByReminderId = (reminderId: string): Promise<number> => {
    return prisma.reminder_attachments.count({
        where: { reminder_id: reminderId },
    });
};

export const findById = (id: string): Promise<reminder_attachments | null> => {
    return prisma.reminder_attachments.findUnique({ where: { id } });
};

export const create = (data: {
    reminder_id: string;
    object_key: string;
    file_name: string;
    file_type: string;
    file_size: number;
}): Promise<reminder_attachments> => {
    return prisma.reminder_attachments.create({ data });
};

export const deleteById = (id: string): Promise<reminder_attachments> => {
    return prisma.reminder_attachments.delete({ where: { id } });
};

export const findByReminderIds = (reminderIds: string[]): Promise<reminder_attachments[]> => {
    return prisma.reminder_attachments.findMany({
        where: { reminder_id: { in: reminderIds } },
    });
};
