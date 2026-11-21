import test from 'node:test';
import assert from 'node:assert/strict';
import {demo,metrics,balance,validateState} from '../dist/model.js';
import {saveEmployment} from '../dist/employment.js';
import {saveInstallmentPurchase} from '../dist/installments.js';
import {canResetTransactions,resetTransactions} from '../dist/reset.js';

test('regressão: limpeza exige palavra exata e falhas preservam a carteira',()=>{
  const state=demo('2026-11'),before=JSON.stringify(state);
  for(const value of ['',undefined,null,'apagar','APAGA',' APAGAR','APAGAR ','CONFIRMAR']){
    assert.equal(canResetTransactions(value),false);
    assert.throws(()=>resetTransactions(state,value),/Digite APAGAR/);
    assert.equal(JSON.stringify(state),before);
  }
  assert.equal(canResetTransactions('APAGAR'),true);
});
test('limpeza remove todos os meses e parcelas, zera saldo e preserva cadastros',()=>{
  let state=saveEmployment(demo('2026-11'),{employer:'Empresa',amount:500000,payday:5,category:'cat6',method:'PIX'});
  state=saveInstallmentPurchase(state,{id:'test',date:'2026-11-15',description:'Compra',amount:30000,type:'expense',status:'pending',method:'Cartão de crédito',category:'cat7',card:'card1',invoice:'2026-11'},3);
  const count=state.transactions.length;
  const result=resetTransactions(state,'APAGAR');
  assert.equal(result.transactions.length,0);assert.equal(result.opening,0);
  for(const month of ['2026-06','2026-11','2027-01']){
    assert.equal(metrics(result,month).expenses,0);assert.equal(balance(result,month+'-31'),0);
  }
  assert.deepEqual(result.categories,state.categories);
  assert.deepEqual(result.cards,state.cards);assert.deepEqual(result.employment,state.employment);
  assert.equal(state.transactions.length,count);assert.notEqual(state.opening,0);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(result))),result);
});
