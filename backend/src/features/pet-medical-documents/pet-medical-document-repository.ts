import prisma from '../../libs/db';

export const create = (data: {
    pet_id: string;
    created_by_user_id: string;
    object_key: string;
    file_name: string;
    file_type: string;
    file_size: number;
}) => {
    return prisma.pet_medical_documents.create({ data });
};

export const findByPetId = (petId: string) => {
    return prisma.pet_medical_documents.findMany({
        where: { pet_id: petId },
        orderBy: { created_at: 'desc' },
    });
};

export const findById = (id: string) => {
    return prisma.pet_medical_documents.findUnique({ where: { id } });
};

export const deleteById = (id: string) => {
    return prisma.pet_medical_documents.delete({ where: { id } });
};
