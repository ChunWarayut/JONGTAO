import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Need to login first or we just intercept client?
  // User is presumably logged in. Let's just set localStorage token
  await page.goto('http://localhost:5173/admin.html');
  // Login as admin
  await page.type('input[name="username"]', 'admin');
  await page.type('input[name="password"]', 'password');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]')
  ]).catch(e => console.log('Login nav error:', e.message));

  // Wait for sidebar
  await page.waitForSelector('.nav-item[data-view="map"]');
  await page.click('.nav-item[data-view="map"]');
  
  await page.waitForSelector('#btn-add-table');
  
  // Set Zone A
  await page.select('#designer-zone-select', '1');
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('dialog', async dialog => {
    console.log('DIALOG:', dialog.message());
    await dialog.accept('A1');
  });

  console.log('Clicking Add table');
  await page.click('#btn-add-table');
  
  await new Promise(r => setTimeout(r, 1000));
  
  const tables = await page.evaluate(() => {
    return document.querySelector('#tables-container').innerHTML;
  });
  console.log('Tables HTML:', tables);
  
  await browser.close();
})();
