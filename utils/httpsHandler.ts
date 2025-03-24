import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * A simple HTTP client utility for making GET, POST, and PATCH requests using Axios.
 *
 * ## Usage Example:
 * ```typescript
 * const data = await HttpClient.get<MyType>('https://api.example.com/resource');
 * const created = await HttpClient.post<MyType>('https://api.example.com/resource', { key: 'value' });
 * const updated = await HttpClient.patch<MyType>('https://api.example.com/resource/1', { key: 'newValue' });
 * ```
 */
export class HttpClient {
    private static async request<T>(method: 'GET' | 'POST' | 'PATCH', url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        try {
            const response: AxiosResponse<T> = await axios({
                method,
                url,
                data,
                ...config
            });
            return response.data;
        } catch (error) {
            console.error(`[HttpClient] Error: ${error}`);
            throw new Error('Failed to fetch data');
        }
    }

    public static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.request<T>('GET', url, undefined, config);
    }

    public static async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.request<T>('POST', url, data, config);
    }
    
    public static async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.request<T>('PATCH', url, data, config);
    }
}
