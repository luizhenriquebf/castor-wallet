import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateState } from '../dist/model.js';

export function readWallet(directory) {
  try {
    return validateState(JSON.parse(readFileSync(join(directory, 'carteira.json'), 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function writeWallet(directory, wallet) {
  const content = JSON.stringify(validateState(wallet), null, 2);
  mkdirSync(directory, { recursive: true });
  const temporary = join(directory, 'carteira.json.tmp');
  try {
    writeFileSync(temporary, content, { encoding: 'utf8', flush: true });
    renameSync(temporary, join(directory, 'carteira.json'));
  } finally {
    rmSync(temporary, { force: true });
  }
}
