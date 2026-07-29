import { describe, expect, it } from 'vitest'
import { getPathWithLocale } from '@/i18n/utils'
import {
  ADMIN_PAGE_ROUTES,
  ADMIN_LOGIN_ROUTE,
  ADMIN_SECTION_PAGES,
  AUTH_ROUTES,
  MAIL_ROUTES,
  getAdminSection,
  type AdminPageKey,
} from '../routes'

describe('explicit application routes', () => {
  it('assigns a unique path to every visible page', () => {
    const paths = [
      ...Object.values(AUTH_ROUTES),
      ...Object.values(MAIL_ROUTES),
      ...Object.values(ADMIN_PAGE_ROUTES), ADMIN_LOGIN_ROUTE,
    ]
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.every((path) => path.startsWith('/') && !path.endsWith('/'))).toBe(true)
    expect(Object.values(AUTH_ROUTES)).toEqual(['/login', '/register', '/login/forgot-password'])
  })

  it('places every administration page in exactly one section', () => {
    const assignedPages = Object.values(ADMIN_SECTION_PAGES).flat()
    const registeredPages = Object.keys(ADMIN_PAGE_ROUTES) as AdminPageKey[]
    expect(new Set(assignedPages).size).toBe(assignedPages.length)
    expect([...assignedPages].sort()).toEqual([...registeredPages].sort())
    for (const [section, pages] of Object.entries(ADMIN_SECTION_PAGES)) {
      for (const page of pages) expect(getAdminSection(page)).toBe(section)
    }
  })

  it('preserves the explicit page when adding or removing a locale prefix', () => {
    expect(getPathWithLocale(MAIL_ROUTES.auto_reply, 'en')).toBe('/en/settings/auto-reply')
    expect(getPathWithLocale(ADMIN_PAGE_ROUTES.roleAddressConfig, 'de')).toBe('/de/dashboard/users/role-addresses')
    expect(getPathWithLocale(ADMIN_PAGE_ROUTES.userOauth2Settings, 'zh')).toBe('/dashboard/users/oauth2')
  })
})
