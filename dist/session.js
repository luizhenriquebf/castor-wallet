// A new page always owns a fresh wallet; backups are imported explicitly.
export function emptyWallet(){
  return {version:1,opening:0,categories:['Moradia','Alimentação','Transporte','Assinaturas','Lazer','Saúde','Salário','Outros'].map((name,i)=>({id:'cat'+i,name,color:['#568b78','#e7ae61','#7e97c4','#a494bd','#dc8e77','#6ea5a1','#8bbf90','#a6aaa2'][i]})),cards:[],transactions:[],recurringRules:[],recurringLedger:[]};
}
