import {suppressRecurringAfterReset} from './recurring.js';
export const canResetTransactions=confirmation=>confirmation==='APAGAR';

export function resetTransactions(state,confirmation,month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7)){
  if(!canResetTransactions(confirmation))throw Error('Digite APAGAR exatamente como indicado para confirmar.');
  return {...state,opening:0,transactions:[],recurringLedger:[],...(state.recurringRules?{recurringRules:suppressRecurringAfterReset(state,month)}:{})};
}
