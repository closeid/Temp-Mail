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

async function mockCommon(page: Page, overrides: Record<string, unknown> = {}, userOverrides: Record<string, unknown> = {}) {
  await page.route('**/api/open/settings', (route) => route.fulfill({ json: { ...openSettings, ...overrides } }))
  await page.route('**/api/user/open_settings', (route) => route.fulfill({ json: { enable: true, enableMailVerify: true, oauth2ClientIDs: [], ...userOverrides } }))
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

test('registration enforces the user password policy before submission', async ({ page }) => {
  await mockCommon(page, {}, { enableMailVerify: false })
  let registrationRequest: Record<string, string> | undefined
  await page.route('**/api/user/register', async (route) => {
    registrationRequest = route.request().postDataJSON()
    await route.fulfill({ json: { success: true } })
  })

  await page.goto('/en/register')
  await page.locator('input[type="email"]').fill('new-user@example.com')
  await page.locator('input[type="password"]').fill('weakpassword')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: /uppercase and lowercase letters/i })).toBeVisible()
  expect(registrationRequest).toBeUndefined()

  await page.locator('input[type="password"]').fill('StrongPassword1!')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect.poll(() => registrationRequest).toBeTruthy()
  expect(registrationRequest).toMatchObject({ email: 'new-user@example.com', code: '', cf_token: '' })
  expect(registrationRequest?.password).toMatch(/^[a-f0-9]{64}$/)
  expect(registrationRequest?.password).not.toBe('StrongPassword1!')
})

test('disabled registration leaves only the login entry', async ({ page }) => {
  await mockCommon(page, {}, { enable: false })
  await page.goto('/en/login')

  await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Register' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Register' })).toHaveCount(0)

  await page.goto('/en/register')
  await expect(page).toHaveURL(/\/en\/login$/)
  await expect(page.getByRole('tab', { name: 'Register' })).toHaveCount(0)
})

