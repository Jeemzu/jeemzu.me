import { useState, useEffect } from 'react'

export interface AdminStatus {
  isAdmin: boolean
  loading: boolean
  error: string | null
}

/**
 * Calls the verify-admin function to check if the current user holds the admin role.
 * Returns { isAdmin, loading, error }.
 *
 * Relies on the nf_jwt cookie being present (set by Netlify Identity on login).
 */
export async function checkAdminStatus(): Promise<boolean> {
  const response = await fetch('/.netlify/functions/verify-admin')
  if (response.status === 401) return false
  if (!response.ok) throw new Error(`Unexpected response: ${response.status}`)
  const data = await response.json()
  return Boolean(data.isAdmin)
}

export function useAdminStatus(): AdminStatus {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    checkAdminStatus()
      .then((result) => {
        if (!cancelled) setIsAdmin(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { isAdmin, loading, error }
}
