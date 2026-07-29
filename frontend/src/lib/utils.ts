import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const parseJson = <T>(value: string | null, fallback: T): T => {
  if (value == null || value === '') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return value as T
  }
}

export const stringifyError = (error: unknown) => error instanceof Error ? error.message : String(error)

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
