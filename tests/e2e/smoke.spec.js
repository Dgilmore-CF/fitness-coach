import { test, expect } from '@playwright/test';

/**
 * Minimal smoke test for the Vite dev server.
 *
 * This test suite verifies that the refactored foundation loads correctly.
 * Deeper integration tests require the full wrangler dev environment with
 * D1 database and will be added in a follow-up.
 */

test.describe('Dev server smoke tests', () => {
  test('loads the scaffolding status page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('AI Fitness Coach')).toBeVisible();
    await expect(page.getByText('v2 Refactor Scaffolding')).toBeVisible();
  });

  test('has all component smoke test buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Test Toast/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Test Modal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Test Confirm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Test Progress Ring/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Test Learn Screen/i })).toBeVisible();
  });

  test('toast button displays a toast', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Test Toast/i }).click();
    await expect(page.getByText('Toast notifications are working!')).toBeVisible();
  });

  test('modal button opens and dismisses a modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Test Modal/i }).click();
    await expect(page.getByText('Modal Test')).toBeVisible();
    await expect(page.getByText('Focus trap')).toBeVisible();

    // Close via the OK button
    await page.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(page.getByText('Modal Test')).not.toBeVisible();
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    await page.goto('/');

    const root = page.locator('html');
    const initialTheme = await root.getAttribute('data-theme');

    await page.getByRole('button', { name: /Theme/i }).click();

    // The theme should have flipped
    const afterToggleTheme = await root.getAttribute('data-theme');
    expect(afterToggleTheme).not.toBe(initialTheme);
    expect(['light', 'dark']).toContain(afterToggleTheme);
  });

  test('Learn screen mounts inline preview', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Test Learn Screen/i }).click();

    // The Learn content should now be visible
    await expect(page.getByText(/Training Education Center/i)).toBeVisible();
    // At least one section header should be rendered
    await expect(page.getByText(/Hypertrophy Training/i)).toBeVisible();
  });
});
