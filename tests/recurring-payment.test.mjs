import test from 'node:test';
import assert from 'node:assert/strict';
import {demo,metrics,balance,removeTransaction,validateState,settleInvoice} from '../dist/model.js';
import {saveRecurringRule,ensureRecurringThroughMonth,recurringChargesForMonth,setRecurringPayment,settleRecurringMonth} from '../dist/recurring.js';
import {monthlyCashflow} from '../dist/cashflow.js';
import {resetTransactions} from '../dist/reset.js';
const fresh=()=>({...demo('2026-11'),opening:100000,transactions:[]});
const rule=(changes={})=>({id:'health',description:'Plano de saúde',amount:30000,day:10,category:'cat5',method:'PIX',start:'2026-11',end:'',active:true,...changes});
const configured=()=>saveRecurringRule(fresh(),rule());

test('regressão: recorrência cadastrada entra nas despesas sem geração manual',()=>{
  const s=ensureRecurringThroughMonth(configured(),'2026-11').state;
  assert.equal(metrics(s,'2026-11').expenses,30000);assert.equal(metrics(s,'2026-11').pending,30000);
  assert.equal(recurringChargesForMonth(s,'2026-11').length,1);
  assert.equal(ensureRecurringThroughMonth(s,'2026-11').created,0);
});
test('regressão: marcar paga reduz pendências e saldo sem duplicar as despesas',()=>{
  let s=ensureRecurringThroughMonth(configured(),'2026-11').state;
  const id=s.transactions[0].id;s=setRecurringPayment(s,id,true,'2026-11-20');
  assert.equal(metrics(s,'2026-11').expenses,30000);assert.equal(metrics(s,'2026-11').pending,0);
  assert.equal(balance(s,'2026-11-19'),100000);assert.equal(balance(s,'2026-11-20'),70000);
  assert.equal(setRecurringPayment(s,id,true,'2026-11-21'),s);
  assert.equal(s.transactions.length,1);
  s=setRecurringPayment(s,id,false);assert.equal(metrics(s,'2026-11').pending,30000);assert.equal(balance(s,'2026-11-30'),100000);
});
test('regressão: pagamento em outro mês usa data efetiva e mantém competência original',()=>{
  let s=ensureRecurringThroughMonth(configured(),'2026-12').state;
  const nov=recurringChargesForMonth(s,'2026-11')[0];s=setRecurringPayment(s,nov.id,true,'2026-12-05');
  assert.equal(monthlyCashflow(s,'2026-11').paid,0);assert.equal(monthlyCashflow(s,'2026-12').paid,30000);
  assert.equal(metrics(s,'2026-11').expenses,30000);assert.equal(metrics(s,'2026-12').pending,30000);
});
test('regressão: virada de ano inclui meses não visitados sem duplicar',()=>{
  let s=ensureRecurringThroughMonth(configured(),'2027-01').state;
  assert.deepEqual(s.transactions.map(t=>t.recurringMonth),['2026-11','2026-12','2027-01']);
  assert.equal(monthlyCashflow(s,'2027-01').pendingExpenses,90000);
  assert.equal(ensureRecurringThroughMonth(s,'2026-12').created,0);
  const removed=s.transactions[0].id;s=removeTransaction(s,removed);
  assert.equal(ensureRecurringThroughMonth(s,'2027-01').created,0);
});
test('recorrência do cartão é contabilizada pela fatura e pode ser paga sem duplicar fatura',()=>{
  let s=saveRecurringRule(fresh(),rule({method:'Cartão de crédito',card:'card1',day:26,start:'2026-10'}));
  s=ensureRecurringThroughMonth(s,'2026-11').state;
  const rows=recurringChargesForMonth(s,'2026-11');assert.equal(rows.length,1);assert.equal(rows[0].recurringMonth,'2026-10');
  assert.equal(metrics(s,'2026-11').credit,30000);
  s=setRecurringPayment(s,rows[0].id,true,'2026-12-05');
  const settled=settleInvoice(s,'card1','2026-11','2026-12-05');
  assert.equal(balance(settled,'2026-12-05'),70000);assert.equal(metrics(settled,'2026-12').pending,30000);
});
test('pagamento em lote afeta somente cobranças pendentes da competência selecionada',()=>{
  const s=ensureRecurringThroughMonth(saveRecurringRule(configured(),rule({id:'phone',description:'Telefone',amount:5000})),'2026-12').state;
  const paid=settleRecurringMonth(s,'2026-11','2026-11-25');
  assert.equal(recurringChargesForMonth(paid,'2026-11').every(t=>t.status==='paid'),true);
  assert.equal(recurringChargesForMonth(paid,'2026-12').every(t=>t.status==='pending'),true);
  assert.equal(monthlyCashflow(paid,'2026-11').paid,35000);
  assert.deepEqual(settleRecurringMonth(paid,'2026-11','2026-11-26'),paid);
});
test('regressão: limpeza não recria automaticamente cobranças apagadas',()=>{
  let s=ensureRecurringThroughMonth(configured(),'2026-12').state;
  s=resetTransactions(s,'APAGAR','2026-11');
  assert.equal(ensureRecurringThroughMonth(s,'2026-12').created,0);assert.equal(s.transactions.length,0);
  const next=ensureRecurringThroughMonth(s,'2027-01');assert.equal(next.created,1);
  assert.equal(next.state.transactions[0].recurringMonth,'2027-01');
  const edited=saveRecurringRule(s,rule({amount:40000}));assert.equal(ensureRecurringThroughMonth(edited,'2026-12').created,0);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(next.state))),next.state);
});
test('pagamento rejeita data inválida ou transação fora de recorrências',()=>{
  const s=ensureRecurringThroughMonth(configured(),'2026-11').state;
  assert.throws(()=>setRecurringPayment(s,s.transactions[0].id,true,'2026-02-30'));
  assert.throws(()=>setRecurringPayment(s,'missing',true,'2026-11-20'));
  assert.throws(()=>settleRecurringMonth(s,'2026-11',''));
});
test('regressão: retomar recorrência não cria cobranças dos meses em que ficou pausada',()=>{
  let s=ensureRecurringThroughMonth(configured(),'2026-11').state;
  s=saveRecurringRule(s,rule({active:false}),'2026-12');
  assert.equal(ensureRecurringThroughMonth(s,'2027-01').created,0);
  s=saveRecurringRule(s,rule({active:true}),'2027-02');
  s=ensureRecurringThroughMonth(s,'2027-02').state;
  assert.deepEqual(s.transactions.map(t=>t.recurringMonth),['2026-11','2027-02']);
});
