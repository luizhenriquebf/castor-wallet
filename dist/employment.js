import {methods,validateTransaction} from './model.js';

export function validateEmployment(job,state){
  if(!job||typeof job.employer!=='string'||job.employer.length>80)throw Error('Informe uma empresa com até 80 caracteres.');
  if(!Number.isSafeInteger(job.amount)||job.amount<=0||job.amount>99999999900)throw Error('Informe um salário mensal válido.');
  if(!Number.isInteger(job.payday)||job.payday<1||job.payday>31)throw Error('Escolha um dia de recebimento entre 1 e 31.');
  if(!state.categories.some(c=>c.id===job.category))throw Error('Escolha uma categoria válida para o salário.');
  if(!methods.filter(m=>m!=='Cartão de crédito').includes(job.method))throw Error('Escolha um meio de recebimento válido.');
  return job;
}

export function saveEmployment(state,job){
  validateEmployment(job,state);
  return {...state,employment:{...job,employer:job.employer.trim()}};
}

export function salaryDraft(state,month){
  validateEmployment(state.employment,state);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Selecione um mês válido.');
  const job=state.employment;
  const [year,m]=month.split('-').map(Number);
  const day=Math.min(job.payday,new Date(Date.UTC(year,m,0)).getUTCDate());
  return validateTransaction({id:crypto.randomUUID(),type:'income',description:job.employer?`Salário · ${job.employer}`:'Salário mensal',amount:job.amount,date:`${month}-${String(day).padStart(2,'0')}`,category:job.category,method:job.method,status:'pending'},state);
}
