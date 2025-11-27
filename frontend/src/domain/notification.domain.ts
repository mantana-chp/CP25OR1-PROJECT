export interface INotification {
  id: string
  user_id: string
  reminder_id: string
  sent_at: string | null
  status: string
  read_at: string | null
  created_at: string
  reminder: {
    id: string
    user_id: string
    pet_id: string
    pet_name: string
    category_name: string
    reminder_name: string
    description: string
    reminder_date: string
    reminder_time: string
    reminder_status: string
    status_updated_at: string
    created_at: string
    updated_at: string
    pets: {
      id: string
      user_id: string
      pet_name: string
      species_id: string
      breed_id: string
      gender: string
      birth_date: string
      weight: string
      created_at: string
      updated_at: string
    }
  }
}
