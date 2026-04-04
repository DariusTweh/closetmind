const { chromium } = require('playwright');
const path = require('path');

async function searchImageOnGoogle(imagePath) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://images.google.com');

  // Click the camera icon
  await page.getByRole('button', { name: 'Search by image' }).click();

  // Click "Upload a file" and wait for the file chooser to be triggered
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('text=Upload a file'),
  ]);

  await fileChooser.setFiles(imagePath);

  // Wait for search results to load (can refine this later)
  await page.waitForTimeout(5000);

  // Extract result titles (fallback to alt if no h3)
  const results = await page.$$eval('h3, img[alt]', nodes =>
    nodes
      .map(n => n.innerText || n.alt || '')
      .filter(Boolean)
      .slice(0, 3)
  );

  await browser.close();
  return results;
}

const imagePath = path.resolve(__dirname, 'flannel.png');

searchImageOnGoogle(imagePath)
  .then(results => {
    console.log('🔍 Top 3 Search Result Titles:');
    results.forEach((r, i) => console.log(`${i + 1}. ${r}`));
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
  });
