import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredRole?: string[]
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (requiredRole && user && !requiredRole.includes(user.role)) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}
