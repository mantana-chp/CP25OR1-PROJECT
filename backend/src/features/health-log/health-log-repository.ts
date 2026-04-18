import prisma from '../../libs/db'
import { Prisma, HealthLogCategory } from '../../generated/prisma/client'

export const create = async (data: {
  pet_id: string
  created_by_user_id: string
  category: HealthLogCategory
  description: string
  weight?: number
  note?: string
}) => {
  return await prisma.health_logs.create({
    data: {
      pet_id: data.pet_id,
      created_by_user_id: data.created_by_user_id,
      category: data.category,
      description: data.description,
      weight: data.weight ? new Prisma.Decimal(data.weight) : null,
      note: data.note || null
    },
    include: {
      created_by: {
        select: {
          id: true,
          current_installation_id: true
        }
      }
    }
  })
}

export const findByPetId = async (
  petId: string,
  limit: number = 50,
  offset: number = 0
) => {
  return await prisma.health_logs.findMany({
    where: {
      pet_id: petId
    },
    include: {
      created_by: {
        select: {
          id: true,
          current_installation_id: true
        }
      },
      pet: {
        select: {
          user_id: true
        }
      }
    },
    orderBy: {
      logged_at: 'desc'
    },
    take: limit,
    skip: offset
  })
}

export const findById = async (logId: string) => {
  return await prisma.health_logs.findUnique({
    where: {
      id: logId
    },
    include: {
      pet: {
        select: {
          id: true,
          user_id: true
        }
      },
      created_by: {
        select: {
          id: true,
          current_installation_id: true
        }
      }
    }
  })
}

export const deleteById = async (logId: string) => {
  return await prisma.health_logs.delete({
    where: {
      id: logId
    }
  })
}

export const countByPetId = async (petId: string) => {
  return await prisma.health_logs.count({
    where: {
      pet_id: petId
    }
  })
}

export const update = async (
  logId: string,
  data: {
    category?: HealthLogCategory
    description?: string
    note?: string | null
    loggedAt?: Date
  }
) => {
  const updateData: any = {}

  if (data.category !== undefined) {
    updateData.category = data.category
  }

  if (data.description !== undefined) {
    updateData.description = data.description
  }

  if (data.note !== undefined) {
    updateData.note = data.note
  }

  if (data.loggedAt !== undefined) {
    updateData.logged_at = data.loggedAt
  }

  return await prisma.health_logs.update({
    where: { id: logId },
    data: updateData,
    include: {
      created_by: {
        select: {
          id: true,
          current_installation_id: true
        }
      }
    }
  })
}

// ─── Weight-Specific Repository Functions ──────────────────────────────────────

/**
 * Find existing WEIGHT log for a pet on a specific date (same day).
 */
export const findWeightLogByDate = async (
  petId: string,
  date: Date
) => {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return await prisma.health_logs.findFirst({
    where: {
      pet_id: petId,
      category: 'WEIGHT',
      logged_at: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      created_by: {
        select: {
          id: true,
          current_installation_id: true
        }
      },
      pet: {
        select: {
          user_id: true
        }
      }
    },
    orderBy: {
      logged_at: 'desc'
    }
  })
}

/**
 * Find the most recent WEIGHT log before a specific date.
 */
export const findMostRecentPreviousWeight = async (
  petId: string,
  beforeDate: Date
) => {
  return await prisma.health_logs.findFirst({
    where: {
      pet_id: petId,
      category: 'WEIGHT',
      logged_at: {
        lt: beforeDate
      }
    },
    include: {
      created_by: {
        select: {
          id: true,
          current_installation_id: true
        }
      },
      pet: {
        select: {
          user_id: true
        }
      }
    },
    orderBy: {
      logged_at: 'desc'
    }
  })
}

/**
 * Update a weight log with new weight value.
 */
export const updateWeightLogWithWeight = async (
  logId: string,
  newWeight: number,
  description?: string,
  note?: string | null,
  loggedAt?: Date
) => {
  const updateData: any = {
    weight: new Prisma.Decimal(newWeight)
  }

  if (description !== undefined) {
    updateData.description = description
  }

  if (note !== undefined) {
    updateData.note = note
  }

  if (loggedAt !== undefined) {
    updateData.logged_at = loggedAt
  }

  return await prisma.health_logs.update({
    where: { id: logId },
    data: updateData,
    include: {
      created_by: {
        select: {
          id: true,
          current_installation_id: true
        }
      },
      pet: {
        select: {
          user_id: true
        }
      }
    }
  })
}

// ─── Weight Chart Repository Functions ────────────────────────────────────────

/**
 * Find all WEIGHT logs for a pet within a date range (inclusive).
 * Ordered oldest → newest so chart points are naturally left-to-right.
 */
export const findWeightLogsInRange = async (
  petId: string,
  startDate: Date,
  endDate: Date
) => {
  return await prisma.health_logs.findMany({
    where: {
      pet_id: petId,
      category: 'WEIGHT',
      logged_at: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      id: true,
      logged_at: true,
      weight: true
    },
    orderBy: {
      logged_at: 'asc'
    }
  })
}
