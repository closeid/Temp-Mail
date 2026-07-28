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
  await expect(page.locator('main.auth-surface > section')).toBeVisible()
  await expect(page.locator('a[href*="github.com"]')).toHaveCount(0)
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

test('user login opens the first bound mailbox', async ({ page }) => {
  await mockCommon(page)
  let selectedAddressId = ''
  await page.route('**/api/user/login', (route) => route.fulfill({ json: { jwt: 'user.session.jwt' } }))
  await page.route('**/api/user/settings', (route) => route.fulfill({ json: { user_email: 'owner@example.com', user_id: 8, user_role: 'member', is_admin: false, new_user_token: null } }))
  await page.route('**/api/user/bind_address', (route) => route.fulfill({ json: { results: [
    { id: 11, name: 'first@getanemail.net' },
    { id: 12, name: 'second@getanemail.net' },
  ] } }))
  await page.route('**/api/user/bind_address_jwt/*', (route) => {
    selectedAddressId = route.request().url().split('/').pop() || ''
    return route.fulfill({ json: { jwt: 'first.mailbox.jwt' } })
  })
  await page.route('**/api/settings', (route) => route.fulfill({ json: { address: 'first@getanemail.net', send_balance: 0, auto_reply: {} } }))
  await page.route('**/api/mails?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))

  await page.goto('/en')
  await page.locator('input').nth(0).fill('owner@example.com')
  await page.locator('input').nth(1).fill('password')
  await page.getByRole('button', { name: 'Login', exact: true }).click()

  await expect(page.getByText('first@getanemail.net').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Mail Box|Inbox/i })).toHaveAttribute('aria-current', 'page')
  expect(selectedAddressId).toBe('11')
  await expectNoHorizontalOverflow(page)
})

test('mail workspace remains dense and responsive', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('jwt', 'test.jwt.credential'))
  await mockCommon(page)
  await page.route('**/api/settings', (route) => route.fulfill({ json: { address: 'sample@getanemail.net', send_balance: 8, auto_reply: {} } }))
  await page.route('**/api/mails?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 12, source: 'sender@example.com', address: 'sample@getanemail.net', created_at: '2026-07-27 00:56:00', raw: 'From: Sender <sender@example.com>\r\nTo: sample@getanemail.net\r\nSubject: Layout verification\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nA compact mailbox message.' }] } }))
  await page.goto('/')
  await expect(page.getByText('sample@getanemail.net').first()).toBeVisible()
  const mailSubject = page.getByText('Layout verification').filter({ visible: true }).first()
  await expect(mailSubject).toBeVisible()
  await expectNoHorizontalOverflow(page)
  if (testInfo.project.name === 'mobile') {
    const bottomNav = page.locator('nav.fixed.inset-x-0.bottom-0')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.locator('button')).toHaveCount(4)
    const box = await bottomNav.boundingBox()
    expect(box?.y).toBeGreaterThan(700)
  }
  await page.screenshot({ path: `test-results/mail-${testInfo.project.name}.png`, fullPage: true })

  await mailSubject.click()
  await page.getByTitle(/Fullscreen|全屏/i).filter({ visible: true }).click()
  const fullscreen = page.getByRole('dialog').last()
  await expect(fullscreen).toContainText('Layout verification')
  await expect(fullscreen).toContainText('sender@example.com')
  await expect(fullscreen).toContainText('sample@getanemail.net')
  const body = fullscreen.getByText('A compact mailbox message.')
  await expect(body).toBeVisible()
  const bodyBox = await body.boundingBox()
  expect(bodyBox?.y).toBeLessThan(420)
  await page.screenshot({ path: `test-results/mail-fullscreen-${testInfo.project.name}.png`, fullPage: true })
})

