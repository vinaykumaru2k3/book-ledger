const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Navigate to dev server
  await page.goto('http://localhost:5173/');

  // Wait for the app to load
  await page.waitForSelector('.nav-item');

  // Let's click "Top Books"
  const buttons = await page.$$('.nav-item');
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text.includes("Top Books")) {
      await button.click();
      break;
    }
  }

  // Wait a bit
  await new Promise(r => setTimeout(r, 1000));

  console.log("URL after clicking Top Books:", page.url());
  
  await browser.close();
})();
