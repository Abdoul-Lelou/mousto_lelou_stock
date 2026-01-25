import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Activity } from 'lucide-react';
import { type UserRole } from '../../types';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const { user, role, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#F1F5F9]">
                <Activity className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // 1. Not logged in -> Redirect to Login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Profile not loaded yet (but user exists) -> Wait or Loading
    // Usually covered by 'loading' state, but just in case:
    if (!role) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#F1F5F9]">
                <Activity className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // 3. Role verification
    if (allowedRoles && !allowedRoles.includes(role)) {
        // User authorized but doesn't have the right role (e.g. Seller trying to access Admin)
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
