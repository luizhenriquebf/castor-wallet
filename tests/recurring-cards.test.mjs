import test from 'node:test';
import assert from 'node:assert/strict';
import {demo,saveTransaction,removeTransaction,validateState,settleInvoice,invoiceMonth} from '../dist/model.js';
import {saveRecurringRule,generateRecurringMonth} from '../dist/recurring.js';
import {saveCard,invoiceDue,cardTextColor} from '../dist/cards.js';
import {monthlyCashflow} from '../dist/cashflow.js';
import {resetTransactions} from '../dist/reset.js';
const fresh=()=>({...demo('2026-11'),opening:0,transactions:[]});
const rule=(changes={})=>({id:'internet',description:'Internet',amount:11990,day:31,category:'cat0',method:'PIX',start:'2026-11',end:'',active:true,...changes});
const purchase=(changes={})=>({id:'purchase',date:'2026-11-15',description:'Compra',amount:10000,category:'cat7',type:'expense',status:'pending',method:'Cartão de crédito',card:'card1',invoice:'2026-11',...changes});

test('gera despesas mensais pendentes com data válida e respeita início e fim',()=>{
  let s=saveRecurringRule(fresh(),rule({end:'2027-02'}));
  assert.equal(generateRecurringMonth(s,'2026-10').created,0);
  s=generateRecurringMonth(s,'2026-11').state;
  assert.equal(s.transactions[0].date,'2026-11-30');assert.equal(s.transactions[0].status,'pending');
  s=generateRecurringMonth(s,'2027-02').state;
  assert.equal(s.transactions[1].date,'2027-02-28');assert.equal(s.transactions[1].amount,11990);
  assert.equal(generateRecurringMonth(s,'2027-03').created,0);
});
test('regressão: gerar o mesmo mês novamente não duplica nem recria lançamento excluído',()=>{
  let s=generateRecurringMonth(saveRecurringRule(fresh(),rule()),'2026-11').state;
  assert.equal(generateRecurringMonth(s,'2026-11').created,0);
  s=removeTransaction(s,s.transactions[0].id);
  assert.equal(generateRecurringMonth(s,'2026-11').created,0);
  assert.equal(s.transactions.length,0);
});
test('editar e pausar recorrência preserva lançamentos e afeta apenas próximas gerações',()=>{
  let s=generateRecurringMonth(saveRecurringRule(fresh(),rule()),'2026-11').state;
  s=saveRecurringRule(s,rule({amount:15000,description:'Novo plano'}));
  assert.equal(s.transactions[0].amount,11990);
  s=generateRecurringMonth(s,'2026-12').state;assert.equal(s.transactions[1].amount,15000);
  s=saveRecurringRule(s,rule({active:false}));assert.equal(generateRecurringMonth(s,'2027-01').created,0);
  assert.equal(s.transactions.length,2);
});
test('recorrência no cartão usa fechamento e vencimento e é quitada pela fatura',()=>{
  let s=saveRecurringRule(fresh(),rule({method:'Cartão de crédito',card:'card1',day:26}));
  s=generateRecurringMonth(s,'2026-11').state;
  assert.equal(s.transactions[0].invoice,'2026-12');
  assert.equal(s.transactions[0].invoiceDueDate,'2027-01-05');
  assert.equal(monthlyCashflow(s,'2026-12').pendingExpenses,0);
  s=settleInvoice(s,'card1','2026-12','2027-01-05');
  assert.equal(monthlyCashflow(s,'2027-01').paid,11990);
});
test('backup inclui recorrências e seu histórico, mantendo compatibilidade antiga',()=>{
  const s=generateRecurringMonth(saveRecurringRule(fresh(),rule()),'2026-11').state;
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
  assert.deepEqual(validateState(fresh()),fresh());
  assert.throws(()=>validateState({...s,recurringRules:[rule({category:'ausente'})]}));
  assert.throws(()=>validateState({...s,recurringLedger:[{ruleId:'ausente',month:'2026-11'}]}));
});
test('recorrências rejeitam valor, dia, período e cartão inválidos',()=>{
  for(const change of [{amount:0},{amount:1.5},{day:32},{day:0},{start:'2026-13'},{end:'2026-10'},{method:'Cartão de crédito',card:'missing'}])assert.throws(()=>saveRecurringRule(fresh(),rule(change)));
});
test('limpeza das transações mantém regras sem recriar cobranças apagadas',()=>{
  const s=generateRecurringMonth(saveRecurringRule(fresh(),rule()),'2026-11').state;
  const reset=resetTransactions(s,'APAGAR','2026-11');
  assert.equal(reset.transactions.length,0);assert.equal(reset.recurringRules.length,1);
  assert.equal(generateRecurringMonth(reset,'2026-11').created,0);assert.equal(generateRecurringMonth(reset,'2026-12').created,1);
});
test('cartão pode ser editado sem mudar seu id ou duplicar cadastros',()=>{
  const s=saveCard(fresh(),{id:'card1',name:'  Cartão pessoal ',closing:10,due:20,color:'#e7ae61'});
  assert.equal(s.cards.length,1);assert.equal(s.cards[0].name,'Cartão pessoal');assert.equal(s.cards[0].id,'card1');
  assert.equal(s.cards[0].color,'#e7ae61');assert.equal(invoiceMonth('2026-11-15',s.cards[0].closing),'2026-12');
  assert.equal(cardTextColor('#ffffff'),'#18372c');assert.equal(cardTextColor('#000000'),'#ffffff');
});
test('regressão: editar fechamento e vencimento não muda faturas e previsão já cadastradas',()=>{
  let s=saveTransaction(fresh(),purchase());
  s=saveCard(s,{id:'card1',name:'Novo nome',closing:10,due:20,color:'#553366'});
  assert.equal(s.transactions[0].invoice,'2026-11');assert.equal(s.transactions[0].invoiceDueDate,'2026-12-05');
  assert.equal(monthlyCashflow(s,'2026-11').pendingExpenses,0);
  assert.equal(monthlyCashflow(s,'2026-12').pendingExpenses,10000);
  assert.equal(invoiceDue(s,'card1','2026-11'),'2026-12-05');
  assert.equal(invoiceDue(s,'card1','2027-01'),'2027-01-20');
  s=saveTransaction(s,purchase({id:'second'}));assert.equal(s.transactions[1].invoiceDueDate,'2026-12-05');assert.equal(s.transactions[1].invoiceClosingDay,25);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
});
test('edição de cartão antigo captura vencimento antes da mudança e valida cor/dias/nome',()=>{
  const old={...fresh(),transactions:[purchase()]};
  const s=saveCard(old,{id:'card1',name:'Novo',closing:10,due:20,color:'#204f40'});
  assert.equal(s.transactions[0].invoiceDueDate,'2026-12-05');
  assert.equal(old.transactions[0].invoiceDueDate,undefined);
  for(const change of [{color:'red'},{closing:0},{due:29},{name:' '}])assert.throws(()=>saveCard(s,{...s.cards[0],...change}));
});
test('mover compra para outra fatura usa o vencimento da nova fatura',()=>{
  let s=saveTransaction(fresh(),purchase());
  s=saveCard(s,{id:'card1',name:'Novo',closing:10,due:20,color:'#204f40'});
  s=saveTransaction(s,{...s.transactions[0],invoice:'2027-01'});
  assert.equal(s.transactions[0].invoiceDueDate,'2027-01-20');
  assert.equal(s.transactions[0].invoiceClosingDay,10);
});
