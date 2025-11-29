import prisma from '../../libs/db';

export const findAllSpeciesWithBreeds = async () => {
  return await prisma.species.findMany({
    select: {
      id: true,
      name: true,
      name_th: true,
      description: true,
      description_th: true,
      breeds: {
        select: {
          id: true,
          name: true,
          name_th: true,
          description: true,
          description_th: true,
        },
        orderBy: {
          name: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};
