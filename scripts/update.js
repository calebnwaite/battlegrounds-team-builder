import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {REMOVED_BY_ID} from '../public/removals.js';
import {runUpdate} from './lib/update.js';

const args = process.argv.slice(2);
const summaryFlag = args.indexOf('--summary');
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
try {
  await runUpdate({
    root, check: args.includes('--check'), removedIds: REMOVED_BY_ID.keys(),
    summaryPath: path.resolve(summaryFlag >= 0 && args[summaryFlag + 1] ? args[summaryFlag + 1] : path.join(root, 'update-summary.md')),
  });
} catch (error) {
  console.error(`Update failed: ${error.message}`);
  process.exitCode = 1;
}
