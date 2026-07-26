import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { FRONTEND_URL } from '../../fixtures/test-helpers';

const mockAnonymousSession = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.route('**/open_api/settings', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        domains: ['example.com'],
        enableAddressPassword: true,
        enableUserCreateEmail: true,
      }),
    });
  });

  await page.route('**/user_api/open_settings', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        enable: true,
        enableMailVerify: true,
        oauth2ClientIDs: [],
      }),
    });
  });
};

test.describe('Unified home authentication', () => {
  test('collects all anonymous authentication paths on the home page', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto(`${FRONTEND_URL}/en/`);

    await expect(page.locator('header.app-header')).toHaveCount(0);
    await expect(page.locator('footer.app-footer')).toHaveCount(0);
    await expect(page.locator('.auth-brand h1')).toHaveCount(0);
    await expect(page.locator('.auth-brand__logo')).toBeVisible();
    const loginTab = page.locator('.auth-tabs > .n-tabs-nav .n-tabs-tab').filter({ hasText: 'Login' });
    const registerTab = page.locator('.auth-tabs > .n-tabs-nav .n-tabs-tab').filter({ hasText: 'Register' });
    await expect(loginTab).toBeVisible();
    await expect(registerTab).toBeVisible();

    const addressLogin = page.getByRole('button', { name: 'Login with Email Credential' });
    const passkeyLogin = page.getByRole('button', { name: 'Login with Passkey' });
    await expect(addressLogin).toBeVisible();
    await expect(passkeyLogin).toBeVisible();
    expect((await addressLogin.boundingBox())!.y).toBeLessThan((await passkeyLogin.boundingBox())!.y);

    await registerTab.click();
    await expect(page.getByText('Verification Code', { exact: true })).toBeVisible();

    await loginTab.click();
    await page.getByRole('button', { name: 'Forgot Password' }).click();
    await expect(page.getByRole('dialog').getByText('Reset Password')).toBeVisible();
    await page.getByRole('dialog').locator('.n-card-header__close').click();

    await addressLogin.click();
    const addressDialog = page.getByRole('dialog');
    await expect(addressDialog.getByText('Email Address Credential', { exact: true })).toBeVisible();
    await expect(addressDialog.locator('textarea')).toBeVisible();
    await expect(addressDialog.getByRole('button', { name: 'Create New Email' })).toHaveCount(0);
    await expect(addressDialog.locator('.auth-tabs > .n-tabs-nav')).toBeHidden();
  });

  test('redirects the retired anonymous user login route to home', async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto(`${FRONTEND_URL}/en/user`);

    await expect(page).toHaveURL(`${FRONTEND_URL}/en/`);
    await expect(page.locator('.auth-brand__logo')).toBeVisible();
  });

  test('fits the authentication card on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAnonymousSession(page);
    await page.goto(`${FRONTEND_URL}/en/`);

    await expect(page.locator('.auth-brand__logo')).toBeVisible();
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows).toBe(false);
    await expect(page.locator('.auth-brand__logo')).toHaveCSS('width', '60px');
  });
});
