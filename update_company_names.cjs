const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, 'distinct_companies.json');
const dividendsPath = path.join(__dirname, 'sahamidx_dividends.json');

try {
  // Read and parse files
  console.log('Reading distinct_companies.json...');
  const companiesData = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));

  console.log('Reading sahamidx_dividends.json...');
  const dividendsData = JSON.parse(fs.readFileSync(dividendsPath, 'utf8'));

  let updatedCount = 0;
  let skippedCount = 0;
  const missingTickers = new Set();

  console.log('Mapping company names...');
  const updatedDividends = dividendsData.map(item => {
    const ticker = item.ticker;
    if (companiesData[ticker]) {
      const originalName = item.company_name;
      const newName = companiesData[ticker];
      
      if (originalName !== newName) {
        item.company_name = newName;
        updatedCount++;
      } else {
        skippedCount++;
      }
    } else {
      missingTickers.add(ticker);
    }
    return item;
  });

  // Write updated data back to sahamidx_dividends.json
  console.log('Writing updated data back to sahamidx_dividends.json...');
  fs.writeFileSync(dividendsPath, JSON.stringify(updatedDividends, null, 2), 'utf8');

  console.log('\n--- Summary of Changes ---');
  console.log(`Total dividend records: ${dividendsData.length}`);
  console.log(`Successfully updated names: ${updatedCount}`);
  console.log(`Already up-to-date: ${skippedCount}`);
  
  if (missingTickers.size > 0) {
    console.warn(`\n[WARNING] The following ${missingTickers.size} tickers were not found in distinct_companies.json:`);
    console.warn(Array.from(missingTickers).join(', '));
  } else {
    console.log('\nAll tickers were successfully mapped!');
  }
  
} catch (error) {
  console.error('An error occurred:', error.message);
  process.exit(1);
}
