const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');

  // Wait for loading screen to disappear
  try {
    await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 5000 });
  } catch (e) {}

  // Wait for sidebar
  await page.waitForSelector('.sidebar');

  // Click "Top Books"
  console.log("Current URL:", page.url());
  const topBooks = page.locator('button.nav-item:has-text("Top Books")');
  await topBooks.click();
  
  await page.waitForTimeout(500);
  console.log("URL after clicking Top Books:", page.url());
  
  // Try to submit a search form
  const searchInput = page.locator('.search-field input').first();
  await searchInput.fill("Test");
  await searchInput.press('Enter');
  await page.waitForTimeout(500);
  console.log("URL after submitting search form:", page.url());

  await browser.close();
})();
