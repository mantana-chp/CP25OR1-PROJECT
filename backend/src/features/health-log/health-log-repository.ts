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
