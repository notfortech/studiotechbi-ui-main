import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiAxiosInstance } from './apiClient';

class ApiService {
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiAxiosInstance.get(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiAxiosInstance.post(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiAxiosInstance.put(url, data, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiAxiosInstance.patch(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiAxiosInstance.delete(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
