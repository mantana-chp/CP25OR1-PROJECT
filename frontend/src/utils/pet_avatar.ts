import { colors } from '@/constants/design-system'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export const DEFAULT_PET_AVATAR_BACKGROUND_COLOR = '#5BA3D0'

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
  hamster: 'rodent',
}

export const PET_AVATAR_COLOR_OPTIONS = [
  DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
  colors.info.DEFAULT,
  colors.success.DEFAULT,
  colors.warning.DEFAULT,
  colors.danger.DEFAULT,
  colors.gray[500],
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
  hamster: DEFAULT_PET_AVATAR_BACKGROUND_COLOR,
}

export const getPetPlaceholderIcon = (species?: string | null): IconName => {
  if (!species) return 'dog'

  const key = species.trim().toLowerCase()
  return SPECIES_ICON_MAP[key] || SPECIES_ICON_MAP[species.trim()] || 'dog'
}

export const getDefaultAvatarBackgroundColorBySpecies = (
  species?: string | null,
): string => {
  if (!species) return DEFAULT_PET_AVATAR_BACKGROUND_COLOR

  const key = species.trim().toLowerCase()
  return (
    SPECIES_DEFAULT_COLOR_MAP[key] ||
    SPECIES_DEFAULT_COLOR_MAP[species.trim()] ||
    DEFAULT_PET_AVATAR_BACKGROUND_COLOR
  )
}
