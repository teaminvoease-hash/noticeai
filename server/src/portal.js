const express=require('express'),sanitize=require('sanitize-html');
const a=require('./access');const {wrap,allow,fail,noticeAccess}=a;
const C=require('./controller/clientPortal.controller');
const router=express.Router();router.use(allow('admin','client','lawyer'));
router.use(wrap(async(req,res,next)=>{
 const u=req.session.user;
 // A disabled account loses API access on the next request.
 const Model=require('./auth').models[u.role];const account=await Model.findById(u.id);
 if(!account||(u.role!=='admin'&&!['active','verified','onboard'].includes(account.status)))fail(401,'Please sign in again');
 if(req.method!=='GET')await a.checkFiles(req);
 req.scope=u.role==='client'?{clientId:u.id}:{};
 if(u.role==='lawyer'){
  const list=await a.ClientNotice.find({lawyerId:u.id});req.scope={noticeId:{$in:list.map(n=>n.noticeId)}};
 }
 if(u.role==='client'){
  if(req.body.clientId&&req.body.clientId!==u.id)fail(403,'Client identity does not match your login');req.body.clientId=u.id;
  if(req.query.clientId&&req.query.clientId!==u.id)fail(403,'Client identity does not match your login');
 }
 if(u.role==='lawyer'&&req.method!=='GET'){
  req.body.lawyerId=u.id;req.body.requestedById=u.id;req.body.requestedByRole='lawyer';
 }
 next();
}));
const run=name=>wrap(C[name]);
router.get('/notices',run('getNotices'));
router.post('/notices',allow('client'),run('submitNotice'));
router.post('/notices/preview',allow('client'),run('previewNotice'));
router.put('/notices/:id',allow('client'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);if(n.paymentStatus==='Paid'||n.lawyerId)fail(409,'This notice is already in review');next()}),run('updateNotice'));
router.post('/notices/:id/assign-lawyer',allow('admin'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);const l=await a.Lawyer.findById(req.body.lawyerId);if(!l||!['active','verified'].includes(l.status))fail(400,'Choose an approved lawyer');next()}),run('assignNoticeToLawyer'));
router.post('/notices/:id/status',allow('admin','lawyer'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);if(['approved','verified'].includes(String(req.body.status).toLowerCase())&&n.paymentStatus!=='Paid')fail(409,'Payment must be verified before review approval');next()}),run('updateNoticeStatus'));
router.post('/notices/:id/generated-notice',allow('lawyer'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);if(n.paymentStatus!=='Paid')fail(409,'Payment must be verified before editing the draft');req.body.generatedNotice=sanitize(String(req.body.generatedNotice||''));next()}),run('updateGeneratedNotice'));
router.post('/notices/:id/send-email',allow('lawyer'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);if(n.paymentStatus!=='Paid'||!n.signedFile||!['approved','verified'].includes(n.status))fail(409,'Payment, review approval and signed document are required before dispatch');next()}),run('sendNoticeEmailToDefaulter'));
router.post('/notices/:id/signed-file',allow('lawyer'),wrap(async(req,res)=>{const n=await noticeAccess(req,req.params.id);if(n.paymentStatus!=='Paid'||!['approved','verified'].includes(n.status))fail(409,'Payment and review approval are required');if(!req.body.signedFile?.endsWith('.pdf'))fail(400,'A signed PDF is required');n.signedFile=req.body.signedFile;n.signedNoticeStatus='Uploaded';await n.save();res.json({success:true,data:n})}));
router.post('/notices/:id/delivery',allow('admin'),wrap(async(req,res)=>{const n=await noticeAccess(req,req.params.id);if(!n.signedFile)fail(409,'Upload a signed notice first');const fields=['courier','trackingId','dispatchDate','deliveryStatus','proofOfDelivery'];if(!['Not dispatched','In Transit','Delivered','Returned'].includes(req.body.deliveryStatus))fail(400,'Invalid delivery status');for(const k of fields)if(typeof req.body[k]==='string')n[k]=req.body[k];await n.save();res.json({success:true,data:n})}));
router.get('/documents',run('getDocuments'));
router.post('/documents',wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.body.noticeId,true);req.body.clientId=n.clientId;if(req.session.user.role==='client'){req.body.requestedByRole='client';req.body.requestedById=req.session.user.id}else if(req.session.user.role==='lawyer'){req.body.clientEmail=(await a.Client.findById(n.clientId))?.email||''}next()}),run('uploadDocument'));
router.put('/documents/:id',wrap(async(req,res,next)=>{const doc=await a.ClientDocument.findById(req.params.id);if(!doc)fail(404,'Document not found');await noticeAccess(req,doc.noticeId,true);if(req.body.noticeId&&req.body.noticeId!==doc.noticeId)fail(400,'Document cannot be moved to another notice');req.body.clientId=doc.clientId;req.body.noticeId=doc.noticeId;if(req.session.user.role==='client'){req.body.requestedByRole=doc.requestedByRole;req.body.requestedById=doc.requestedById;req.body.clientEmail=doc.clientEmail;req.body.requestMessage=doc.requestMessage;}next()}),run('updateDocument'));
router.get('/payments',allow('admin','client'),run('getPayments'));
router.post('/payments',allow('client'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.body.noticeId,true);if(n.paymentStatus==='Paid')fail(409,'This notice has already been paid');if(req.body.method==='PayU')fail(400,'Use the PayU gateway to initiate this payment');if(!Number.isFinite(Number(req.body.amount))||Number(req.body.amount)<=0)fail(400,'Invalid payment amount');next()}),run('createPayment'));
router.get('/delivery-tracking',allow('admin','client'),run('getDeliveryTracking'));
router.get('/downloads',allow('admin','client'),run('getDownloads'));
router.get('/notifications',allow('admin','client'),run('getNotifications'));
router.post('/notifications',allow('admin'),run('createNotification'));
router.patch('/notifications/:id/read',allow('client'),wrap(async(req,res,next)=>{if(!await a.ClientNotification.exists({_id:req.params.id,clientId:req.session.user.id}))fail(404,'Notification not found');next()}),run('markNotificationRead'));
router.all('/profile/:clientId',allow('client','admin'),(req,res,next)=>{if(req.session.user.role!=='admin'&&req.params.clientId!==req.session.user.id)return res.status(403).json({success:false,message:'Access denied'});next()});
router.get('/profile/:clientId',run('getClientProfile'));
router.post('/profile/:clientId',wrap(async(req,res,next)=>{if(req.body.password&&String(req.body.password).length<10)fail(400,'Password must have at least 10 characters');next()}),run('updateClientProfile'));
router.get('/defaulters',wrap(async(req,res,next)=>{if(req.session.user.role==='lawyer'){const notices=await a.ClientNotice.find({lawyerId:req.session.user.id});req.scope={_id:{$in:notices.map(n=>n.defaulterId).filter(Boolean)}}}next()}),run('getDefaulters'));
router.post('/defaulters',allow('client'),run('createDefaulter'));
router.use('/defaulters/:id',wrap(async(req,res,next)=>{const d=await a.ClientDefaulter.findById(req.params.id);if(!d)fail(404,'Record not found');if(req.session.user.role!=='admin'&&d.clientId!==req.session.user.id)fail(404,'Record not found');next()}));
router.get('/defaulters/:id',run('getDefaulterById'));router.put('/defaulters/:id',allow('client'),run('updateDefaulter'));
module.exports=router;
