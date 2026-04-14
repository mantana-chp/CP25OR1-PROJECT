import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export const DEFAULT_PET_AVATAR_BACKGROUND_COLOR = '#5FA7D1'

const SPECIES_ICON_MAP: Record<string, IconName> = {
  แมว: 'cat',
  cat: 'cat',
  กระต่าย: 'rabbit',
  rabbit: 'rabbit',
  นก: 'bird',
  bird: 'bird',
  สุนัข: 'dog',
  dog: 'dog',
  แฮมสเตอร์: 'rodent',
  hamster: 'rodent'
}

export const PET_AVATAR_COLOR_OPTIONS = [
  DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  '#F6B26B',
  '#F29BA2',
  '#8ECBF3',
  '#BCA7F5',
  '#7BC6A4',
  '#9AA6B2'
]

const SPECIES_DEFAULT_COLOR_MAP: Record<string, string> = {
  แมว: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  cat: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  กระต่าย: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  rabbit: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  นก: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  bird: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  สุนัข: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  dog: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  แฮมสเตอร์: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  hamster: DEFAULT_PET_AVATAR_BACKGROUND_COLOR
}

export const getPetPlaceholderIcon = (species?: string | null): IconName => {
  if (!species) return 'dog'

  const key = species.trim().toLowerCase()
  return SPECIES_ICON_MAP[key] || SPECIES_ICON_MAP[species.trim()] || 'dog'
}

export const getDefaultAvatarBackgroundColorBySpecies = (
  species?: string | null
): string => {
  if (!species) return DEFAULT_PET_AVATAR_BACKGROUND_COLOR

  const key = species.trim().toLowerCase()
  return (
    SPECIES_DEFAULT_COLOR_MAP[key] ||
    SPECIES_DEFAULT_COLOR_MAP[species.trim()] ||
    DEFAULT_PET_AVATAR_BACKGROUND_COLOR
  )
}
