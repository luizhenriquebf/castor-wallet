import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyWallet} from '../dist/session.js';
import {validateState,balance,metrics,demo} from '../dist/model.js';
import {ensureRecurringThroughMonth} from '../dist/recurring.js';

test('cada inicialização começa válida e zerada, sem exemplos ou cobranças automáticas',()=>{
  const state=validateState(emptyWallet());
  assert.equal(balance(state,'2026-11-30'),0);
  assert.equal(metrics(state,'2026-11').expenses,0);
  for(const key of ['transactions','cards','recurringRules','recurringLedger'])assert.deepEqual(state[key],[]);
  assert.equal(state.employment,undefined);
  assert.deepEqual(ensureRecurringThroughMonth(state,'2026-11').state,state);
});

test('alterar ou importar em uma sessão não contamina a próxima inicialização',()=>{
  const first=emptyWallet();first.opening=12000;first.categories[0].name='Alterada';first.transactions.push({id:'anterior'});
  const imported=validateState(JSON.parse(JSON.stringify(demo('2026-11'))));
  assert.ok(imported.transactions.length>0);
  const next=emptyWallet();assert.equal(next.opening,0);assert.deepEqual(next.transactions,[]);assert.equal(next.categories[0].name,'Moradia');
});
