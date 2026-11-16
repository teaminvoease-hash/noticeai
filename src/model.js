export function validateRequest(d) {
 if(!d.category||!d.sender?.trim()||!d.recipient?.trim()) return 'Choose a category and add both parties.';
 if((d.facts?.trim().length||0)<50) return 'Describe the facts in at least 50 characters.';
 if((d.relief?.trim().length||0)<10) return 'Describe the requested action in at least 10 characters.';
 if(!d.consent) return 'Confirm the declaration before saving.';
 return '';
}
export function filterGroups(groups,query,department){return Object.entries(groups).filter(([g])=>department==='All departments'||g===department).map(([g,items])=>[g,items.filter(x=>(g+' '+x).toLowerCase().includes(query.trim().toLowerCase()))]).filter(([,items])=>items.length);}
export function exportRequest(r){return ['RESOLVEX — DEMO INTAKE (NOT A LEGAL NOTICE)',`Reference: ${r.id}`,`Category: ${r.category}`,`Sender: ${r.sender}`,`Recipient: ${r.recipient}`,`Facts: ${r.facts}`,`Requested action: ${r.relief}`,'No payment, legal review or dispatch has occurred.'].join('\n\n');}
