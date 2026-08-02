import { describe, expect, it } from 'vitest'
import { generateUserPassword, getSafeExternalUrl, hashPassword, isValidEmailAddress, isValidUserPassword, isWebAuthnCancellation, secureRandomInt } from '../utils'
import { safeBearerHeader, safeHeaderValue, safeJwtValue } from '../../utils/headers'

describe('external URL validation', () => {
  it('allows only absolute HTTP and HTTPS URLs', () => {
    expect(getSafeExternalUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(getSafeExternalUrl('http://example.com')).toBe('http://example.com/')
    expect(getSafeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(getSafeExternalUrl('data:text/html,test')).toBeNull()
    expect(getSafeExternalUrl('/relative')).toBeNull()
  })
})

describe('email validation', () => {
  it('accepts standard user email addresses', () => {
    expect(isValidEmailAddress('user@example.com')).toBe(true)
    expect(isValidEmailAddress(' user+tag@sub.example.co.uk ')).toBe(true)
  })

  it('rejects incomplete or malformed email addresses', () => {
    for (const email of ['', 'user', 'user@', '@example.com', '.user@example.com', 'user..name@example.com', 'user@example']) {
      expect(isValidEmailAddress(email)).toBe(false)
    }
  })
})

describe('WebAuthn cancellation detection', () => {
  it('recognizes browser cancellation and wrapped cancellation errors', () => {
    const cancelled = Object.assign(new Error('cancelled'), { name: 'NotAllowedError' })
    expect(isWebAuthnCancellation(cancelled)).toBe(true)
    expect(isWebAuthnCancellation(new Error('wrapped', { cause: cancelled }))).toBe(true)
    expect(isWebAuthnCancellation(Object.assign(new Error('aborted'), { code: 'ERROR_CEREMONY_ABORTED' }))).toBe(true)
  })

  it('does not hide unrelated authentication errors', () => {
    expect(isWebAuthnCancellation(new Error('network failed'))).toBe(false)
  })
})

describe('secure random integers', () => {
  it('stays within the requested range', () => {
    for (let index = 0; index < 100; index += 1) {
      const value = secureRandomInt(7)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(7)
    }
  })

  it('rejects invalid ranges', () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError)
    expect(() => secureRandomInt(1.5)).toThrow(RangeError)
  })
})

describe('user password policy', () => {
  it('requires length, upper and lower case letters, a number, and a symbol', () => {
    expect(isValidUserPassword('Strong1!')).toBe(true)
    expect(isValidUserPassword('Short1!')).toBe(false)
    expect(isValidUserPassword('nouppercase1!')).toBe(false)
    expect(isValidUserPassword('NOLOWERCASE1!')).toBe(false)
    expect(isValidUserPassword('NoNumber!')).toBe(false)
    expect(isValidUserPassword('NoSymbol1')).toBe(false)
  })

  it('generates compliant passwords of the requested length', () => {
    for (let index = 0; index < 20; index += 1) {
      const password = generateUserPassword()
      expect(password).toHaveLength(12)
      expect(isValidUserPassword(password)).toBe(true)
    }
    expect(() => generateUserPassword(7)).toThrow(RangeError)
  })

  it('derives a fixed-length value before a password is sent', async () => {
    const password = 'StrongPassword1!'
    const verifier = await hashPassword(password)
    expect(verifier).toMatch(/^[a-f0-9]{64}$/)
    expect(verifier).not.toBe(password)
  })
})

describe('credential header validation', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoidGVzdEBleGFtcGxlLmNvbSJ9.signature'

  it('accepts bounded JWT values and builds a bearer header', () => {
    expect(safeJwtValue(jwt)).toBe(jwt)
    expect(safeBearerHeader(jwt)).toBe(`Bearer ${jwt}`)
  })

  it('rejects malformed, control-character, and oversized values', () => {
    expect(safeJwtValue('not-a-jwt')).toBeUndefined()
    expect(safeHeaderValue('value\nInjected: true')).toBeUndefined()
    expect(safeHeaderValue('x'.repeat(16_385))).toBeUndefined()
  })
})
