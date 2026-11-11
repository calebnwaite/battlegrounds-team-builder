export const USAGE = 'Usage: node scripts/update.js [--check] [--summary <file>]\n  --check          dry run: report only, never write\n  --summary <file> where to write the markdown summary (default update-summary.md)';

/** Strict parser: any unknown or malformed argument is an error, so a dry run can never turn into a write.
 * @param {string[]} args @returns {{check: boolean, summary: string | null}} */
export function parseArgs(args) {
  let check = false;
  /** @type {string | null} */
  let summary = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') check = true;
    else if (arg === '--summary') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('--summary needs a file path');
      summary = value;
    } else throw new Error(`Unknown argument: ${JSON.stringify(arg)}`);
  }
  return {check, summary};
}
