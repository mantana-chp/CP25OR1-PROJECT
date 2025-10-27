export interface Reminder {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  status: "To Do" | "Done" | "Overdue";
  petId: string;
}