import test from 'node:test';
import assert from 'node:assert/strict';
import {demo,metrics,balance,settleInvoice,saveTransaction,removeTransaction,validateState} from '../dist/model.js';
import {saveInstallmentPurchase} from '../dist/installments.js';
import {monthlyCashflow} from '../dist/cashflow.js';
const fresh=()=>({...demo('2026-11'),opening:100000,transactions:[]});
const purchase=()=>({id:'purchase',description:'Notebook',date:'2026-11-26',amount:10000,type:'expense',status:'pending',category:'cat7',method:'Cartão de crédito',card:'card1',invoice:'2026-12'});

test('parcelamento divide centavos sem perder valor e atravessa a virada de ano',()=>{
  const s=saveInstallmentPurchase(fresh(),purchase(),3);
  assert.deepEqual(s.transactions.map(t=>t.amount),[3334,3333,3333]);
  assert.deepEqual(s.transactions.map(t=>t.invoice),['2026-12','2027-01','2027-02']);
  assert.equal(s.transactions.reduce((sum,t)=>sum+t.amount,0),10000);
  assert.deepEqual(s.transactions.map(t=>t.installment.index),[1,2,3]);
  assert.equal(new Set(s.transactions.map(t=>t.id)).size,3);
  assert.equal(new Set(s.transactions.map(t=>t.installment.planId)).size,1);
  assert.equal(metrics(s,'2026-12').expenses,3334);
  assert.equal(metrics(s,'2027-01').expenses,3333);
});
test('primeira parcela paga não quita as próximas e pagamento de fatura não duplica a compra',()=>{
  let s=saveInstallmentPurchase(fresh(),{...purchase(),status:'paid',paidDate:'2027-01-05'},3);
  assert.deepEqual(s.transactions.map(t=>t.status),['paid','pending','pending']);
  assert.equal(s.transactions[1].paidDate,undefined);
  assert.equal(balance(s,'2027-01-05'),96666);
  s=settleInvoice(s,'card1','2027-01','2027-02-05');
  assert.equal(balance(s,'2027-02-05'),93333);
  assert.equal(s.transactions[2].status,'pending');
  assert.equal(monthlyCashflow(s,'2027-01').pendingExpenses,0);
});
test('editar e excluir uma parcela preserva as demais e os metadados no backup',()=>{
  let s=saveInstallmentPurchase(fresh(),purchase(),3);
  s=saveTransaction(s,{...s.transactions[1],amount:4000});
  assert.equal(s.transactions[0].amount,3334);
  assert.equal(s.transactions[1].installment.index,2);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
  s=removeTransaction(s,s.transactions[1].id);
  assert.equal(s.transactions.length,2);assert.equal(s.transactions[1].installment.index,3);
});
test('rejeita parcelas inválidas, parcelas zeradas e compras fora do crédito sem salvar parcialmente',()=>{
  const s=fresh();
  for(const count of [0,1.5,121,NaN])assert.throws(()=>saveInstallmentPurchase(s,purchase(),count));
  assert.throws(()=>saveInstallmentPurchase(s,{...purchase(),amount:2},3));
  assert.throws(()=>saveInstallmentPurchase(s,{...purchase(),method:'PIX'},3));
  assert.equal(s.transactions.length,0);
  assert.equal(saveInstallmentPurchase(s,purchase(),1).transactions.length,1);
});
test('regressão: reenviar compra existente não gera outro parcelamento',()=>{
  const s=saveInstallmentPurchase(fresh(),purchase(),3);
  assert.throws(()=>saveInstallmentPurchase(s,purchase(),3));
  assert.equal(s.transactions.length,3);
});
test('regressão: backup rejeita parcela inválida e mudança para débito',()=>{
  const s=saveInstallmentPurchase(fresh(),purchase(),3);
  assert.throws(()=>saveTransaction(s,{...s.transactions[0],method:'Débito'}));
  assert.throws(()=>validateState({...s,transactions:[{...s.transactions[0],installment:{planId:'plan',index:4,count:3}}]}));
});
