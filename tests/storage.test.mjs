import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, rmdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyWallet } from '../dist/session.js';
import { readWallet, writeWallet } from '../desktop/storage.mjs';

function testDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), 'castor-wallet-storage-test-'));
  t.after(() => {
    rmSync(join(directory, 'carteira.json'), { force: true });
    rmSync(join(directory, 'carteira.json.tmp'), { force: true });
    rmdirSync(directory);
  });
  return directory;
}

test('carteira local persiste entre leituras e substitui a versão anterior', t => {
  const directory = testDirectory(t);
  assert.equal(readWallet(directory), null);
  const wallet = { ...emptyWallet(), opening: 12000 };
  writeWallet(directory, wallet);
  assert.deepEqual(readWallet(directory), wallet);
  writeWallet(directory, emptyWallet());
  assert.deepEqual(readWallet(directory), emptyWallet());
});

test('gravação inválida preserva a carteira e leitura corrompida não vira carteira vazia', t => {
  const directory = testDirectory(t);
  const wallet = { ...emptyWallet(), opening: 12000 };
  writeWallet(directory, wallet);
  assert.throws(() => writeWallet(directory, { ...wallet, opening: 'inválido' }));
  assert.deepEqual(readWallet(directory), wallet);
  const path = join(directory, 'carteira.json');
  writeFileSync(path, 'json incompleto');
  assert.throws(() => readWallet(directory), SyntaxError);
  assert.equal(readFileSync(path, 'utf8'), 'json incompleto');
});
