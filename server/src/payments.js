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
 const pricing=await AdminPayment.findOne({paymentScope:'per_client',clientId:req.session.user.id}).sort({updatedAt:-1})||await AdminPayment.findOne({paymentScope:'global'}).sort({updatedAt:-1});
 if(!pricing||!Number.isFinite(pricing.totalAmount)||pricing.totalAmount<=0)fail(409,'Ask the administrator to configure pricing');
 const client=await require('./models/client.model').Client.findById(req.session.user.id);
 const data={key:process.env.PAYU_KEY,txnid:'TXN-'+crypto.randomUUID(),amount:pricing.totalAmount.toFixed(2),productinfo:'Legal Notice - '+n.noticeId,firstname:client.name,email:client.email,phone:client.phone||'',udf1:req.session.user.id,udf2:n.noticeId};
 await ClientPayment.create({clientId:data.udf1,noticeId:n.noticeId,txnId:data.txnid,amount:Number(data.amount),method:'PayU',billingEmail:data.email,status:'Pending'});
 data.hash=sha(`${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1}|${data.udf2}|||||||||${process.env.PAYU_SALT}`);
 const base=process.env.APP_ORIGIN;data.surl=base+'/api/payu/success';data.furl=base+'/api/payu/failure';data.payuUrl=process.env.PAYU_IS_LIVE==='true'?'https://secure.payu.in/_payment':'https://test.payu.in/_payment';res.json({success:true,data});
}));
router.post(['/success','/failure'],wrap(async(req,res)=>{
 const d=req.body;if(!process.env.PAYU_KEY||!process.env.PAYU_SALT)fail(503,'PayU is not configured');
 const expected=responseHash(d,process.env.PAYU_SALT,process.env.PAYU_KEY);if(typeof d.hash!=='string'||d.hash.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(d.hash)))fail(400,'Invalid payment signature');
 const p=await ClientPayment.findOne({txnId:d.txnid});if(!p||p.clientId!==d.udf1||p.noticeId!==d.udf2||p.amount!==Number(d.amount))fail(400,'Payment details do not match the initiated transaction');
 const paid=d.status==='success';if(paid){await require('mongoose').connection.transaction(async session=>{const paymentUpdate=await ClientPayment.updateOne({_id:p._id,status:{$ne:'Paid'}},{$set:{status:'Paid'}},{session});if(paymentUpdate.modifiedCount)await require('./models/matterWork.model').MatterEvent.create([{noticeId:p.noticeId,actorRole:'gateway',label:'Payment verified by gateway',detail:p.txnId}],{session});await ClientNotice.updateOne({noticeId:p.noticeId,clientId:p.clientId},{$set:{paymentStatus:'Paid',draftStatus:'Generated'}},{session});});}else await ClientPayment.updateOne({_id:p._id,status:'Pending'},{$set:{status:'Failed'}});
 res.redirect((process.env.APP_ORIGIN||'')+(paid?'/client-payment-success':'/client-payment-failure')+'?txnid='+encodeURIComponent(p.txnId));
}));
module.exports={router,responseHash};
