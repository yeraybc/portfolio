import { expect, test } from '@playwright/test';

const routes = ['/', '/runs', '/compare', '/deployments', '/model-card', '/cv', '/runs/madrid-data-house', '/runs/energy-volatility', '/runs/home-credit'];

for (const locale of ['', '/es']) {
  for (const route of routes) {
    const path = `${locale}${route === '/' && locale ? '' : route}` || '/';
    test(`loads ${path} without errors or overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

test('the live run trains in the browser and beats the baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-pill]')).toContainText('Beats baseline', { timeout: 15_000 });
  await expect(page.locator('[data-epoch]')).not.toHaveText('0');
});

test('reduced motion shows the final curve without training', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('.curve-static')).toBeVisible();
  await expect(page.locator('[data-epoch]')).toHaveText('100');
  await ctx.close();
});

test('the quant lens puts the volatility paper first and survives navigation', async ({ page }) => {
  await page.goto('/runs?lens=quant');
  await expect(page.locator('#runs-table tbody tr').first()).toHaveAttribute('data-run', 'energy-volatility');
  await expect(page.locator('[data-lens-select]')).toHaveValue('quant');
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(page).toHaveURL(/lens=quant/);
});

test('run filters narrow the table and can be cleared', async ({ page }) => {
  await page.goto('/runs');
  await page.locator('label', { hasText: 'production' }).click();
  await expect(page.locator('#runs-table tbody tr:visible')).toHaveCount(1);
  await page.locator('select[name="tool"]').selectOption('PyTorch');
  await expect(page.locator('[data-empty]')).toBeVisible();
  await page.locator('[data-clear]').click();
  await expect(page.locator('#runs-table tbody tr:visible')).toHaveCount(7);
});

test('compare reads the URL and shows deltas', async ({ page }) => {
  await page.goto('/compare?a=madrid-data-house&b=energy-volatility');
  const cols = page.locator('.cmp-col');
  await expect(cols.nth(0).locator('h2')).toHaveText('MadridDataHouse');
  await expect(cols.nth(1).locator('h2')).toContainText('Energy volatility');
  await expect(cols.nth(0)).toContainText('−17.8%');
  await page.locator('.cmp-pickers select').nth(1).selectOption('home-credit');
  await expect(page).toHaveURL(/b=home-credit/);
  await expect(cols.nth(1)).toContainText('Sealed until holdout');
});

test('command palette opens with the keyboard and navigates', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  const input = page.locator('.cmdk-input');
  await expect(input).toBeFocused();
  await input.fill('home credit');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/runs\/home-credit/);
});

test('run tabs switch panels and respect the hash', async ({ page }) => {
  await page.goto('/runs/energy-volatility#metrics');
  await expect(page.locator('#metrics')).toBeVisible();
  await expect(page.locator('#overview')).toBeHidden();
  await page.getByRole('tab', { name: 'Decisions' }).click();
  await expect(page.locator('#decisions')).toBeVisible();
});

test('theme toggle persists across pages', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-theme-toggle]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/runs');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('home credit never shows model metrics', async ({ page }) => {
  await page.goto('/runs/home-credit');
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\bAUC\s*[=:]?\s*0[.,]\d/);
  await expect(page.locator('main')).toContainText('Sealed until holdout');
});
