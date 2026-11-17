// Stable step identifiers are shared by the workflow API and dashboard.
function workflow(notice,authority,documents=[]){
 const paid=notice.paymentStatus==='Paid',reviewed=['approved','verified'].includes(String(notice.status).toLowerCase());
 if(!paid&&authority?.authorityStatus!=='approved')return {step:0,owner:authority?.authorityLetter&&authority.authorityStatus!=='changes_required'?'admin':'client',label:authority?.authorityStatus==='changes_required'?'Authority letter needs corrections':authority?.authorityLetter?'Authority letter awaiting review':'Signed authority letter needed'};
 if(!paid)return {step:1,owner:'client',label:'Payment required'};
 if(!notice.lawyerId)return {step:2,owner:'admin',label:'Assign an advocate'};
 if(!notice.signedFile&&documents.some(d=>['Requested','Corrections needed'].includes(require('./matterServices').docState(d))))return {step:3,owner:'client',label:'Supporting documents needed from client'};
 if(!notice.signedFile&&documents.some(d=>require('./matterServices').docState(d)==='Uploaded'))return {step:3,owner:'lawyer',label:'Document responses awaiting review'};
 if(!reviewed&&!notice.signedFile)return {step:3,owner:'lawyer',label:String(notice.status).toLowerCase()==='rejected'?'Review needs attention':'Advocate review in progress'};
 if(!notice.signedFile)return {step:4,owner:'lawyer',label:'Upload final signed notice'};
 if(!notice.trackingId)return {step:5,owner:'admin',label:'Record dispatch'};
 if(notice.deliveryStatus==='Returned')return {step:6,owner:'admin',label:'Returned — review delivery record'};
 if(notice.deliveryStatus!=='Delivered')return {step:6,owner:'admin',label:'In transit — update delivery'};
 return {step:7,owner:null,label:'Delivered'};
}
module.exports={workflow};
