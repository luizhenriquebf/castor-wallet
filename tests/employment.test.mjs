import test from 'node:test';
import assert from 'node:assert/strict';
import {demo,validateState,saveTransaction,metrics,balance} from '../dist/model.js';
import {saveEmployment,salaryDraft} from '../dist/employment.js';
const job={employer:'Empresa exemplo',amount:543210,payday:31,category:'cat6',method:'PIX'};
const fresh=()=>({...demo('2026-11'),opening:0,transactions:[]});

test('cadastrar e editar salário preserva o histórico de receitas',()=>{
  let state=saveEmployment(fresh(),job);
  const draft=salaryDraft(state,'2026-11');
  assert.equal(draft.type,'income');assert.equal(draft.amount,543210);
  assert.equal(draft.description,'Salário · Empresa exemplo');
  assert.equal(draft.category,'cat6');assert.equal(draft.method,'PIX');
  state=saveTransaction(state,draft);
  state=saveEmployment(state,{...job,amount:600000});
  assert.equal(state.transactions[0].amount,543210);
  assert.equal(salaryDraft(state,'2026-12').amount,600000);
});
test('rascunho não cria lançamento e começa pendente',()=>{
  const state=saveEmployment(fresh(),job),draft=salaryDraft(state,'2026-11');
  assert.equal(state.transactions.length,0);assert.equal(draft.status,'pending');
  const pending=saveTransaction(state,draft);
  assert.equal(metrics(pending,'2026-11').income,543210);
  assert.equal(balance(pending,'2026-11-30'),0);
  assert.equal(balance(saveTransaction(pending,{...draft,status:'paid'}),'2026-11-30'),543210);
});
test('recebimento usa o mês escolhido e limita o dia em fevereiro e ano bissexto',()=>{
  const state=saveEmployment(fresh(),job);
  assert.equal(salaryDraft(state,'2026-02').date,'2026-02-28');
  assert.equal(salaryDraft(state,'2028-02').date,'2028-02-29');
  assert.equal(salaryDraft(state,'2026-12').date,'2026-12-31');
});
test('backup mantém o emprego e aceita versões anteriores sem cadastro',()=>{
  assert.deepEqual(validateState(fresh()),fresh());
  const state=saveEmployment(fresh(),job);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))),state);
  for(const change of [{amount:-1},{amount:0},{amount:1.5},{payday:0},{payday:32},{payday:1.5},{category:'inexistente'},{method:'Cartão de crédito'},{employer:42}]){
    assert.throws(()=>validateState({...state,employment:{...job,...change}}));
  }
});
test('não preenche salário sem cadastro, aceita empresa opcional e rejeita mês inválido',()=>{
  assert.throws(()=>salaryDraft(fresh(),'2026-11'));
  const state=saveEmployment(fresh(),{...job,employer:''});
  assert.equal(salaryDraft(state,'2026-11').description,'Salário mensal');
  assert.throws(()=>salaryDraft(state,'2026-13'));
});
