// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { sanitizeHtml, sanitizeSvg } from '../sanitize'

describe('HTML sanitization', () => {
  it('removes executable content and secures new-window links', () => {
    const result = sanitizeHtml('<a target="_blank" href="https://example.com">open</a><img src=x onerror=alert(1)><script>alert(1)</script>')
    const container = document.createElement('div')
    container.innerHTML = result
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')?.hasAttribute('onerror')).toBe(false)
    expect(container.querySelector('a')?.rel).toBe('noopener noreferrer')
  })

  it('keeps SVG markup while removing scripts and event handlers', () => {
    const result = sanitizeSvg('<svg onload="alert(1)"><path d="M0 0"/><script>alert(1)</script></svg>')
    expect(result).toContain('<svg')
    expect(result).not.toContain('onload')
    expect(result).not.toContain('<script')
  })
})
