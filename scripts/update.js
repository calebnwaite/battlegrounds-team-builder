import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {REMOVED_BY_ID} from '../public/removals.js';
import {parseArgs, USAGE} from './lib/args.js';
import {runUpdate} from './lib/update.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}
try {
  await runUpdate({root, check: options.check, removedIds: REMOVED_BY_ID.keys(), summaryPath: path.resolve(options.summary ?? path.join(root, 'update-summary.md'))});
} catch (error) {
  console.error(`Update failed: ${error.message}`);
  process.exitCode = 1;
}
