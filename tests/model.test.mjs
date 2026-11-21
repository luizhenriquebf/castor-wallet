import test from 'node:test';
import assert from 'node:assert/strict';
import {demo,validateState,saveTransaction,removeTransaction,settleInvoice,balance,metrics,invoiceMonth,dueDate,addCategory,addCard} from '../dist/model.js';
const fresh=()=>demo('2026-11');
const purchase=()=>({id:'test',date:'2026-11-26',description:'Compra teste',amount:101,category:'cat1',type:'expense',method:'Cartão de crédito',card:'card1',invoice:'2026-12',status:'pending'});
test('regressão: cartão com nome em branco é rejeitado',()=>{
  assert.throws(()=>addCard(fresh(),{name:'   ',closing:25,due:5}),/nome/i);
});
test('regressão: descrição de backup deve ser texto',()=>{
  const s=fresh();s.transactions[0].description=42;
  assert.throws(()=>validateState(s),/descrição/i);
});
test('regressão: categoria não aceita cor inválida',()=>{
  assert.throws(()=>addCategory(fresh(),'Educação','red;display:none'),/cor/i);
});
test('pagamento desconta uma única vez na data efetiva, preservando competência',()=>{
  let s={...fresh(),opening:10000,transactions:[]};s=saveTransaction(s,purchase());
  assert.equal(balance(s,'2026-12-31'),10000);
  assert.equal(metrics(s,'2026-12').expenses,101);
  s=settleInvoice(s,'card1','2026-12','2027-01-05');
  assert.equal(balance(s,'2026-12-31'),10000);
  assert.equal(balance(s,'2027-01-05'),9899);
  assert.deepEqual(settleInvoice(s,'card1','2026-12','2027-01-06'),s);
  assert.equal(metrics(s,'2026-12').expenses,101);
  assert.equal(metrics(s,'2026-12').pending,0);
});
test('fechamento inclusivo e virada de ano',()=>{
  assert.equal(invoiceMonth('2026-12-25',25),'2026-12');
  assert.equal(invoiceMonth('2026-12-26',25),'2027-01');
  assert.equal(dueDate('2026-12',{closing:25,due:5}),'2027-01-05');
});
test('CRUD recalcula valores em centavos sem duplicar lançamentos',()=>{
  let s={...fresh(),transactions:[]};let t={...purchase(),method:'PIX',status:'paid'};
  s=saveTransaction(s,t);assert.equal(metrics(s,'2026-11').cash,101);
  s=saveTransaction(s,{...t,amount:202});assert.equal(s.transactions.length,1);
  assert.equal(metrics(s,'2026-11').expenses,202);
  s=removeTransaction(s,t.id);assert.equal(metrics(s,'2026-11').expenses,0);
});
test('categoria criada entra automaticamente nos cálculos e rejeita duplicata',()=>{
  let s=addCategory({...fresh(),transactions:[]},'Educação','#568b78');
  s=saveTransaction(s,{...purchase(),category:s.categories.at(-1).id});
  assert.equal(metrics(s,'2026-12').expenses,101);
  assert.throws(()=>addCategory(s,' educação '),/existe/);
});
test('backup faz round trip e rejeita referências, datas e valores inválidos',()=>{
  const s=fresh();assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
  for(const change of [{date:'2026-02-30'},{amount:1.5},{category:'missing'},{method:'unknown'},{type:'income'}]){
    assert.throws(()=>saveTransaction(s,{...purchase(),...change}));
  }
});
test('pagamento não afeta outro cartão ou outra fatura',()=>{
  const s={...fresh(),transactions:[purchase(),{...purchase(),id:'other',invoice:'2027-01'}]};
  const paid=settleInvoice(s,'card1','2026-12','2027-01-05');
  assert.equal(paid.transactions[1].status,'pending');
});
