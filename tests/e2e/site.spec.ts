import { expect, test } from '@playwright/test';

const routes = ['/', '/projects', '/compare', '/match', '/deployments', '/model-card', '/cv', '/projects/madrid-data-house', '/projects/energy-volatility', '/projects/home-credit', '/projects/portfolio'];

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
  // It starts training when it scrolls into view (the current deployment sits above it).
  await page.locator('.hero').scrollIntoViewIfNeeded();
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

test('an ablation run gets its own OLS baseline and a row in the runs table', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero').scrollIntoViewIfNeeded();
  // Start before the automatic run ends: the default row must keep its published result.
  await expect(page.locator('[data-pill]')).toContainText('Training');
  await page.locator('[data-controls] select[name="set"]').selectOption('house');
  await page.getByRole('button', { name: 'Train' }).click();
  const rows = page.locator('[data-exp] tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator('th')).toHaveText('House only');
  await expect(rows.nth(1).locator('.delta')).toHaveText(/^−/);
  await expect(rows.first().locator('.delta')).not.toHaveText('…', { timeout: 15_000 });
  // House-only OLS is worse than the all-features baseline.
  const olsText = (await rows.first().locator('td').nth(2).textContent())!;
  expect(Number(olsText.replace(/\D/g, ''))).toBeGreaterThan(916);
  await expect(page.locator('.curve-prev')).toHaveCount(1);
});

test('the AI lens swaps the home figures and intro without JS-only flashes', async ({ page }) => {
  await page.goto('/?lens=ai');
  await expect(page.locator('dl.summary:visible')).toHaveCount(1);
  await expect(page.locator('dl.summary:visible')).toContainText('5 min');
  await expect(page.locator('.lede')).toContainText('Claude Agent SDK');
  await expect(page.locator('dl.summary[data-lens-only="ds"]')).toBeHidden();
});

test('the lens also applies in Spanish', async ({ page }) => {
  await page.goto('/es?lens=quant');
  await expect(page.locator('dl.summary:visible')).toContainText('VaR −160 pb');
});

test('the quant lens puts the volatility paper first and survives navigation', async ({ page }) => {
  await page.goto('/projects?lens=quant');
  await expect(page.locator('#runs-table tbody tr').first()).toHaveAttribute('data-run', 'energy-volatility');
  await expect(page.locator('[data-lens-select]')).toHaveValue('quant');
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(page).toHaveURL(/lens=quant/);
});

test('project filters narrow the table and can be cleared', async ({ page }) => {
  await page.goto('/projects');
  await page.locator('label', { hasText: 'production' }).click();
  await expect(page.locator('#runs-table tbody tr:visible')).toHaveCount(2);
  await page.locator('select[name="tool"]').selectOption('PyTorch');
  await expect(page.locator('[data-empty]')).toBeVisible();
  await page.locator('[data-clear]').click();
  await expect(page.locator('#runs-table tbody tr:visible')).toHaveCount(8);
});

test('the tool filter groups tools and can filter by a whole group', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('select[name="tool"] optgroup')).toHaveCount(6);
  await page.locator('select[name="tool"]').selectOption({ label: 'AI and agents: all (2)' });
  await expect(page.locator('#runs-table tbody tr:visible')).toHaveCount(2);
  await page.locator('select[name="tool"]').selectOption({ label: 'PySpark (1)' });
  await expect(page.locator('#runs-table tbody tr:visible')).toHaveAttribute('data-run', 'geo-referencing');
});

test('the home lists the three top projects of the current focus', async ({ page }) => {
  const featured = page.locator('section[aria-labelledby="featured-title"] tbody tr:visible');
  await page.goto('/');
  await expect(featured).toHaveCount(3);
  await expect(featured.first()).toHaveAttribute('data-run', 'madrid-data-house');
  await page.goto('/?lens=ai');
  await expect(featured).toHaveCount(3);
  await expect(featured.first()).toHaveAttribute('data-run', 'data-ingestion-agent');
});

test('config blocks are translated on Spanish pages', async ({ page }) => {
  await page.goto('/es/projects/ds-teaching-portal#config');
  await expect(page.locator('#config')).toContainText('notebooks de Jupyter');
  await expect(page.locator('#config')).not.toContainText('in development');
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
  await expect(page).toHaveURL(/\/projects\/home-credit/);
});

test('run tabs switch panels and respect the hash', async ({ page }) => {
  await page.goto('/projects/energy-volatility#metrics');
  await expect(page.locator('#metrics')).toBeVisible();
  await expect(page.locator('#overview')).toBeHidden();
  await page.getByRole('tab', { name: 'Decisions' }).click();
  await expect(page.locator('#decisions')).toBeVisible();
});

test('theme toggle persists across pages', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-theme-toggle]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/projects');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('home credit never shows model metrics', async ({ page }) => {
  await page.goto('/projects/home-credit');
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\bAUC\s*[=:]?\s*0[.,]\d/);
  await expect(page.locator('main')).toContainText('Sealed until holdout');
});

test('match: an example offer gets a verdict backed by links to projects', async ({ page }) => {
  await page.goto('/match');
  await page.locator('[data-example="bank"]').click();
  await expect(page.locator('[data-verdict]')).toHaveText('Good fit');
  await expect(page.locator('.mt-table tbody tr').first().locator('a').first()).toHaveAttribute('href', /^\/(projects|deployments|cv|model-card)/);
  // The link carries the chips, never the pasted text.
  expect(page.url()).toContain('skills=');
  expect(page.url()).not.toContain('Retail');
});

test('match: pasted text becomes editable chips, and gaps are said out loud', async ({ page }) => {
  await page.goto('/es/match');
  await page.locator('#mt-offer').fill('Senior Quant Developer. Más de 5 años de experiencia. Requisitos: C++, Linux, Python.');
  await page.getByRole('button', { name: 'Leer requisitos' }).click();
  await expect(page.locator('.mt-chip')).toHaveCount(3);
  await expect(page.locator('[data-verdict]')).toHaveText('No encaja');
  await expect(page.locator('tr[data-status="gap"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Quitar C++ / C#' }).click();
  await expect(page.locator('.mt-chip')).toHaveCount(2);
});

test('match: a shared link restores the requirements', async ({ page }) => {
  await page.goto('/match?role=ds&sector=finance&level=intern&skills=python,sql,~tableau');
  await expect(page.locator('.mt-chip')).toHaveCount(3);
  await expect(page.locator('.mt-chip.p-nice')).toHaveText(/Tableau/);
  await expect(page.locator('[data-verdict]')).toHaveText('Good fit');
});
