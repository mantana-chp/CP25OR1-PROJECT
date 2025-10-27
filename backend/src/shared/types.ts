import { API_RESPONSE_STATUS } from './constants';

export interface Reminder {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  status: "To Do" | "Done" | "Overdue";
  petId: string;
}

export interface ApiResponse<T> {
  status: {
    code: typeof API_RESPONSE_STATUS.SUCCESS.CODE;
    description: typeof API_RESPONSE_STATUS.SUCCESS.DESCRIPTION;
  };
  data: T;
}

export interface ApiErrorResponse {
  status: {
    code: typeof API_RESPONSE_STATUS.FAILURE.CODE;
    description: string;
  };
  errors?: Array<{ message: string; path?: string[] }>;
}