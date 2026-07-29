import { describe, expect, it } from 'vitest'
import { isValidEmailAddress, isWebAuthnCancellation } from '../utils'

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
