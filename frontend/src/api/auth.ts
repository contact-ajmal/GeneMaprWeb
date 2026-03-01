import apiClient from './client'

export interface LoginData {
    email: string
    password: string
}

export interface RegisterData {
    full_name: string
    email: string
    password: string
}

export interface UserResponse {
    id: string
    email: string
    full_name: string
    role: string
    is_active: boolean
    created_at: string
    last_login: string | null
}

export interface TokenResponse {
    access_token: string
    token_type: string
    user: UserResponse
}

export const loginUser = async (data: LoginData): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
}

export const registerUser = async (data: RegisterData): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
}

export const getMe = async (): Promise<UserResponse> => {
    const response = await apiClient.get('/auth/me')
    return response.data
}

export const updateMe = async (data: { full_name?: string; password?: string }): Promise<UserResponse> => {
    const response = await apiClient.put('/auth/me', data)
    return response.data
}
