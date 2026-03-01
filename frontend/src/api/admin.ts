import apiClient from './client'
import type { UserResponse } from './auth'

export interface AdminUserCreate {
    full_name: string
    email: string
    password: string
    role: string
}

export interface AdminUserUpdate {
    full_name?: string
    role?: string
    is_active?: boolean
    password?: string
}

export interface UserListResponse {
    users: UserResponse[]
    total: number
    page: number
    page_size: number
}

export interface Permission {
    key: string
    label: string
    description: string
}

export interface RolePermissions {
    role: string
    label: string
    description: string
    permissions: Permission[]
    is_system: boolean
}

export interface RoleCreate {
    name: string
    label: string
    description: string
    permissions: string[]
}

export interface RoleResponse {
    id: string
    name: string
    label: string
    description: string
    permissions: string[]
    is_system: boolean
    created_at: string
}

// ── User API ──

export const listUsers = async (params?: {
    search?: string
    role?: string
    is_active?: boolean
    page?: number
    page_size?: number
}): Promise<UserListResponse> => {
    const response = await apiClient.get('/admin/users', { params })
    return response.data
}

export const createUser = async (data: AdminUserCreate): Promise<UserResponse> => {
    const response = await apiClient.post('/admin/users', data)
    return response.data
}

export const updateUser = async (userId: string, data: AdminUserUpdate): Promise<UserResponse> => {
    const response = await apiClient.put(`/admin/users/${userId}`, data)
    return response.data
}

export const deleteUser = async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`)
}

// ── Role API ──

export const getRoles = async (): Promise<RolePermissions[]> => {
    const response = await apiClient.get('/admin/roles')
    return response.data
}

export const createRole = async (data: RoleCreate): Promise<RoleResponse> => {
    const response = await apiClient.post('/admin/roles', data)
    return response.data
}

export const deleteRole = async (roleName: string): Promise<void> => {
    await apiClient.delete(`/admin/roles/${roleName}`)
}

export const getAllPermissions = async (): Promise<Permission[]> => {
    const response = await apiClient.get('/admin/permissions')
    return response.data
}
