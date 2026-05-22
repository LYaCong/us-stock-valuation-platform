import { readdir, rmdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

try {
  const distStat = await stat(distDir);

  if (!distStat.isDirectory()) {
    console.log('dist exists but is not a directory. No cleanup performed.');
    process.exit(0);
  }

  const entries = await readdir(distDir);

  if (entries.length > 0) {
    console.log('dist is not empty. Project safety rules prohibit bulk directory deletion.');
    console.log('Delete files manually if you need a full clean.');
    process.exit(0);
  }

  await rmdir(distDir);
  console.log('Removed empty dist directory.');
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.log('dist directory does not exist. Nothing to clean.');
    process.exit(0);
  }

  throw error;
}
