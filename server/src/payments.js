const crypto=require('crypto'),express=require('express');
const {wrap,allow,fail,noticeAccess,ClientNotice}=require('./access');
const {ClientPayment}=require('./models/clientPayment.model');const {AdminPayment}=require('./models/adminPayment.model');
const sha=s=>crypto.createHash('sha512').update(s).digest('hex');
function responseHash(d,salt,key){let s=`${salt}|${d.status}||||||${d.udf5||''}|${d.udf4||''}|${d.udf3||''}|${d.udf2||''}|${d.udf1||''}|${d.email}|${d.firstname}|${d.productinfo}|${d.amount}|${d.txnid}|${key}`;if(d.additionalCharges)s=d.additionalCharges+'|'+s;return sha(s)}
const router=express.Router();
router.post('/initiate',allow('client'),wrap(async(req,res)=>{
 if(!process.env.PAYU_KEY||!process.env.PAYU_SALT)fail(503,'PayU is not configured');
 const n=await noticeAccess(req,req.body.noticeId,true);if(n.paymentStatus==='Paid')fail(409,'This notice has already been paid');
 await require('./authority').requireAuthority(n.clientId);
 const amount=await require('./services/pricing').priceFor(req.session.user.id);
 const client=await require('./models/client.model').Client.findById(req.session.user.id);
 const activeKey=req.session.user.id+':'+n.noticeId;
 let payment=await ClientPayment.findOne({clientId:req.session.user.id,noticeId:n.noticeId,method:'PayU',status:'Pending'});
 if(payment&&!payment.gatewayRequest?.firstname)fail(409,'An existing payment requires administrator reconciliation before another session is started.');
 if(!payment){const request={firstname:client.name,email:client.email,phone:client.phone||'',productinfo:'Legal Notice - '+n.noticeId,udf1:req.session.user.id,udf2:n.noticeId};try{payment=await ClientPayment.create({clientId:request.udf1,noticeId:n.noticeId,txnId:'TXN-'+crypto.randomUUID(),amount,method:'PayU',billingEmail:request.email,status:'Pending',activeGatewayNotice:activeKey,gatewayRequest:request})}catch(e){if(e.code!==11000)throw e;payment=await ClientPayment.findOne({activeGatewayNotice:activeKey,status:'Pending'});if(!payment)fail(409,'The payment state changed. Refresh the matter before continuing.');}}
 const data={key:process.env.PAYU_KEY,txnid:payment.txnId,amount:payment.amount.toFixed(2),...payment.toObject().gatewayRequest};
 data.hash=sha(`${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1}|${data.udf2}|||||||||${process.env.PAYU_SALT}`);
 const base=process.env.APP_ORIGIN;data.surl=base+'/api/payu/success';data.furl=base+'/api/payu/failure';data.payuUrl=process.env.PAYU_IS_LIVE==='true'?'https://secure.payu.in/_payment':'https://test.payu.in/_payment';res.json({success:true,data});
}));
router.post(['/success','/failure'],wrap(async(req,res)=>{
 const d=req.body;if(!process.env.PAYU_KEY||!process.env.PAYU_SALT)fail(503,'PayU is not configured');
 const expected=responseHash(d,process.env.PAYU_SALT,process.env.PAYU_KEY);if(typeof d.hash!=='string'||d.hash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(d.hash)))fail(400,'Invalid payment signature');
 const p=await ClientPayment.findOne({txnId:d.txnid});if(!p||p.clientId!==d.udf1||p.noticeId!==d.udf2||p.amount!==Number(d.amount))fail(400,'Payment details do not match the initiated transaction');
 const paid=d.status==='success';if(paid){await require('mongoose').connection.transaction(async session=>{const paymentUpdate=await ClientPayment.updateOne({_id:p._id,status:{$ne:'Paid'}},{$set:{status:'Paid'},$unset:{activeGatewayNotice:1}},{session});if(paymentUpdate.modifiedCount){await require('./models/matterWork.model').MatterEvent.create([{noticeId:p.noticeId,actorRole:'gateway',label:'Payment verified by gateway',detail:p.txnId}],{session});const notice=await ClientNotice.findOne({noticeId:p.noticeId,clientId:p.clientId}).session(session);if(notice)await require('./services/clientUpdates').notifyClient(notice,'Payment verified. Administration will assign your request to an advocate for mandatory review.',session,'assignment');}await ClientNotice.updateOne({noticeId:p.noticeId,clientId:p.clientId},{$set:{paymentStatus:'Paid',draftStatus:'Generated'}},{session});});}else await ClientPayment.updateOne({_id:p._id,status:'Pending'},{$set:{status:'Failed'},$unset:{activeGatewayNotice:1}});
 res.redirect((process.env.APP_ORIGIN||'')+(paid?'/client-payment-success':'/client-payment-failure')+'?txnid='+encodeURIComponent(p.txnId));
}));
module.exports={router,responseHash};
