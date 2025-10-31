import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * A custom error class for API fetch errors.
 * This wraps AxiosError to provide a consistent error interface.
 */
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Create a central axios instance.
 */
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Example: 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
  },
});

/**
 * Handles errors from axios requests and converts them to ApiError.
 * @param {any} error - The error caught from axios.
 */
function handleError(error: any): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status || 500;
    const data = axiosError.response?.data;
    const message =
      (data as any)?.message || axiosError.message || 'An error occurred';

    throw new ApiError(message, status, data);
  }

  // Handle non-axios errors
  console.error('API Fetch Failed:', error);
  if (error instanceof Error) {
    throw new Error(error.message || 'Network request failed');
  } else {
    throw new Error('Network request failed');
  }
}

/*
 * --- EXPORTED HELPER METHODS ---
 */

/**
 * Performs a GET request.
 * @param {string} endpoint - The API endpoint.
 * @param {AxiosRequestConfig} [config] - Optional axios request config.
 * @returns {Promise<T>}
 */
export const get = async <T = any>(
  endpoint: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.get<T>(endpoint, config);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Performs a POST request.
 * @param {string} endpoint - The API endpoint.
 * @param {any} data - The request body.
 * @param {AxiosRequestConfig} [config] - Optional axios request config.
 * @returns {Promise<T>}
 */
export const post = async <T = any>(
  endpoint: string,
  data: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.post<T>(endpoint, data, config);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Performs a PUT request.
 * @param {string} endpoint - The API endpoint.
 * @param {any} data - The request body.
 * @param {AxiosRequestConfig} [config] - Optional axios request config.
 * @returns {Promise<T>}
 */
export const put = async <T = any>(
  endpoint: string,
  data: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.put<T>(endpoint, data, config);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Performs a PATCH request.
 * @param {string} endpoint - The API endpoint.
 * @param {any} data - The request body.
 * @param {AxiosRequestConfig} [config] - Optional axios request config.
 * @returns {Promise<T>}
 */
export const patch = async <T = any>(
  endpoint: string,
  data: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.patch<T>(endpoint, data, config);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Performs a DELETE request.
 * (Named 'del' because 'delete' is a reserved keyword)
 * @param {string} endpoint - The API endpoint.
 * @param {AxiosRequestConfig} [config] - Optional axios request config.
 * @returns {Promise<T>}
 */
export const del = async <T = any>(
  endpoint: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.delete<T>(endpoint, config);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
