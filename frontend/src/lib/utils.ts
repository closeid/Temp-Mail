import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const USER_PASSWORD_MIN_LENGTH = 8

export const isValidUserPassword = (password: string) => password.length >= USER_PASSWORD_MIN_LENGTH
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /[0-9]/.test(password)
  && /[^A-Za-z0-9\s]/.test(password)

export const hashPassword = async (password: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export const formatDate = (utcDate?: string, useUTC = false) => {
  if (!utcDate) return ''
  const value = /(?:Z|[+-]\d{2}:?\d{2})$/.test(utcDate) ? utcDate : `${utcDate} UTC`
  if (useUTC) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export const copyText = async (value: string) => navigator.clipboard.writeText(value)

export const secureRandomInt = (maxExclusive: number) => {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x1_0000_0000) {
    throw new RangeError('Invalid random range')
  }
  const range = 0x1_0000_0000
  const limit = range - (range % maxExclusive)
  const values = new Uint32Array(1)
  do crypto.getRandomValues(values); while (values[0] >= limit)
  return values[0] % maxExclusive
}

const USER_PASSWORD_CHARACTER_GROUPS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '!@#$%^&*()-_=+[]{}:,.?',
] as const

export const generateUserPassword = (length = 12) => {
  if (!Number.isSafeInteger(length) || length < USER_PASSWORD_MIN_LENGTH) {
    throw new RangeError(`Password length must be at least ${USER_PASSWORD_MIN_LENGTH}`)
  }
  const allCharacters = USER_PASSWORD_CHARACTER_GROUPS.join('')
  const password = USER_PASSWORD_CHARACTER_GROUPS.map((group) => group[secureRandomInt(group.length)])
  while (password.length < length) password.push(allCharacters[secureRandomInt(allCharacters.length)])
  for (let index = password.length - 1; index > 0; index -= 1) {
    const replacementIndex = secureRandomInt(index + 1)
    const currentCharacter = password[index]
    password[index] = password[replacementIndex]
    password[replacementIndex] = currentCharacter
  }
  return password.join('')
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const stringifyError = (error: unknown) => error instanceof Error ? error.message : String(error)

export const getSafeExternalUrl = (value: unknown) => {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i

export const isValidEmailAddress = (value: string) => {
  const email = value.trim()
  if (!email || email.length > 254) return false
  const [localPart = ''] = email.split('@')
  return localPart.length <= 64 && !localPart.startsWith('.') && !localPart.endsWith('.') && !localPart.includes('..') && EMAIL_PATTERN.test(email)
}

type WebAuthnFailure = Error & { code?: string; cause?: unknown }

export const isWebAuthnCancellation = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  const failure = error as WebAuthnFailure
  if (failure.name === 'NotAllowedError' || failure.name === 'AbortError') return true
  if (failure.code === 'ERROR_CEREMONY_ABORTED') return true
  return failure.cause !== error && isWebAuthnCancellation(failure.cause)
}
