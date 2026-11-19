const express=require('express');
const {wrap,allow,fail,Client,checkFiles}=require('./access');
const router=express.Router();
router.use(allow('admin','client'));
router.use('/:id',wrap(async(req,res,next)=>{if(req.session.user.role==='client'&&req.params.id!==req.session.user.id)fail(404,'Account not found');next()}));
router.get('/:id',wrap(async(req,res)=>{const c=await Client.findById(req.params.id).select('name authorityLetter authorityTemplate authorityStatus authorityFeedback authoritySubmittedAt authorityReviewedAt');if(!c)fail(404,'Account not found');res.json({success:true,data:c})}));
router.post('/:id',wrap(async(req,res)=>{
 const {action,expectedFile}=req.body;const c=await Client.findById(req.params.id);if(!c)fail(404,'Account not found');
 if(['template','approve','changes'].includes(action)&&req.session.user.role!=='admin')fail(403,'Administrator review required');
 if(['template','submit'].includes(action)){
  const field=action==='template'?'authorityTemplate':'authorityLetter';const name=req.body[field];
  if(typeof name!=='string'||!name.endsWith('.pdf'))fail(400,'Upload a signed PDF or letter PDF');
  req.body={[field]:name};await checkFiles(req);
  if(action==='submit'&&name===c.authorityLetter&&['pending','approved'].includes(c.authorityStatus)){const data=c.toObject();delete data.password;return res.json({success:true,data,message:c.authorityStatus==='approved'?'This signed letter is already approved.':'This signed letter is already awaiting review.'});}
  const update=action==='template'?{authorityTemplate:name}:{authorityLetter:name,authorityStatus:'pending',authorityFeedback:'',authoritySubmittedAt:new Date(),authorityReviewedAt:null,authorityReviewedBy:''};
  const data=await Client.findOneAndUpdate({_id:c._id,updatedAt:c.updatedAt},{$set:update},{new:true}).select('-password');if(!data)fail(409,'The authority record changed. Refresh before submitting.');return res.json({success:true,data,message:action==='template'?'Letter ready for the client to download and sign.':'Signed letter saved and submitted for admin review.'});
 }
 if(!['approve','changes'].includes(action))fail(400,'Invalid action');
 if(!expectedFile||expectedFile!==c.authorityLetter)fail(409,'The signed letter changed. Refresh and review the latest file.');
 if(action==='changes'&&!String(req.body.feedback||'').trim())fail(400,'Explain which corrections are needed');
 const data=await Client.findOneAndUpdate({_id:c._id,authorityLetter:expectedFile},{$set:{authorityStatus:action==='approve'?'approved':'changes_required',authorityFeedback:String(req.body.feedback||'').trim().slice(0,2000),authorityReviewedAt:new Date(),authorityReviewedBy:req.session.user.id}},{new:true}).select('-password');
 if(!data)fail(409,'The letter changed. Refresh before reviewing.');res.json({success:true,data,message:action==='approve'?'Authority letter approved.':'Corrections requested.'});
}));
async function requireAuthority(clientId){const c=await Client.findById(clientId);if(!c?.authorityLetter||c.authorityStatus!=='approved')fail(409,'Administrator approval of the signed authority letter is required before payment.');}
module.exports=router;module.exports.requireAuthority=requireAuthority;
