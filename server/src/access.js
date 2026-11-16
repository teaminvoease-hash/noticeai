const {ClientNotice}=require('./models/clientNotice.model');
const {ClientDocument}=require('./models/clientDocument.model');
const {ClientDefaulter}=require('./models/clientDefaulter.model');
const {ClientNotification}=require('./models/clientNotification.model');
const {Client}=require('./models/client.model');
const {Lawyer}=require('./models/lawyer.model');
const File=require('./models/file.model');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const allow=(...roles)=>(req,res,next)=>roles.includes(req.session.user?.role)?next():res.status(req.session.user?403:401).json({success:false,message:'Access denied'});
function ownsNotice(user,notice){return !!notice&&(user.role==='admin'||String(notice[user.role==='client'?'clientId':'lawyerId'])===user.id)}
async function noticeAccess(req,id,isCode=false){const n=await ClientNotice.findOne(isCode?{noticeId:id}:{_id:id});if(!ownsNotice(req.session.user,n))fail(404,'Notice not found');return n}
async function fileAccess(req,name){
 const user=req.session.user;const f=await File.findOne({name});
 if(f&&(f.sessionId===req.sessionID||(user&&(user.role==='admin'||f.ownerId===user.id))))return true;
 if(!user)return false;
 if(user.role==='admin')return !!f;
 const scope=user.role==='client'?{clientId:user.id}:{lawyerId:user.id};
 const notices=await ClientNotice.find(scope);const codes=notices.map(n=>n.noticeId),clients=notices.map(n=>n.clientId);
 if(notices.some(n=>[n.authorityLetter,n.supportingDocument,n.signedFile,n.proofOfDelivery].includes(name)))return true;
 if(await ClientDocument.exists({noticeId:{$in:codes},$or:[{fileName:name},{responseFiles:name}]}))return true;
 if(await ClientDefaulter.exists({clientId:{$in:user.role==='client'?[user.id]:clients},agreementFile:name}))return true;
 if(await Client.exists({_id:{$in:user.role==='client'?[user.id]:clients},authorityLetter:name}))return true;
 if(user.role==='client'&&await Lawyer.exists({_id:{$in:notices.map(n=>n.lawyerId).filter(Boolean)},signatureImage:name}))return true;
 return false;
}
async function checkFiles(req){
 const fields=['authorityLetter','supportingDocument','fileName','aadhaarFile','panFile','barIdFile','signatureImage','signedFile','proofOfDelivery','agreementFile'];
 for(const key of fields){const name=req.body[key];if(name&&(!/^[\w.-]+$/.test(name)||!await fileAccess(req,name)))fail(403,'File is not available to this account');}
 for(const name of req.body.responseFiles||[])if(!await fileAccess(req,name))fail(403,'File is not available to this account');
}
module.exports={fail,wrap,allow,ownsNotice,noticeAccess,fileAccess,checkFiles,ClientNotice,ClientDocument,ClientDefaulter,ClientNotification,Client,Lawyer};
