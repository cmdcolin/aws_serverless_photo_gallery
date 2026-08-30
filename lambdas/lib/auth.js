import { createHash, timingSafeEqual } from 'node:crypto'
import { HttpError } from './http.js'

// hashing first gives both sides a fixed length, so the comparison neither
// throws on a length mismatch nor leaks the password length
const digest = value => createHash('sha256').update(String(value)).digest()

export function requirePassword(password) {
  if (!timingSafeEqual(digest(process.env.Password), digest(password))) {
    throw new HttpError(403, 'Access denied')
  }
}
