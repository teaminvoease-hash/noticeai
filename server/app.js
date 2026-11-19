const express=require('express'),session=require('express-session'),MongoStore=require('connect-mongo'),helmet=require('helmet'),{rateLimit}=require('express-rate-limit'),path=require('path'),fs=require('fs'),crypto=require('crypto'),multer=require('multer');
const {wrap,allow,fail,fileAccess,checkFiles,ClientNotice,Client,Lawyer}=require('./src/access');const {router:auth,models}=require('./src/auth');
function createApp({sessionStore}={}){
 const app=express();app.disable('x-powered-by');if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
 if(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)throw new Error('Set SESSION_SECRET to at least 32 random characters');
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','blob:'],fontSrc:["'self'",'data:'],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],formAction:["'self'",'https://secure.payu.in','https://test.payu.in'],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
 app.use('/api',(_req,res,next)=>{res.set('Cache-Control','private, no-store');next()});
 app.use(express.json({limit:'1mb'}),express.urlencoded({extended:false,limit:'1mb'}));
 app.use(session({name:process.env.SESSION_COOKIE_NAME||'notice.sid',secret:process.env.SESSION_SECRET,store:sessionStore||MongoStore.create({mongoUrl:process.env.MONGODB_URI}),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:86400000}}));
 app.use('/api',rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use('/api/auth',rateLimit({windowMs:900000,limit:30,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use('/api',(req,res,next)=>{if(req.path.startsWith('/payu/')&&['/payu/success','/payu/failure'].includes(req.path))return next();if(!['GET','HEAD'].includes(req.method)&&(!req.session.csrf||req.headers['x-csrf-token']!==req.session.csrf))return res.status(403).json({success:false,message:'Session expired. Refresh and try again.'});next()});
 // Reject Mongo operators and object values in scalar identity inputs.
 app.use('/api',(req,res,next)=>{const inspect=o=>{if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){if(k.startsWith('$')||k.includes('.'))fail(400,'Invalid input');inspect(v)}};try{inspect(req.body);inspect(req.query);next()}catch(e){next(e)}});
 app.use('/api',(req,res,next)=>{if(!req.path.startsWith('/auth/')&&req.body.password!==undefined&&req.body.password!==''){if(typeof req.body.password!=='string'||req.body.password.length<10||req.body.password.length>128)return res.status(400).json({success:false,message:'Use a password of 10 to 128 characters.'})}next()});
 app.use('/api',auth);
 app.use('/api',require('./src/config/commercialReview').requireCommercialReview);
 app.use('/api',wrap(async(req,res,next)=>{if(req.session.user){const u=await models[req.session.user.role]?.findById(req.session.user.id);if(!u||(u.status&&!['active','verified','onboard'].includes(u.status)))fail(401,'Please sign in again')}next()}));
 // Never expose password hashes via legacy administration responses.
 app.use('/api',(req,res,next)=>{const json=res.json.bind(res);res.json=data=>json(JSON.parse(JSON.stringify(data,(key,value)=>key==='password'?undefined:value)));next()});
 const storage=require('./src/storage');
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1}});
 app.post(['/api/file-upload','/api/picture-upload','/api/upload-recovery-document'],rateLimit({windowMs:60000,limit:12}),upload.any(),wrap(async(req,res)=>{
  if(req.files?.length!==1)fail(400,'Choose one document');
  res.json(await require('./src/services/privateUpload').persistUpload(req,req.files[0]));
 }));
 app.use('/api',require('./src/fileTransfers').router);
 app.get('/uploads/:name',wrap(async(req,res)=>{if(!/^[\w.-]+$/.test(req.params.name)||!await fileAccess(req,req.params.name))fail(404,'File not found');res.set('Cache-Control','private, no-store');
 if(process.env.VERCEL==='1'&&(await storage.info(req.params.name)).size>3*1024*1024){res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private document download</title><body><main><h1>Preparing your private document</h1><p id="download-status" role="status">Downloading verified file parts…</p><button id="download-retry" hidden>Retry download</button><script src="/private-download.js" defer></script></main></body></html>');return;}
 await storage.download(req.params.name,res)}));
 app.use('/api',require('./src/publicRoutes'));
 app.use('/api',require('./src/aiRoutes'));
 app.use('/api',require('./src/casework'));
 app.use('/api',require('./src/professionalRoutes'));
 app.use('/api/authority',require('./src/authority'));
 app.use('/api/client-portal',require('./src/portal'));app.use('/api/payu',require('./src/payments').router);app.use('/api',require('./src/wallet').router);
 const mount=(name,spec)=>{const c=require('./src/controller/'+name+'.controller');for(const [method,url,handler]of spec)app[method]('/api/'+url,allow('admin'),wrap(c[handler]))};
 app.get(['/api/delete-client/:id','/api/delete-blog/:id'],allow('admin'),(_req,res)=>res.status(405).set('Allow','POST').json({success:false,message:'This action requires POST and a valid CSRF token.'}));
 mount('client',[['get','get-client-byid/:id','GetClientByid'],['post','client-update/:id','UpdateClient'],['post','update-client-basic/:id','UpdateClientBasic'],['post','update-client-status/:id','UpdateClientStatus'],['post','delete-client/:id','DeleteClient']]);
 app.get('/api/get-client',allow('admin','lawyer'),wrap(async(req,res)=>{const filter=req.session.user.role==='admin'?{}:{_id:{$in:(await ClientNotice.find({lawyerId:req.session.user.id})).map(n=>n.clientId)}};res.json({success:true,data:await Client.find(filter).select(req.session.user.role==='admin'?'-password':'name client_id email company phone')})}));
 app.get('/api/get-lawyer',allow('admin','client'),wrap(async(req,res)=>{const filter=req.session.user.role==='admin'?{}:{_id:{$in:(await ClientNotice.find({clientId:req.session.user.id})).map(n=>n.lawyerId).filter(Boolean)}};res.json({success:true,data:await Lawyer.find(filter).select(req.session.user.role==='admin'?'-password':'name advocate_id firmName designation')})}));
 const lc=require('./src/controller/lawyer.controller');
 app.get('/api/get-lawyer-byid/:id',allow('admin','lawyer'),wrap(async(req,res,next)=>{if(req.session.user.role==='lawyer'&&req.params.id!==req.session.user.id)fail(404,'Account not found');next()}),wrap(lc.getLawyerById));
 app.post('/api/lawyer-profile/:id',allow('lawyer'),wrap(async(req,res,next)=>{if(req.params.id!==req.session.user.id)fail(403,'Access denied');await checkFiles(req);if(req.body.password&&req.body.password.length<10)fail(400,'Use at least 10 password characters');next()}),wrap(lc.updateLawyerProfile));
 mount('lawyer',[['post','create-lawyer','createLawyer'],['post','update-lawyer/:id','updateLawyer'],['post','update-lawyer-status/:id','updateLawyerStatus']]);
 mount('adminDocument',[['get','get-admin-document','getDocuments'],['get','get-admin-document-byid/:id','getDocumentById'],['post','create-admin-document','createDocument'],['post','update-admin-document/:id','updateDocument']]);
 mount('adminNotice',[['get','get-admin-notice','getNotices'],['get','get-admin-notice-byid/:id','getNoticeById'],['post','create-admin-notice','createNotice'],['post','update-admin-notice/:id','updateNotice']]);
 mount('adminPayment',[['get','get-admin-payment','getPayments'],['get','get-admin-payment-byid/:id','getPaymentById'],['post','create-admin-payment','createPayment'],['post','update-admin-payment/:id','updatePayment']]);
 mount('template',[['get','get-template','getTemplates'],['get','get-template-byid/:id','getTemplateById'],['post','create-template','createTemplate'],['post','update-template/:id','updateTemplate']]);
 mount('blog',[['get','get-blog','GetBlogs'],['get','get-blog-byid/:id','GetBlogById'],['post','post-blog','CreateBlog'],['post','blog-update/:id','UpdateBlog'],['post','delete-blog/:id','DeleteBlog']]);
 mount('homeDirectory',[['get','get-home-directory-data','GetHomeDirectoryData'],['post','upsert-home-directory-data','UpsertHomeDirectoryData']]);

 app.get('/api/payment-ledger',allow('admin'),wrap(async(req,res)=>res.json({success:true,data:await require('./src/models/clientPayment.model').ClientPayment.find().sort({createdAt:-1})})));
 app.post('/api/payment-ledger/:id/verify',allow('admin'),wrap(async(req,res)=>{const {ClientPayment}=require('./src/models/clientPayment.model');if(!req.body.reference?.trim())fail(400,'A reconciliation reference is required');await require('mongoose').connection.transaction(async session=>{const p=await ClientPayment.findOneAndUpdate({_id:req.params.id,status:'Pending',method:{$ne:'PayU'}},{$set:{status:'Paid',reconciliationReference:req.body.reference,verifiedBy:req.session.user.id,verifiedAt:new Date()}},{new:true,session});if(!p)fail(409,'Payment is missing, already processed or requires a PayU callback');const settled=await ClientNotice.updateOne({clientId:p.clientId,noticeId:p.noticeId,paymentStatus:{$ne:'Paid'}},{$set:{paymentStatus:'Paid',draftStatus:'Generated'}},{session});if(!settled.modifiedCount)fail(409,'This matter is already paid or missing. Reconcile duplicate payment records separately.');await require('./src/models/matterWork.model').MatterEvent.create([{noticeId:p.noticeId,actorRole:'admin',actorId:req.session.user.id,label:'External payment reconciled',detail:req.body.reference}],{session});const notice=await ClientNotice.findOne({noticeId:p.noticeId,clientId:p.clientId}).session(session);await require('./src/services/clientUpdates').notifyClient(notice,'Payment verified by administration. Your request is ready for advocate assignment.',session,'assignment');});res.json({success:true})}));
 app.get('/api/integrations',allow('admin'),(_req,res)=>res.json({success:true,data:[{service:'AI drafting',status:require('./src/services/legalAi').status().aiEnabled?'Enabled — explicit consent and independent review required':'Disabled or not configured — manual drafting available'},{service:'SMTP email',status:process.env.APP_ENV==='staging'&&process.env.STAGING_ALLOW_EXTERNAL_DELIVERY!=='true'?'Disabled in staging':process.env.SMTP_HOST&&process.env.SMTP_FROM?'Configured':'Not configured'},{service:'PayU',status:process.env.PAYU_KEY&&process.env.PAYU_SALT?'Configured':'Not configured'},{service:'Courier',status:'Manual administrator records'}]}));
 app.get('/api/health',wrap(async(_req,res)=>{const ready=require('mongoose').connection.readyState===1;if(ready)await require('./src/services/identityReadiness').requireIdentityIndex();res.set('Cache-Control','no-store');res.status(ready?200:503).json({success:ready,status:ready?'ok':'database unavailable'})}));
 app.use('/api',(_req,res)=>res.status(404).json({success:false,message:'API endpoint not found'}));
 const dist=path.join(__dirname,'../client/dist');app.use(express.static(dist));app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
 app.use((err,req,res,next)=>{if(res.headersSent)return next(err);const status=err.status||(['CastError','ValidationError'].includes(err.name)||err instanceof multer.MulterError?400:500);if(status===500)console.error('Request failed:',err.name);res.status(status).json({success:false,message:status===500?'Unable to complete request. Please try again.':err.message})});
 return app;
}
module.exports={createApp};
