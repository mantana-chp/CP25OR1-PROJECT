import * as metaRepository from './meta-repository';

export const getSpeciesAndBreeds = async () => {
  const speciesWithBreeds = await metaRepository.findAllSpeciesWithBreeds();

  return speciesWithBreeds.map(species => ({
    id: species.id,
    name: species.name,
    breeds: species.breeds.map(breed => ({
      id: breed.id,
      name: breed.name,
    })),
  }));
};
