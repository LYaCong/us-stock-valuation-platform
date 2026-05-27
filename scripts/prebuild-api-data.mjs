import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const apiDataDir = path.join(projectRoot, 'api', '_data');

const cacheFiles = [
  'daily_quotes.json',
  'historical.json',
  'dcf_fundamentals.json',
  'dcf_assumptions.json',
];

await mkdir(apiDataDir, { recursive: true });

for (const fileName of cacheFiles) {
  const source = path.join(projectRoot, 'stock_cache', fileName);
  const destination = path.join(apiDataDir, fileName);
  await copyFile(source, destination);
}

console.log('Copied stock_cache to api/_data/');
