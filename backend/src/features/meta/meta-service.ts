import * as metaRepository from './meta-repository';

export const getSpeciesAndBreeds = async () => {
  const speciesWithBreeds = await metaRepository.findAllSpeciesWithBreeds();

  return speciesWithBreeds.map(species => ({
    id: species.id,
    name: species.name_th,
    description_th: species.description_th,
    breeds: species.breeds.map(breed => ({
      id: breed.id,
      name: breed.name_th,
      description_th: breed.description_th,
    })),
  }));
};
