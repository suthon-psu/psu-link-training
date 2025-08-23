import { test, expect } from '@playwright/test';

test('login with valid credentials', async ({ page }) => {
  // Go to the login page
  await page.goto('/');
  
  // Fill in login credentials using robust locators
  await page.getByLabel(/username/i).fill('u0');
  await page.getByLabel(/password/i).fill('xxxx');
  
  // Click login button
  await page.getByRole('button', { name: /log in/i }).click();
  
  // Verify successful login by checking redirect to home page
  await expect(page).toHaveURL('/');
  
  // Verify user is logged in by checking welcome message
  await expect(page.getByText('Welcome, u0')).toBeVisible();
});