import prisma from '../../libs/db';

export const findAllSpeciesWithBreeds = async () => {
  return await prisma.species.findMany({
    include: {
      breeds: {
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
