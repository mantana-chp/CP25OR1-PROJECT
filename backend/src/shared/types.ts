import { API_RESPONSE_STATUS } from './constants';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export interface UserPayload {
  id: string;
  // need the installationid and device platform id in sprint2
}

export interface ApiResponse<T> {
  status: {
    code: typeof API_RESPONSE_STATUS.SUCCESS.CODE;
    description: typeof API_RESPONSE_STATUS.SUCCESS.DESCRIPTION;
  };
  data?: T; // Made optional
}

export interface ApiErrorResponse {
  status: {
    code: typeof API_RESPONSE_STATUS.FAILURE.CODE;
    description: string;
  };
  errors?: Array<{ message: string; path?: string[]; code?: number }>;
}