const express=require('express'),sanitize=require('./services/sanitize');
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
router.use((req,res,next)=>{
 const labels={'send-email':'Signed notice emailed'};
 const match=req.path.match(/^\/notices\/([^/]+)\/([^/]+)$/);if(req.method==='GET'||!match||!labels[match[2]])return next();
 const send=res.json.bind(res);res.json=data=>{if(!data.success)return send(data);return (async()=>{const n=await a.ClientNotice.findById(match[1]);if(n)await require('./matterServices').event(req,n,labels[match[2]],match[2]==='status'?String(n.status):'');return send(data)})().catch(next)};next();
});
const run=name=>wrap(C[name]);
router.get('/workflow',wrap(async(req,res)=>{
 const u=req.session.user;const notices=await a.ClientNotice.find(u.role==='client'?{clientId:u.id}:u.role==='lawyer'?{lawyerId:u.id}:{}).select('_id noticeId clientId subject category paymentStatus status lawyerId lawyerName signedFile trackingId deliveryStatus createdAt updatedAt draftRevision professionalReview.policyVersion professionalReview.lawyerId professionalReview.revision professionalReview.reviewedAt professionalReview.checklist clientUpdateNote nextUpdateAt').sort({createdAt:-1}).lean();
 const clients=await a.Client.find({_id:{$in:[...new Set(notices.map(n=>n.clientId))]}}).select('name authorityLetter authorityStatus').lean();
 const documents=await a.ClientDocument.find({noticeId:{$in:notices.map(n=>n.noticeId)}}).lean();
 const advocates=await a.Lawyer.find({_id:{$in:[...new Set(notices.map(n=>n.lawyerId).filter(id=>require('mongoose').isValidObjectId(id)))]}}).select('status credentialReview').lean();const advocateMap=new Map(advocates.map(l=>[String(l._id),l]));
 const map=new Map(clients.map(c=>[String(c._id),c]));
 res.json({success:true,data:notices.map(n=>({...Object.fromEntries(Object.entries(n).filter(([key])=>!['generatedNotice','professionalReview'].includes(key))),clientName:map.get(n.clientId)?.name||'',workflow:require('./workflow').workflow(n,map.get(n.clientId),documents.filter(d=>d.noticeId===n.noticeId),advocateMap.get(n.lawyerId))}))});
}));
router.get('/notices',run('getNotices'));
router.post('/notices',allow('client'),(req,res,next)=>{delete req.body.intakeDraftId;next()},run('submitNotice'));
router.post('/notices/preview',allow('client'),run('previewNotice'));
router.put('/notices/:id',allow('client'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);if(n.paymentStatus==='Paid'||n.lawyerId)fail(409,'This notice is already in review');next()}),run('updateNotice'));
router.post('/notices/:id/assign-lawyer',allow('admin'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);if(n.signedFile)fail(409,'A signed final notice cannot be reassigned');if(n.paymentStatus!=='Paid')fail(409,'Verify payment before assigning an advocate');const l=await a.Lawyer.findById(req.body.lawyerId);if(!l||!['active','verified'].includes(l.status))fail(400,'Choose an approved lawyer');next()}),run('assignNoticeToLawyer'));
router.post('/notices/:id/status',allow('admin','lawyer'),wrap(require('./matterServices').reviewNotice));
router.post('/notices/:id/generated-notice',allow('lawyer'),wrap(require('./matterServices').saveDraft));
router.post('/notices/:id/send-email',allow('lawyer'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.params.id);if(n.paymentStatus!=='Paid'||!n.signedFile||!['approved','verified'].includes(n.status))fail(409,'Payment, review approval and signed document are required before dispatch');await require('./services/professionalReview').requireVetting(n);next()}),run('sendNoticeEmailToDefaulter'));
router.post('/notices/:id/signed-file',allow('lawyer'),wrap(require('./matterServices').signNotice));
router.post('/notices/:id/delivery',allow('admin','lawyer'),wrap(require('./services/deliveryUpdates').saveDelivery));
router.get('/documents',run('getDocuments'));
router.post('/documents',wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.body.noticeId,true);if(n.signedFile)fail(409,'A final signed notice cannot change documents');req.documentMatter=n;req.body.clientId=n.clientId;req.body.requestedByRole=req.session.user.role;req.body.requestedById=req.session.user.id;req.body.status=req.body.fileName||(req.body.responseFiles||[]).length?'Uploaded':'Requested';if(req.session.user.role==='client'){req.body.requestedByRole='client';req.body.requestedById=req.session.user.id}else if(req.session.user.role==='lawyer'){req.body.clientEmail=(await a.Client.findById(n.clientId))?.email||''}next()}),run('uploadDocument'));
router.put('/documents/:id',wrap(async(req,res)=>{
 if(req.session.user.role==='client')return require('./matterServices').respondDocument(req,res,true);
 return require('./matterServices').reviewDocument(req,res);
}));
router.get('/payments',allow('admin','client'),run('getPayments'));
router.post('/payments',allow('client'),wrap(async(req,res,next)=>{const n=await noticeAccess(req,req.body.noticeId,true);if(n.paymentStatus==='Paid')fail(409,'This notice has already been paid');await require('./authority').requireAuthority(n.clientId);if(req.body.method==='PayU')fail(400,'Use the PayU gateway to initiate this payment');const amount=await require('./services/pricing').priceFor(n.clientId);if(Number(req.body.amount)!==amount)fail(400,'The amount must match the administrator-configured service price.');req.body.amount=amount;req.paymentMatter=n;next()}),run('createPayment'));
router.get('/delivery-tracking',allow('admin','client'),run('getDeliveryTracking'));
router.get('/downloads',allow('admin','client'),run('getDownloads'));
router.get('/notifications',allow('admin','client'),run('getNotifications'));
router.get('/notification-feed',allow('client'),wrap(async(req,res)=>{
 const filter={clientId:req.session.user.id};
 const before=req.query.before;
 if(before!==undefined&&(typeof before!=='string'||!require('mongoose').isObjectIdOrHexString(before)))fail(400,'Invalid notification page. Refresh updates and try again.');
 const [rows,unreadCount]=await Promise.all([
  a.ClientNotification.find({...filter,...(before?{_id:{$lt:before}}:{})}).sort({_id:-1}).limit(51).lean(),
  a.ClientNotification.countDocuments({...filter,status:'Unread'})
 ]);
 const items=rows.slice(0,50),hasMore=rows.length>50;
 const notices=await a.ClientNotice.find({...filter,noticeId:{$in:items.map(n=>n.noticeId).filter(Boolean)}}).select('_id noticeId').lean();
 const map=new Map(notices.map(n=>[n.noticeId,String(n._id)]));
 res.set('Cache-Control','private, no-store').json({success:true,data:{items:items.map(n=>({...n,matterId:map.get(n.noticeId)||null,section:['delivery','signed','documents','next-action','assignment'].includes(n.section)?n.section:'timeline'})),unreadCount,hasMore,nextCursor:hasMore?String(items.at(-1)._id):null}});
}));
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
