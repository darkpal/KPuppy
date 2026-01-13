import { sha256 } from 'js-sha256'

export function hashUsername(username: string): string {
  const salt = import.meta.env.VITE_IDENTITY_SALT || 'kpuppy-user-identity-v1'
  return sha256(salt + username)
}
