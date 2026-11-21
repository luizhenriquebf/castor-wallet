import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkForDesktopUpdates } from '../desktop/updates.mjs';

function mockUpdater() {
  const updater = new EventEmitter();
  const installs = [];
  const errors = [];
  updater.checkForUpdates = async () => {};
  updater.quitAndInstall = (...options) => installs.push(options);
  return { updater, installs, errors };
}

test('atualização baixada reinicia somente se o usuário confirmar', async () => {
  for (const accepted of [true, false]) {
    const { updater, installs, errors } = mockUpdater();
    checkForDesktopUpdates(updater, async version => {
      assert.equal(version, '1.3.0');
      return accepted;
    }, error => errors.push(error));
    assert.equal(updater.autoInstallOnAppQuit, false);
    updater.emit('update-downloaded', { version: '1.3.0' });
    await setImmediate();
    assert.deepEqual(errors, []);
    assert.deepEqual(installs, accepted ? [[true, true]] : []);
  }
});

test('erro na busca é tratado sem instalar nada', async () => {
  const { updater, installs, errors } = mockUpdater();
  const offline = Error('Offline');
  updater.checkForUpdates = async () => { throw offline; };
  checkForDesktopUpdates(updater, async () => assert.fail('Não há atualização'), error => errors.push(error));
  await setImmediate();
  assert.deepEqual(errors, [offline]);
  assert.deepEqual(installs, []);
});
