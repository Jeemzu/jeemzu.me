import { useAuthStore } from "../stores/authStore";

function withAuth(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * fetch with the current access token. On a 401 it refreshes the session once
 * and retries; if that fails the original 401 is returned to the caller.
 */
export async function authFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(url, withAuth(init, token));
  if (response.status !== 401 || !token) return response;

  const refreshed = await useAuthStore.getState().refreshSession();
  if (!refreshed) return response;
  return fetch(url, withAuth(init, useAuthStore.getState().accessToken));
}
