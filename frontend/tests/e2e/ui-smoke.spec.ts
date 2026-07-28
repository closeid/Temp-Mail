import { expect, test, type Page } from '@playwright/test'

const openSettings = {
  title: 'Get an Email',
  prefix: '',
  minAddressLen: 1,
  maxAddressLen: 30,
  needAuth: false,
  adminContact: '',
  enableUserCreateEmail: true,
  disableAnonymousUserCreateEmail: false,
  disableCustomAddressName: false,
  enableUserDeleteEmail: true,
  enableAutoReply: true,
  defaultDomains: ['getanemail.net'],
  randomSubdomainDomains: [],
  domains: ['getanemail.net'],
  domainLabels: ['getanemail.net'],
  copyright: '',
  cfTurnstileSiteKey: '',
  enableWebhook: true,
  isS3Enabled: true,
  enableSendMail: true,
  disableAdminPasswordCheck: false,
  enableAddressPassword: true,
  enableAgentEmailInfo: true,
  enableGlobalTurnstileCheck: false,
}

async function mockCommon(page: Page, overrides: Record<string, unknown> = {}) {
  await page.route('**/api/open/settings', (route) => route.fulfill({ json: { ...openSettings, ...overrides } }))
  await page.route('**/api/user/open_settings', (route) => route.fulfill({ json: { enable: true, enableMailVerify: true, oauth2ClientIDs: [] } }))
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
}

test('unified login and registration surface', async ({ page }, testInfo) => {
  await mockCommon(page)
  await page.goto('/')
  await expect(page.locator('img[src="/logo.svg"]')).toBeVisible()
  await expect(page.getByRole('tab', { name: /login|登录/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /register|注册/i })).toBeVisible()
  await expect(page.locator('header, footer, h1')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /passkey/i })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/auth-${testInfo.project.name}.png`, fullPage: true })
})

test('dark theme preserves form contrast', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('vueuse-color-scheme', 'dark'))
  await mockCommon(page)
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('input').first()).toBeVisible()
  const colors = await page.locator('body').evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color }))
  expect(colors.background).not.toBe(colors.color)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/auth-dark-${testInfo.project.name}.png`, fullPage: true })
})

test('mail workspace remains dense and responsive', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('jwt', 'test.jwt.credential'))
  await mockCommon(page)
  await page.route('**/api/settings', (route) => route.fulfill({ json: { address: 'sample@getanemail.net', send_balance: 8, auto_reply: {} } }))
  await page.route('**/api/mails?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 12, source: 'sender@example.com', address: 'sample@getanemail.net', created_at: '2026-07-27 00:56:00', raw: 'From: Sender <sender@example.com>\r\nTo: sample@getanemail.net\r\nSubject: Layout verification\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nA compact mailbox message.' }] } }))
  await page.goto('/')
  await expect(page.getByText('sample@getanemail.net').first()).toBeVisible()
  await expect(page.getByText('Layout verification').filter({ visible: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  if (testInfo.project.name === 'mobile') {
    const bottomNav = page.locator('nav.fixed.inset-x-0.bottom-0')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.locator('button')).toHaveCount(4)
    const box = await bottomNav.boundingBox()
    expect(box?.y).toBeGreaterThan(700)
  }
  await page.screenshot({ path: `test-results/mail-${testInfo.project.name}.png`, fullPage: true })
})

test('dashboard uses two-level workspace navigation', async ({ page }, testInfo) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  await page.route('**/api/admin/address?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 1, name: 'admin@getanemail.net', created_at: '2026-07-27', updated_at: '2026-07-27', source_meta: '127.0.0.1', mail_count: 2, send_count: 1 }] } }))
  await page.goto('/en/dashboard')
  await expect(page.getByText('admin@getanemail.net')).toBeVisible()
  if (testInfo.project.name === 'mobile') {
    const bottomNav = page.locator('nav.fixed.inset-x-0.bottom-0')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.locator('button')).toHaveCount(4)
  } else {
    await expect(page.locator('aside nav')).toBeVisible()
  }
  await expect(page.locator('main nav')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/dashboard-${testInfo.project.name}.png`, fullPage: true })
  await page.getByTitle('Actions').click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('Delete Account')
  await page.getByRole('button', { name: 'Cancel' }).click()
})

test('dashboard administration settings stay available and aligned', async ({ page }, testInfo) => {
  await mockCommon(page, { disableAdminPasswordCheck: true, enableWebhook: false })
  await page.route('**/api/admin/users?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.route('**/api/admin/user_oauth2_settings', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/admin/worker/configs', (route) => route.fulfill({ json: { SEND_MAIL_CONFIG: { cloudflareBinding: true, resendGlobal: false, resendDomains: ['getanemail.net'], smtpDomains: [], defaultSendBalance: 5 } } }))
  await page.route('**/api/admin/mail_webhook/settings', (route) => route.fulfill({ json: { enabled: false, url: '', method: 'POST', headers: '{}', body: '{}' } }))
  await page.goto('/en/dashboard')

  await page.getByRole('button', { name: 'User', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Create user' })).toBeVisible()
  const controls = [page.getByPlaceholder('Query all addresses'), page.getByRole('button', { name: 'Query', exact: true }), page.getByRole('button', { name: 'Create user' })]
  const heights = await Promise.all(controls.map(async (control) => (await control.boundingBox())?.height))
  expect(heights).toEqual([40, 40, 40])

  await page.getByRole('button', { name: 'Oauth2 Settings' }).click()
  await expect(page.getByRole('heading', { name: 'OAuth2 sign-in configuration' })).toBeVisible()

  await page.getByRole('button', { name: 'Emails', exact: true }).click()
  await page.getByRole('button', { name: 'Sending configuration' }).click()
  await expect(page.getByText('RESEND_TOKEN / RESEND_TOKEN_<DOMAIN>')).toBeVisible()
  await expect(page.getByText('getanemail.net')).toBeVisible()

  await page.getByRole('button', { name: 'Mail Webhook' }).click()
  await expect(page.getByText(/ENABLE_WEBHOOK is disabled/)).toBeVisible()
  await expect(page.getByText(/contact.*administrator/i)).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/dashboard-settings-${testInfo.project.name}.png`, fullPage: true })
})