test('configured OAuth2 provider appears on the login page', async ({ page }, testInfo) => {
  await mockCommon(page, {}, { oauth2ClientIDs: [{ clientID: 'closeid-workspace', name: 'CloseID Workspace' }] })
  await page.goto('/en/login')

  await expect(page.getByRole('button', { name: 'Login with CloseID Workspace' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/oauth2-login-${testInfo.project.name}.png`, fullPage: true })
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
  await page.locator('input').nth(1).press('Enter')

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
  await expect(page).toHaveTitle(/sample@getanemail\.net - Get an Email$/)
  const headerActions = page.locator('header button[title]')
  await expect(headerActions).toHaveCount(3)
  const actionBoxes = await headerActions.evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect()
    return { y: Math.round(box.y), height: Math.round(box.height) }
  }))
  expect(new Set(actionBoxes.map((box) => box.y)).size).toBe(1)
  expect(new Set(actionBoxes.map((box) => box.height))).toEqual(new Set([36]))
  if (testInfo.project.name === 'mobile') {
    const actionLabels = headerActions.locator('span')
    await expect(actionLabels).toHaveCount(3)
    for (let index = 0; index < 3; index += 1) await expect(actionLabels.nth(index)).toBeHidden()
  }
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
  await expect(page.getByText('#12', { exact: true })).toHaveCount(0)
  const body = fullscreen.getByText('A compact mailbox message.')
  await expect(body).toBeVisible()
  const bodyBox = await body.boundingBox()
  expect(bodyBox?.y).toBeLessThan(420)
  await page.screenshot({ path: `test-results/mail-fullscreen-${testInfo.project.name}.png`, fullPage: true })
})

test('mailbox settings use the mailbox title and keep sign-out only in the header', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jwt', 'test.jwt.credential'))
  await mockCommon(page)
  await page.route('**/api/settings', (route) => route.fulfill({ json: { address: 'sample@getanemail.net', send_balance: 8, auto_reply: {} } }))
  await page.goto('/en/settings/credentials')

  await expect(page).toHaveTitle('Credentials - sample@getanemail.net - Get an Email')
  await expect(page.locator('header').getByRole('button', { name: 'Logout' })).toHaveCount(1)
  await expect(page.locator('main').getByRole('button', { name: 'Logout' })).toHaveCount(0)
  await page.locator('header').getByRole('button', { name: 'Logout' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('jwt'))).toBe('')
  await expect(page).toHaveURL(/\/en\/login$/)
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

test('dashboard home shows statistics and primary navigation', async ({ page }, testInfo) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  await page.route('**/api/admin/statistics', (route) => route.fulfill({ json: { mailCount: 12, addressCount: 4, userCount: 2 } }))
  await page.goto('/en/dashboard')
  await expect(page.getByText('Received mail')).toBeVisible()
  await expect(page.getByText('12', { exact: true })).toBeVisible()
  if (testInfo.project.name === 'mobile') {
    const bottomNav = page.locator('nav.fixed.inset-x-0.bottom-0')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.locator('button')).toHaveCount(5)
  } else {
    await expect(page.locator('aside nav')).toBeVisible()
  }
  await expect(page.locator('main nav')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/dashboard-${testInfo.project.name}.png`, fullPage: true })
})

test('dashboard root requires administrator authentication', async ({ page }) => {
  await mockCommon(page)
  await page.goto('/en/dashboard')
  await expect(page).toHaveURL(/\/en\/dashboard\/login$/)
  await expect(page.getByRole('heading', { name: 'Administrator access' })).toBeVisible()
})

test('dashboard assigns an unowned address to a searched user', async ({ page }) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  let requestBody: Record<string, unknown> | undefined
  await page.route('**/api/admin/address?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 7, name: 'unowned@getanemail.net', created_at: '2026-07-27', updated_at: '2026-07-27', source_meta: '127.0.0.1', owner_email: null, mail_count: 0, send_count: 0 }] } }))
  await page.route('**/api/admin/users?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 3, user_email: 'owner@example.com' }] } }))
  await page.route('**/api/admin/users/bind_address', async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({ json: { success: true } })
  })

  await page.goto('/en/dashboard/addresses/list')
  await page.getByTitle('Actions').click()
  const assignItem = page.getByRole('menuitem', { name: 'Assign to a registered user' })
  await expect(assignItem.locator('svg')).toHaveCount(0)
  await assignItem.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('unowned@getanemail.net')
  await dialog.getByPlaceholder('Search registered users').fill('owner')
  await dialog.getByRole('option', { name: 'owner@example.com' }).click()
  await dialog.getByRole('button', { name: 'Assign to a registered user' }).click()

  await expect.poll(() => requestBody).toEqual({ address_id: 7, user_email: 'owner@example.com' })
  await expect(page.getByText('Address assigned to user')).toBeVisible()
  await expect(dialog).toHaveCount(0)
})

test('dashboard unbinds owned addresses from address and user management', async ({ page }) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  const unbindRequests: Array<{ addressId: string; userId: string | null }> = []
  const address = { id: 7, name: 'owned@getanemail.net', created_at: '2026-07-27', updated_at: '2026-07-27', source_meta: '127.0.0.1', owner_email: 'owner@example.com', owner_user_id: 3, mail_count: 0, send_count: 0 }
  await page.route('**/api/admin/address?**', (route) => route.fulfill({ json: { count: 1, results: [address] } }))
  await page.route('**/api/admin/users?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 3, user_email: 'owner@example.com', role_text: 'member', address_count: 1, created_at: '2026-07-27' }] } }))
  await page.route('**/api/admin/user_roles', (route) => route.fulfill({ json: [{ role: 'member' }] }))
  await page.route('**/api/admin/users/bind_address/3', (route) => route.fulfill({ json: { results: [address] } }))
  await page.route('**/api/admin/users/bind_address/7*', async (route) => {
    const url = new URL(route.request().url())
    unbindRequests.push({ addressId: url.pathname.split('/').pop() || '', userId: url.searchParams.get('user_id') })
    await route.fulfill({ json: { success: true } })
  })

  await page.goto('/en/dashboard/addresses/list')
  await page.getByTitle('Actions').click()
  const addressMenuItem = page.getByRole('menuitem', { name: 'Unbind address' })
  await expect(addressMenuItem.locator('svg')).toHaveCount(0)
  await addressMenuItem.click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(() => unbindRequests).toEqual([{ addressId: '7', userId: '3' }])
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: 'Address unbound' }).first()
  await expect(toast.locator('[data-close-button]')).toHaveCSS('right', '0px')
  await expect(toast.locator('[data-close-button]')).toHaveCSS('bottom', '0px')

  await page.getByRole('button', { name: 'User', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/users\/list$/)
  const userRow = page.getByRole('row').filter({ hasText: 'owner@example.com' }).filter({ hasText: 'member' })
  await expect(userRow).toBeVisible()
  await userRow.getByTitle('Actions').click()
  await page.getByRole('menuitem', { name: 'Manage addresses' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('cell', { name: '2026-07-27' })).toHaveCSS('white-space', 'nowrap')
  const userAddressButton = dialog.getByRole('button', { name: 'Unbind address' })
  await expect(userAddressButton.locator('svg')).toHaveCount(0)
  await userAddressButton.click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(() => unbindRequests).toHaveLength(2)
  expect(unbindRequests[1]).toEqual({ addressId: '7', userId: '3' })
})

test('security settings change the password and let the user delete a Passkey', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('userJwt', 'user.session.jwt'))
  await mockCommon(page)
  let passwordRequest: Record<string, string> | undefined
  let deletedPasskey = ''
  await page.route('**/api/user/settings', (route) => route.fulfill({ json: { user_email: 'owner@example.com', user_id: 8, user_role: 'member', is_admin: false } }))
  await page.route('**/api/user/change_password', async (route) => {
    passwordRequest = route.request().postDataJSON()
    await route.fulfill({ json: { success: true } })
  })
  await page.route('**/api/user/passkey', (route) => route.fulfill({ json: [{ passkey_id: 'passkey-1', passkey_name: 'Laptop', created_at: '2026-07-31 10:00:00' }] }))
  await page.route('**/api/user/passkey/passkey-1', async (route) => {
    deletedPasskey = route.request().url().split('/').pop() || ''
    await route.fulfill({ json: { success: true } })
  })

  await page.goto('/en/settings/security')
  await page.getByLabel('Current Password', { exact: true }).fill('old-password')
  await page.getByLabel('New Password', { exact: true }).fill('NewPassword1!')
  await page.getByLabel('Confirm New Password', { exact: true }).fill('NewPassword1!')
  await page.getByRole('button', { name: 'Change Password', exact: true }).click()
  await expect.poll(() => Boolean(passwordRequest && passwordRequest.current_password.length === 64 && passwordRequest.new_password.length === 64 && passwordRequest.current_password !== passwordRequest.new_password)).toBe(true)
  expect(passwordRequest?.new_password).not.toBe('NewPassword1!')

  await page.getByRole('button', { name: 'Show Passkey List' }).click()
  await expect(page.getByRole('dialog')).toContainText('Laptop')
  await page.getByTitle('Delete Passkey').click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(() => deletedPasskey).toBe('passkey-1')
})

