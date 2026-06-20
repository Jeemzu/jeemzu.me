import { useAuthStore, type AppRole } from '../stores/authStore';

/**
 * Returns role-related state for the current session.
 *
 * @example
 * const { isAdmin, isAuthenticated } = useRole();
 * if (isAdmin) { ... }
 */
export function useRole() {
    const { role, username, isAuthenticated } = useAuthStore();
    return {
        role,
        username,
        isAuthenticated,
        isAdmin: role === 'Admin',
        isUser: isAuthenticated, // all authenticated sessions have at minimum user-level access
        /** Returns true when the current role matches any of the supplied roles. */
        hasRole: (...required: AppRole[]) => !!role && required.includes(role),
    };
}
