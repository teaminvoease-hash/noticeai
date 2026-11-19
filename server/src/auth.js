const Identity=require('./models/accountIdentity.model');const mongoose=require('mongoose');
const express=require('express'),bcrypt=require('bcryptjs'),crypto=require('crypto');
const {Admin}=require('./models/admin.model');const {Client}=require('./models/client.model');const {Lawyer}=require('./models/lawyer.model');const File=require('./models/file.model');
const {wrap,fail,checkFiles}=require('./access');
const models={admin:Admin,client:Client,lawyer:Lawyer};
const safe=(record,role)=>{const data=record.toObject();delete data.password;return {...data,role}};
const regenerate=req=>new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
async function startSession(req,record,role){const oldId=req.sessionID;await regenerate(req);req.session.user={id:String(record._id),role};req.session.csrf=crypto.randomBytes(24).toString('hex');await File.updateMany({sessionId:oldId},{$set:{ownerId:String(record._id),role},$unset:{sessionId:1}});}
const router=express.Router();
router.get('/session',wrap(async(req,res)=>{req.session.csrf ||=crypto.randomBytes(24).toString('hex');let user=null;if(req.session.user){const u=await models[req.session.user.role]?.findById(req.session.user.id);if(u&&(!u.status||['active','verified','onboard'].includes(u.status)))user=safe(u,req.session.user.role);else delete req.session.user;}res.json({success:true,user,csrf:req.session.csrf})}));
router.post('/logout',(req,res)=>req.session.destroy(()=>{res.clearCookie(process.env.SESSION_COOKIE_NAME||'notice.sid');res.json({success:true})}));
router.post('/auth/:role/:action',wrap(async(req,res)=>{
 const {role,action}=req.params,Model=models[role];if(!Model||!['signup','login'].includes(action))fail(404,'Not found');
 if(role==='admin'&&action==='signup'&&req.session.user?.role!=='admin')fail(403,'Administrators are created using the provisioning command');
 const {name,password}=req.body;const email=String(req.body.email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length>128)fail(400,'Valid email and password are required');
 if(action==='login'){
  const exactEmail={email:new RegExp('^'+email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i')};const u=await Model.findOne({email})||await Model.findOne(exactEmail);const legacyHash=u?.password?.replace(/^\$2y\$/,'$2b$');const ok=await bcrypt.compare(password,legacyHash||'$2b$10$7Ysq4gv0wXZz7zqfArQlF.bJPvDDAFsV5r3UjItpGl.K5Ro6YN8tK');
  if(!u||!ok)fail(401,'Email or password is incorrect');
  if(role!=='admin'&&!['active','verified','onboard'].includes(u.status))fail(403,'Your account is awaiting approval or is inactive');
  await startSession(req,u,role);return res.json({success:true,data:safe(u,role)});
 }
 if(!name?.trim()||password.length<10)fail(400,'Name and a password of at least 10 characters are required');
 if(await Model.exists({email:new RegExp('^'+email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i')}))fail(409,'An account with this email already exists');await checkFiles(req);
 const fields=role==='lawyer'?['name','address','phone','enrollmentNo','barId','city','aadhaarFile','panFile','barIdFile']:['name','phone'];
 const body=Object.fromEntries(fields.filter(k=>typeof req.body[k]==='string').map(k=>[k,req.body[k]]));
 await require('./services/identityReadiness').requireIdentityIndex();
 let u;const passwordHash=await bcrypt.hash(password,12);
 try{await mongoose.connection.transaction(async session=>{const id=new mongoose.Types.ObjectId();await Identity.create([{role,email,accountId:String(id)}],{session});[u]=await Model.create([{_id:id,...body,email,password:passwordHash,...(role==='client'?{client_id:'CLT-'+crypto.randomBytes(5).toString('hex'),status:'onboard'}:role==='lawyer'?{advocate_id:'ADV-'+crypto.randomBytes(5).toString('hex'),status:'pending'}:{})}],{session})})}catch(e){if(e.code===11000)fail(409,'An account with this email already exists');throw e;}
 if(role==='lawyer'){await File.updateMany({sessionId:req.sessionID},{$set:{ownerId:String(u._id),role},$unset:{sessionId:1}});return res.json({success:true,data:safe(u,role),message:'Application received. An administrator must approve your account before login.'});}
 // Admin-created client signup must not replace the administrator session.
 if(req.session.user?.role!=='admin')await startSession(req,u,role);
 res.json({success:true,data:safe(u,role)});
}));
module.exports={router,models,safe};
