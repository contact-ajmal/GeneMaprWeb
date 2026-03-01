import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { loginUser, registerUser, getMe, type UserResponse, type LoginData, type RegisterData } from '../api/auth'

interface AuthContextType {
    user: UserResponse | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (data: LoginData) => Promise<void>
    register: (data: RegisterData) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'genemapr_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null)
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
    const [isLoading, setIsLoading] = useState(true)

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            const storedToken = localStorage.getItem(TOKEN_KEY)
            if (!storedToken) {
                setIsLoading(false)
                return
            }

            try {
                const userData = await getMe()
                setUser(userData)
                setToken(storedToken)
            } catch {
                // Token is invalid — clear it
                localStorage.removeItem(TOKEN_KEY)
                setToken(null)
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        validateToken()
    }, [])

    const login = useCallback(async (data: LoginData) => {
        const response = await loginUser(data)
        localStorage.setItem(TOKEN_KEY, response.access_token)
        setToken(response.access_token)
        setUser(response.user)
    }, [])

    const register = useCallback(async (data: RegisterData) => {
        const response = await registerUser(data)
        localStorage.setItem(TOKEN_KEY, response.access_token)
        setToken(response.access_token)
        setUser(response.user)
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user && !!token,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
