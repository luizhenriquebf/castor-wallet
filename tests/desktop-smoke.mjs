import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { emptyWallet } from '../dist/session.js';
import '../desktop/main.mjs';

const testPrefix = join(tmpdir(), 'castor-wallet-test-');
const temporary = mkdtempSync(testPrefix);
app.setPath('userData', temporary);
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', event => {
    if (event.level === 'error') console.error(event.message);
  });
});

async function verifyDesktop() {
  const backup = join(temporary, 'backup.json');
  const originalSaveDialog = dialog.showSaveDialog;
  let stage = 'abrir a janela';
  const watchdog = setTimeout(() => {
    console.error('Tempo limite ao ' + stage);
    app.exit(1);
  }, 30000);
  let exitCode = 0;

  try {
    const [window] = BrowserWindow.getAllWindows();
    const contents = window.webContents;
    if (contents.isLoading()) await new Promise(resolve => contents.once('did-finish-load', resolve));

    const renderer = script => contents.executeJavaScript(script);
    const assertEmpty = async () => {
      const amounts = await renderer(
        "Array.from(document.querySelectorAll('.stats .amount'), element => element.textContent)"
      );
      assert.deepEqual(amounts.map(value => value.replace(/\s/g, ' ')), Array(4).fill('R$ 0,00'));
    };
    stage = 'verificar o painel inicial';
    await assertEmpty();
    assert.equal(await renderer('typeof require'), 'undefined');
    assert.equal(await renderer("document.querySelector('.logo img').naturalWidth > 0"), true);
    const help = await renderer(`Array.from(document.querySelectorAll('.stats .stat'), card => {
      const icon = card.querySelector('.stat-help-icon');
      if (!icon) return null;
      const tooltip = document.getElementById(icon.getAttribute('aria-describedby'));
      return [icon.tagName, tooltip.role, getComputedStyle(tooltip).visibility, tooltip.textContent];
    })`);
    assert.deepEqual(help.slice(0, 2), [null, null]);
    assert.deepEqual(help[2].slice(0, 3), ['SPAN', 'tooltip', 'hidden']);
    assert.match(help[2][3], /pagas e pendentes/);
    assert.match(help[3][3], /apenas as despesas ainda pendentes/);

    stage = 'importar o backup';
    const invoice = (id, month, amount, due) => ({
      id, description: id, date: month + '-03', invoice: month, amount,
      card: 'card1', method: 'Cartão de crédito', category: 'cat0',
      type: 'expense', status: 'pending', invoiceDueDate: due,
    });
    const fixture = {
      ...emptyWallet(), opening: 12550,
      cards: [{ id: 'card1', name: 'Cartão de teste', closing: 10, due: 20 }],
      transactions: [
        invoice('Fatura anterior', '2026-10', 5000, '2026-10-20'),
        invoice('Fatura do mês', '2026-11', 30000, '2026-12-05'),
        invoice('Fatura futura', '2026-12', 90000, '2026-12-20'),
      ],
    };
    await renderer(`(async () => {
      const input = document.querySelector('#import-file');
      const transfer = new DataTransfer();
      transfer.items.add(new File([${JSON.stringify(JSON.stringify(fixture))}], 'fixture.json'));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const confirmation = document.querySelector('#confirm-dialog');
      for (let i = 0; i < 100 && !confirmation.open; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      if (!confirmation.open) throw Error('A confirmação de importação não abriu');
      document.querySelector('#confirm-form').requestSubmit();
    })()`);
    assert.match(await renderer("document.querySelector('.stats .amount').textContent"), /125,50/);

    stage = 'exportar o backup';
    let saveDialogOptions;
    dialog.showSaveDialog = async (_window, options) => {
      saveDialogOptions = options;
      return { canceled: false, filePath: backup };
    };
    await renderer("document.querySelector('#backup').click()");
    await renderer(`(async () => {
      for (let i = 0; i < 100; i++) {
        if (document.querySelector('#toast').textContent === 'Backup exportado.') return;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw Error('A exportação não foi concluída: ' + document.querySelector('#toast').textContent);
    })()`);
    assert.equal(saveDialogOptions.filters[0].extensions[0], 'json');
    assert.deepEqual(JSON.parse(await readFile(backup, 'utf8')), fixture);

    stage = 'recarregar a carteira';
    const reloaded = new Promise(resolve => contents.once('did-finish-load', resolve));
    contents.reload();
    await reloaded;
    assert.match(await renderer("document.querySelector('.stats .amount').textContent"), /125,50/);
    assert.deepEqual(JSON.parse(await readFile(join(temporary, 'carteira.json'), 'utf8')), fixture);
    stage = 'verificar a fatura no painel e pagar pelo cartão';
    const selectNovember = `
      const picker = document.querySelector('#month');
      picker.value = '2026-11';
      picker.dispatchEvent(new Event('change'));
    `;
    const readTotals = () => renderer(
      "Array.from(document.querySelectorAll('.stats .amount'), element => element.textContent.replace(/\\s/g, ' ')).slice(2)"
    );
    await renderer(selectNovember);
    assert.deepEqual(await readTotals(), ['R$ 300,00', 'R$ 350,00']);
    await renderer(`(() => {
      document.querySelector('nav [data-page="cards"]').click();
      document.querySelector('[data-settle="card1"]').click();
      document.querySelector('#confirm-date').value = '2026-11-20';
      document.querySelector('#confirm-form').requestSubmit();
      document.querySelector('nav [data-page="overview"]').click();
    })()`);
    assert.deepEqual(await readTotals(), ['R$ 300,00', 'R$ 50,00']);
    stage = 'lançar receita e pagar recorrência pelo menu';
    const paidIncome = await renderer(`(() => {
      document.querySelector('#new-transaction').click();
      const form = document.querySelector('#transaction-form');
      form.elements.type.value = 'income';
      form.querySelector('[name=type]:checked').dispatchEvent(new Event('change', { bubbles: true }));
      const statusHidden = document.querySelector('#transaction-status-field').hidden;
      form.elements.description.value = 'Receita de teste';
      form.elements.amount.value = '70.00';
      form.elements.date.value = '2026-11-05';
      form.requestSubmit();
      return statusHidden && !document.querySelector('#transaction-dialog').open;
    })()`);
    assert.equal(paidIncome, true);
    let savedWallet = JSON.parse(await readFile(join(temporary, 'carteira.json'), 'utf8'));
    assert.equal(savedWallet.transactions.find(tx => tx.description === 'Receita de teste').status, 'paid');
    const paidRecurring = await renderer(`(() => {
      const tab = document.querySelector('nav [data-page="recurring"]');
      tab.click();
      document.querySelector('[data-new-rule="health"]').click();
      const form = document.querySelector('#recurring-form');
      form.elements.amount.value = '90.00';
      form.elements.start.value = '2026-11';
      form.requestSubmit();
      document.querySelector('[data-recurring-paid]').click();
      document.querySelector('#confirm-date').value = '2026-11-15';
      document.querySelector('#confirm-form').requestSubmit();
      return tab.classList.contains('active') &&
        document.querySelector('[data-recurring-paid]').textContent === 'Desfazer pagamento';
    })()`);
    assert.equal(paidRecurring, true);
    savedWallet = JSON.parse(await readFile(join(temporary, 'carteira.json'), 'utf8'));
    assert.equal(savedWallet.transactions.find(tx => tx.recurringId).paidDate, '2026-11-15');
    console.log('Fatura do mês: R$ 300,00. A pagar: de R$ 350,00 para R$ 50,00 após pagar a fatura.');
    console.log('Electron: dicas, importação, exportação e restauração automática verificadas.');
  } catch (error) {
    exitCode = 1;
    console.error(error);
  } finally {
    clearTimeout(watchdog);
    dialog.showSaveDialog = originalSaveDialog;
    app.releaseSingleInstanceLock();
    await rm(backup, { force: true });
    await rm(join(temporary, 'carteira.json'), { force: true });
    app.exit(exitCode);
  }
}

app.whenReady().then(verifyDesktop).catch(error => {
  console.error(error);
  app.exit(1);
});
