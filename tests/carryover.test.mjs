import test from 'node:test';
import assert from 'node:assert/strict';
import {demo,saveTransaction,removeTransaction,settleInvoice,balance} from '../dist/model.js';
import {monthlyCashflow} from '../dist/cashflow.js';
const fresh=()=>({...demo('2026-11'),opening:0,transactions:[]});
const tx=(id,date,amount,type='expense',status='paid',extra={})=>({id,date,description:id,amount,type,status,category:'cat7',method:'PIX',...extra});

test('regressão: sobra de outubro soma às receitas de novembro',()=>{
  const s={...fresh(),transactions:[tx('salario','2026-10-05',500000,'income'),tx('gastos','2026-10-15',450000),tx('novo','2026-11-05',500000,'income')]};
  const c=monthlyCashflow(s,'2026-11');
  assert.equal(c.carried,50000);assert.equal(c.received,500000);assert.equal(c.closing,550000);
  assert.equal(c.projected,550000);assert.equal(c.result,500000);
});
test('regressão: déficit de outubro reduz o saldo de novembro e persiste em meses vazios',()=>{
  const s={...fresh(),transactions:[tx('salario','2026-10-05',500000,'income'),tx('gastos','2026-10-15',570000),tx('novo','2026-11-05',500000,'income')]};
  assert.equal(monthlyCashflow(s,'2026-11').carried,-70000);
  assert.equal(monthlyCashflow(s,'2026-11').closing,430000);
  assert.equal(monthlyCashflow(s,'2026-12').carried,430000);
  assert.equal(monthlyCashflow(s,'2026-12').result,0);
  assert.equal(monthlyCashflow(s,'2027-01').closing,430000);
});
test('regressão: despesas pendentes do mês anterior comprometem a previsão e não o saldo realizado',()=>{
  const s={...fresh(),opening:100000,transactions:[tx('atrasada','2026-10-15',25000,'expense','pending'),tx('futura','2026-12-05',90000,'expense','pending'),tx('prevista','2026-11-05',50000,'income','pending')]};
  const c=monthlyCashflow(s,'2026-11');
  assert.equal(c.closing,100000);assert.equal(c.overdueExpenses,25000);
  assert.equal(c.pendingExpenses,25000);assert.equal(c.pendingIncome,50000);
  assert.equal(c.projected,125000);
});
test('regressão: cartão usa vencimento na previsão e não duplica despesa ao pagar',()=>{
  let s={...fresh(),opening:100000,transactions:[tx('compra','2026-10-15',30000,'expense','pending',{method:'Cartão de crédito',card:'card1',invoice:'2026-10'})]};
  assert.equal(monthlyCashflow(s,'2026-10').pendingExpenses,0);
  assert.equal(monthlyCashflow(s,'2026-11').pendingExpenses,30000);
  assert.equal(monthlyCashflow(s,'2026-12').overdueExpenses,30000);
  assert.equal(monthlyCashflow(s,'2026-11').projected,70000);
  s=settleInvoice(s,'card1','2026-10','2026-11-05');
  const c=monthlyCashflow(s,'2026-11');
  assert.equal(c.paid,30000);assert.equal(c.pendingExpenses,0);
  assert.equal(c.closing,70000);assert.equal(c.projected,70000);
  assert.equal(monthlyCashflow(s,'2026-12').carried,70000);
});
test('regressão: editar e excluir lançamento antigo recalcula os meses seguintes',()=>{
  let s={...fresh(),opening:100000,transactions:[tx('gasto','2026-10-15',30000)]};
  assert.equal(monthlyCashflow(s,'2026-11').carried,70000);
  s=saveTransaction(s,{...s.transactions[0],amount:120000});
  assert.equal(monthlyCashflow(s,'2026-11').carried,-20000);
  s=removeTransaction(s,'gasto');
  assert.equal(monthlyCashflow(s,'2026-11').carried,100000);
});
test('fluxo mensal concilia com saldo acumulado e respeita virada de ano e fevereiro',()=>{
  const s={...fresh(),opening:15000,transactions:[tx('dec','2026-12-31',10000),tx('jan','2027-01-01',50000,'income'),tx('fev','2027-02-28',12345),tx('mar','2027-03-01',1000)]};
  for(const month of ['2026-12','2027-01','2027-02','2027-03']){
    const c=monthlyCashflow(s,month);
    assert.equal(c.closing,c.carried+c.received-c.paid);
    assert.equal(c.closing,balance(s,month+'-31'));
  }
  assert.equal(monthlyCashflow(s,'2027-02').paid,12345);
});
