import { test, expect } from '@playwright/test';

const routeAlternatives = (page) => page.locator('.route-panel > .route-card-list > .route-card');

const setupOfflineDemo = async (page) => {
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'Offline demo mode' }).check();
  await page.getByText('Enter coordinates (keyboard alternative)', { exact: true }).click();
  await page.getByRole('button', { name: 'Set endpoint', exact: true }).click();
  await page.getByRole('combobox', { name: 'Endpoint', exact: true }).selectOption('destination');
  await page.getByRole('spinbutton', { name: 'Latitude', exact: true }).fill('28.5672');
  await page.getByRole('spinbutton', { name: 'Longitude', exact: true }).fill('77.2100');
  await page.getByRole('button', { name: 'Set endpoint', exact: true }).click();
  await expect(routeAlternatives(page)).toHaveCount(3);
};

test('save, import/export, shared links, replay and refresh recovery', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setupOfflineDemo(page);
  await page.getByLabel('Scenario name', { exact: true }).fill('Delhi teaching run');
  await page.getByRole('button', { name: 'Start movement', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('emergency-corridor.autosave.v1') || '{}').snapshot?.simulation.progressMeters || 0)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate blockage on recommended corridor' }).click();
  await page.getByRole('button', { name: 'Save snapshot', exact: true }).click();
  await page.getByRole('button', { name: 'Replay recording' }).click();
  const replay = page.getByRole('dialog', { name: 'Replay: Delhi teaching run' });
  await expect(replay).toBeVisible();
  await replay.getByRole('slider', { name: 'Replay timeline' }).focus();
  await page.keyboard.press('End');
  await expect(replay.locator('.replay-summary')).toContainText('1 event(s)');
  await page.keyboard.press('Home');
  await expect(replay.locator('.replay-summary')).toContainText('0 event(s)');
  await replay.getByRole('button', { name: 'Play replay' }).click();
  await expect(replay.locator('.replay-summary')).toContainText('1 event(s)', { timeout: 10000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Replay recording' })).toBeFocused();

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadEvent;
  const exportedPath = await download.path();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(routeAlternatives(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByLabel('Scenario name', { exact: true })).toHaveValue('Delhi teaching run');
  await expect(routeAlternatives(page)).toHaveCount(3);
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('Import scenario file', { exact: true }).setInputFiles(exportedPath);
  await expect(page.getByLabel('Scenario name', { exact: true })).toHaveValue('Delhi teaching run');
  await expect(routeAlternatives(page)).toHaveCount(3);

  await page.getByRole('button', { name: 'Copy share link', exact: true }).click();
  const shared = await page.getByLabel('Scenario share link', { exact: true }).inputValue();
  expect(shared).toContain('#scenario=');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.goto(shared);
  await expect(page.getByLabel('Scenario name', { exact: true })).toHaveValue('Delhi teaching run');
  await expect(routeAlternatives(page)).toHaveCount(3);
  // pagehide flushes the exact latest state even before the periodic autosave.
  await page.reload();
  await expect(page.getByLabel('Scenario name', { exact: true })).toHaveValue('Delhi teaching run');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('offline reload uses precached application and saved routes', async ({ page, context }) => {
  await setupOfflineDemo(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Emergency Corridor', exact: true })).toBeVisible();
  await expect(routeAlternatives(page)).toHaveCount(3);
  await expect(page.getByText('Offline · demo data available', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start movement', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
});

test('mobile layout and keyboard incident entry keep controls accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupOfflineDemo(page);
  await page.getByText('Place event with coordinates', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Event latitude' }).fill('28.60');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('spinbutton', { name: 'Event longitude' })).toBeFocused();
  await page.keyboard.type('77.21');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Simulated blockage added at 28.6, 77.21.', { exact: true })).toBeVisible();
  await page.getByText('Compare routes in a table', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`).toBe(true);
  }
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
});
