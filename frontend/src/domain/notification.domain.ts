export interface INotification {
  id: string
  userId: string
  reminderId: string
  sentAt: string | null
  status: string
  readAt: string | null
  createdAt: string
  reminder: {
    id: string
    userId: string
    petId: string
    petName: string
    categoryName: string
    reminderName: string
    description: string
    reminderDate: string
    reminderTime: string
    reminderStatus: string
    statusUpdatedAt: string
    createdAt: string
    updatedAt: string
    pets: {
      id: string
      userId: string
      petName: string
      speciesId: string
      breedId: string
      gender: string
      birthDate: string
      weight: string
      createdAt: string
      updatedAt: string
    }
  }
  petTips: {
    title: string
    desc: string
  }
}
