import type { ReactNode } from 'react';
import { useAuthStore, type AppRole } from '../../stores/authStore';

interface RoleGuardProps {
    /**
     * One or more roles that are allowed to see the children.
     * Pass `"Admin"` for admin-only UI, `["Admin", "User"]` for any authenticated user.
     */
    roles: AppRole | AppRole[];
    /**
     * What to render when the current user doesn't have the required role.
     * Defaults to rendering nothing.
     */
    fallback?: ReactNode;
    children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's role.
 * Elements that fail the role check are not rendered at all — not just hidden.
 *
 * @example
 * // Admin-only panel:
 * <RoleGuard roles="Admin">
 *   <AdminDashboard />
 * </RoleGuard>
 *
 * // Any authenticated user, with a fallback:
 * <RoleGuard roles={["Admin", "User"]} fallback={<LoginPrompt />}>
 *   <UserContent />
 * </RoleGuard>
 */
export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
    const role = useAuthStore((state) => state.role);
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!role || !allowed.includes(role)) return <>{fallback}</>;
    return <>{children}</>;
}