test('address management actions stay on one row', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('userJwt', 'test.user.jwt'))
  await mockCommon(page)
  await page.route('**/api/user/settings', (route) => route.fulfill({ json: { user_email: 'owner@example.com', user_id: 8, user_role: 'member', is_admin: false } }))
  await page.route('**/api/user/bind_address', (route) => route.fulfill({ json: { results: [{ id: 7, name: 'bound@getanemail.net', address: 'bound@getanemail.net', mail_count: 3, send_count: 1 }] } }))
  await page.goto('/en')

  const actions = [
    page.getByRole('button', { name: 'Change Address' }),
    page.getByRole('button', { name: 'Transfer Address' }),
    page.getByRole('button', { name: 'Unbind Address' }),
  ]
  await actions[2].scrollIntoViewIfNeeded()
  const boxes = await Promise.all(actions.map((action) => action.boundingBox()))
  expect(boxes.every(Boolean)).toBe(true)
  const yPositions = boxes.map((box) => Math.round(box?.y || 0))
  expect(new Set(yPositions).size).toBe(1)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/address-actions-${testInfo.project.name}.png`, fullPage: true })
})

test('new address form localizes the address label and aligns its controls', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('userJwt', 'test.user.jwt'))
  await mockCommon(page)
  await page.route('**/api/user/settings', (route) => route.fulfill({ json: { user_email: 'owner@example.com', user_id: 8, user_role: 'member', is_admin: false } }))
  await page.route('**/api/user/bind_address', (route) => route.fulfill({ json: { results: [] } }))
  await page.goto('/')
  await page.getByRole('tab', { name: '创建或绑定' }).click()
  await page.getByRole('button', { name: '创建新邮箱' }).click()

  await expect(page.getByText('邮箱地址', { exact: true })).toBeVisible()
  const nameInput = page.locator('input').first()
  const domainSelect = page.getByRole('combobox')
  const [inputBox, selectBox] = await Promise.all([nameInput.boundingBox(), domainSelect.boundingBox()])
  expect(inputBox?.height).toBe(40)
  expect(selectBox?.height).toBe(40)
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

test('dashboard navigation groups related settings', async ({ page }) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  await page.route('**/api/admin/address?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.route('**/api/admin/user_settings', (route) => route.fulfill({ json: { enable: true, enableMailVerify: false, enableMailAllowList: false, mailAllowList: [], maxAddressCount: 5, enableEmailCheckRegex: false, emailCheckRegex: '' } }))
  await page.goto('/en/dashboard')

  const primaryNav = page.locator('aside nav').first().or(page.locator('nav.fixed.inset-x-0.bottom-0'))
  await expect(primaryNav.getByRole('button')).toHaveText(['Addresses', 'User', 'Emails', 'Configuration'])

  const secondaryLabels = async () => page.locator('main nav').getByRole('button').allTextContents()
  expect(await secondaryLabels()).toEqual(['Addresses', 'Create Address', 'Address Rules', 'Sender Access Control'])

  await primaryNav.getByRole('button', { name: 'User', exact: true }).click()
  expect(await secondaryLabels()).toEqual(['User Management', 'User Settings', 'Role Address Config', 'Oauth2 Settings', 'Admin'])
  await page.locator('main nav').getByRole('button', { name: 'User Settings', exact: true }).click()
  await expect(page.getByText('Allow new user registration', { exact: true })).toBeVisible()

  await primaryNav.getByRole('button', { name: 'Emails', exact: true }).click()
  expect(await secondaryLabels()).toEqual(['Emails', 'Mails with unknow receiver', 'Send Box', 'Send Mail', 'Sending configuration', 'AI Extract Settings', 'Mail Webhook', 'Webhook Settings', 'Telegram Bot'])

  await primaryNav.getByRole('button', { name: 'Configuration', exact: true }).click()
  expect(await secondaryLabels()).toEqual(['Worker Config', 'IP Blacklist', 'Database', 'Maintenance', 'Statistics', 'Appearance', 'API documentation'])
  await page.locator('main nav').getByRole('button', { name: 'API documentation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'API documentation' })).toBeVisible()
  await expect(page.getByText(/legacy paths|old paths/i)).toHaveCount(0)
})