test('administrator can view and delete a user Passkey', async ({ page }) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  let deletedPasskey = ''
  await page.route('**/api/admin/users?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 8, user_email: 'owner@example.com', role_text: 'member', address_count: 0, created_at: '2026-07-31' }] } }))
  await page.route('**/api/admin/user_roles', (route) => route.fulfill({ json: [{ role: 'member' }] }))
  await page.route('**/api/admin/users/8/passkeys', (route) => route.fulfill({ json: { results: [{ passkey_id: 'passkey-1', passkey_name: 'Laptop', created_at: '2026-07-31 10:00:00' }] } }))
  await page.route('**/api/admin/users/8/passkeys/passkey-1', async (route) => {
    deletedPasskey = route.request().url().split('/').pop() || ''
    await route.fulfill({ json: { success: true } })
  })

  await page.goto('/en/dashboard/users/list')
  const row = page.getByRole('row').filter({ hasText: 'owner@example.com' })
  await row.getByTitle('Actions').click()
  await page.getByRole('menuitem', { name: 'Manage Passkeys' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Laptop')
  await dialog.getByTitle('Delete Passkey').click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(() => deletedPasskey).toBe('passkey-1')
})

test('administrator can generate a compliant password when resetting a user', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4174' })
  await mockCommon(page, { disableAdminPasswordCheck: true })
  let passwordRequest: Record<string, string> | undefined
  await page.route('**/api/admin/users?**', (route) => route.fulfill({ json: { count: 1, results: [{ id: 8, user_email: 'owner@example.com', role_text: 'member', address_count: 0, created_at: '2026-07-31' }] } }))
  await page.route('**/api/admin/user_roles', (route) => route.fulfill({ json: [{ role: 'member' }] }))
  await page.route('**/api/admin/users/8/reset_password', async (route) => {
    passwordRequest = route.request().postDataJSON()
    await route.fulfill({ json: { success: true } })
  })

  await page.goto('/en/dashboard/users/list')
  const row = page.getByRole('row').filter({ hasText: 'owner@example.com' })
  await row.getByTitle('Actions').click()
  await page.getByRole('menuitem', { name: 'Reset password' }).click()
  const dialog = page.getByRole('dialog')
  const generateButton = dialog.getByRole('button', { name: 'Generate password' })
  const cancelButton = dialog.getByRole('button', { name: 'Cancel' })
  const confirmButton = dialog.getByRole('button', { name: 'Confirm' })
  await generateButton.click()
  const passwordInput = dialog.locator('input')
  await expect(passwordInput).toHaveAttribute('type', 'text')
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Copied' })).toBeVisible()
  const generatedPassword = await passwordInput.inputValue()
  expect(generatedPassword).toHaveLength(12)
  expect(generatedPassword).toMatch(/[a-z]/)
  expect(generatedPassword).toMatch(/[A-Z]/)
  expect(generatedPassword).toMatch(/[0-9]/)
  expect(generatedPassword).toMatch(/[^A-Za-z0-9\s]/)
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(generatedPassword)
  await passwordInput.fill('ManualPassword1!')
  await expect(passwordInput).toHaveAttribute('type', 'password')
  await generateButton.click()
  await expect(passwordInput).toHaveAttribute('type', 'text')
  const passwordToSubmit = await passwordInput.inputValue()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(passwordToSubmit)
  const buttonBoxes = await Promise.all([generateButton, cancelButton, confirmButton].map((button) => button.boundingBox()))
  expect(buttonBoxes.every((box) => box && box.y === buttonBoxes[0]?.y)).toBe(true)
  expect((buttonBoxes[0]?.x || 0) < (buttonBoxes[1]?.x || 0)).toBe(true)
  await confirmButton.click()
  await expect.poll(() => passwordRequest?.password).toMatch(/^[a-f0-9]{64}$/)
  expect(passwordRequest?.password).not.toBe(passwordToSubmit)
})

test('dashboard administration settings stay available and aligned', async ({ page }, testInfo) => {
  await mockCommon(page, { disableAdminPasswordCheck: true, enableWebhook: false })
  await page.route('**/api/admin/statistics', (route) => route.fulfill({ json: { mailCount: 0, addressCount: 0 } }))
  await page.route('**/api/admin/address?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.route('**/api/admin/users?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.route('**/api/admin/user_roles', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/admin/user_oauth2_settings', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/admin/worker/configs', (route) => route.fulfill({ json: { SEND_MAIL_CONFIG: { cloudflareBinding: true, resendGlobal: false, resendDomains: ['getanemail.net'], smtpDomains: [], defaultSendBalance: 5 } } }))
  await page.route('**/api/admin/mail_webhook/settings', (route) => route.fulfill({ json: { enabled: false, url: '', method: 'POST', headers: '{}', body: '{}' } }))
  await page.route('**/api/admin/webhook/settings', (route) => route.fulfill({ json: { enableAllowList: false, allowList: [] } }))
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

  await page.getByRole('button', { name: 'Webhook', exact: true }).click()
  await expect(page.getByText(/ENABLE_WEBHOOK is disabled/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mailbox webhook access' })).toBeVisible()
  await expect(page.getByText(/contact.*administrator/i)).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/dashboard-settings-${testInfo.project.name}.png`, fullPage: true })
})

test('dashboard navigation groups related settings', async ({ page }) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  await page.route('**/api/admin/statistics', (route) => route.fulfill({ json: { mailCount: 0, addressCount: 0 } }))
  await page.route('**/api/admin/address?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.route('**/api/admin/users?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.route('**/api/admin/user_roles', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/admin/user_settings', (route) => route.fulfill({ json: { enable: true, enableMailVerify: false, enableMailAllowList: false, mailAllowList: [], maxAddressCount: 5, enableEmailCheckRegex: false, emailCheckRegex: '' } }))
  await page.goto('/en/dashboard')

  const primaryNav = page.locator('aside nav').first().or(page.locator('nav.fixed.inset-x-0.bottom-0'))
  await expect(primaryNav.getByRole('button')).toHaveText(['Home', 'Addresses', 'User', 'Emails', 'Configuration'])

  const secondaryNav = page.locator('main nav').getByRole('button')
  await expect(secondaryNav).toHaveCount(0)

  await primaryNav.getByRole('button', { name: 'Addresses', exact: true }).click()
  await expect(secondaryNav).toHaveText(['All addresses', 'Create Address', 'Address Rules', 'Sender Access Control'])

  await primaryNav.getByRole('button', { name: 'User', exact: true }).click()
  await expect(page.locator('main nav').getByRole('button')).toHaveText(['User Management', 'User Settings', 'Role Address Config', 'Oauth2 Settings', 'Access Tokens'])
  await page.locator('main nav').getByRole('button', { name: 'User Settings', exact: true }).click()
  await expect(page.getByText('Allow new user registration', { exact: true })).toBeVisible()

  await primaryNav.getByRole('button', { name: 'Emails', exact: true }).click()
  await expect(page.locator('main nav').getByRole('button')).toHaveText(['Emails', 'Mails with unknow receiver', 'Send Box', 'Send Mail', 'Sending configuration', 'AI Extract Settings', 'Webhook', 'Telegram Bot'])
  await page.locator('main nav').getByRole('button', { name: 'Webhook', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/mail\/webhook$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Webhook', exact: true })).toBeVisible()

  await primaryNav.getByRole('button', { name: 'Configuration', exact: true }).click()
  await expect(page.locator('main nav').getByRole('button')).toHaveText(['Worker Config', 'IP Blacklist', 'Database', 'Maintenance', 'Appearance', 'API documentation'])
  await page.locator('main nav').getByRole('button', { name: 'API documentation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'API documentation' })).toBeVisible()
  await expect(page.getByText(/legacy paths|old paths/i)).toHaveCount(0)
})

test('administrator password remains memory-only and reload requires sign-in', async ({ page }) => {
  await mockCommon(page)
  await page.route('**/api/open/admin_login', (route) => route.fulfill({ json: { success: true } }))
  await page.route('**/api/admin/statistics', (route) => route.fulfill({ json: { mailCount: 0, addressCount: 0, userCount: 0 } }))

  await page.goto('/en/dashboard/login')
  await page.getByLabel('Administrator username').fill('admin')
  await page.getByLabel('Administrator password').fill('old-password')
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page).toHaveURL(/\/en\/dashboard$/)
  await expect.poll(() => page.evaluate(() => ({
    local: localStorage.getItem('adminAuth'),
    session: sessionStorage.getItem('adminAuth'),
  }))).toEqual({ local: null, session: null })
  await expect(page).toHaveTitle('Administration - Get an Email')
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(1)

  await page.reload()
  await expect(page).toHaveURL(/\/en\/dashboard\/login$/)
  await expect(page.getByLabel('Administrator password')).toBeVisible()
})

test('administrator can create and revoke access tokens', async ({ page }, testInfo) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  let createdBody: Record<string, unknown> | undefined
  let deletedId = ''
  await page.route('**/api/admin/access_tokens', async (route) => {
    if (route.request().method() === 'POST') {
      createdBody = route.request().postDataJSON()
      return route.fulfill({ status: 201, json: { id: 4, name: 'Automation', token: 'gae_admin_example-once-only', expires_at: null } })
    }
    return route.fulfill({ json: { results: [{ id: 3, name: 'Existing integration', created_at: '2026-07-29 12:00:00', expires_at: null, last_used_at: null }] } })
  })
  await page.route('**/api/admin/access_tokens/*', async (route) => {
    deletedId = route.request().url().split('/').pop() || ''
    await route.fulfill({ json: { success: true } })
  })

  await page.goto('/en/dashboard/users/access-tokens')
  await expect(page.getByRole('heading', { name: 'Access Tokens' })).toBeVisible()
  await page.getByRole('button', { name: 'Create token' }).click()
  await page.getByLabel('Name').fill('Automation')
  await page.getByRole('dialog').getByRole('button', { name: 'Create token' }).click()
  await expect(page.getByText('gae_admin_example-once-only')).toBeVisible()
  expect(createdBody).toEqual({ name: 'Automation', expiresAt: null })
  await page.getByRole('button', { name: 'Confirm' }).click()

  await page.getByTitle('Delete access token').click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(() => deletedId).toBe('3')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: `test-results/admin-access-tokens-${testInfo.project.name}.png`, fullPage: true })
})

test('standalone mailbox JWT is restricted to the current mailbox', async ({ page }) => {
  await page.addInitScript(() => {
    const token = (address: string) => `header.${btoa(JSON.stringify({ address })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}.signature`
    const current = token('single@getanemail.net')
    localStorage.setItem('jwt', current)
    localStorage.setItem('mailboxAccessMode', 'credential')
    localStorage.setItem('LocalAddressCache', JSON.stringify([current, token('cached@getanemail.net')]))
  })
  await mockCommon(page)
  await page.route('**/api/settings', (route) => route.fulfill({ json: { address: 'single@getanemail.net', send_balance: 0, auto_reply: {} } }))
  await page.route('**/api/mails?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.goto('/en/mail/inbox')

  await expect(page).toHaveTitle(/^(Mail Box|收件箱) - single@getanemail\.net - Get an Email$/)
  await expect(page.getByRole('button', { name: /Address Management|地址管理/ })).toHaveCount(0)
  await page.getByRole('combobox').filter({ hasText: 'single@getanemail.net' }).click()
  await expect(page.getByRole('option')).toHaveCount(1)
  await expect(page.getByRole('option')).toHaveText('single@getanemail.net')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Account Settings|账号设置/ }).click()
  await expect(page.getByRole('button', { name: /Security|安全/ })).toHaveCount(0)
})

test('account session keeps mailbox switching and can bind the current JWT mailbox', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('userJwt', 'account.session.jwt'))
  await mockCommon(page)
  let currentBound = false
  await page.route('**/api/user/settings', (route) => route.fulfill({ json: { user_email: 'owner@example.com', user_id: 8, user_role: 'member', is_admin: false } }))
  await page.route('**/api/user/bind_address', (route) => {
    if (route.request().method() === 'POST') { currentBound = true; return route.fulfill({ json: {} }) }
    return route.fulfill({ json: { results: [
      ...(currentBound ? [{ id: 10, name: 'current@getanemail.net', address: 'current@getanemail.net' }] : []),
      { id: 11, name: 'other@getanemail.net', address: 'other@getanemail.net' },
    ] } })
  })
  await page.route('**/api/settings', (route) => route.fulfill({ json: { address: 'current@getanemail.net', send_balance: 0, auto_reply: {} } }))
  await page.route('**/api/mails?**', (route) => route.fulfill({ json: { count: 0, results: [] } }))
  await page.goto('/en/?jwt=current.mailbox.jwt')

  await expect(page).toHaveTitle('Mail Box - current@getanemail.net - Get an Email')
  await expect(page.getByRole('button', { name: /Address Management|地址管理/ })).toBeVisible()
  await page.getByRole('combobox').filter({ hasText: 'current@getanemail.net' }).click()
  await expect(page.getByRole('option', { name: 'current@getanemail.net' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'other@getanemail.net' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Address Management|地址管理/ }).click()
  await page.getByRole('button', { name: /Bind current mailbox|绑定当前邮箱/ }).click()
  await expect.poll(() => currentBound).toBe(true)
})

test('maintenance exposes retention fields, right-aligned switches, and a SQL example', async ({ page }, testInfo) => {
  await mockCommon(page, { disableAdminPasswordCheck: true })
  await page.route('**/api/admin/auto_cleanup', (route) => route.fulfill({ json: {
    enableMailsAutoCleanup: true, cleanMailsDays: 30,
    enableUnknowMailsAutoCleanup: false, cleanUnknowMailsDays: 30,
    enableSendBoxAutoCleanup: false, cleanSendBoxDays: 30,
    enableAddressAutoCleanup: false, cleanAddressDays: 30,
    enableInactiveAddressAutoCleanup: false, cleanInactiveAddressDays: 30,
    enableUnboundAddressAutoCleanup: false, cleanUnboundAddressDays: 30,
    enableEmptyAddressAutoCleanup: false, cleanEmptyAddressDays: 30,
    customSqlCleanupList: [{ id: 'sample', name: '', sql: '', enabled: false }],
  } }))
  await page.goto('/en/dashboard/configuration/cleanup')

  const days = page.locator('input[type="number"]')
  await expect(days).toHaveCount(7)
  await expect(page.getByRole('switch')).toHaveCount(8)
  await expect(page.locator('textarea').first()).toHaveAttribute('placeholder', /DELETE FROM raw_mails/)
  if (testInfo.project.name === 'desktop') {
    const [inputBox, switchBox] = await Promise.all([days.first().boundingBox(), page.getByRole('switch').first().boundingBox()])
    expect(switchBox?.x).toBeGreaterThan(inputBox?.x || 0)
  }
  await expectNoHorizontalOverflow(page)
})
