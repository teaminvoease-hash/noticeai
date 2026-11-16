const{test,before,after}=require('node:test');const assert=require('node:assert/strict');const request=require('supertest');const mongoose=require('mongoose'),bcrypt=require('bcryptjs'),fs=require('fs'),os=require('os'),path=require('path');const{MongoMemoryReplSet}=require('mongodb-memory-server');
let mongo,app,admin,client,other,lawyer,adminUser,clientUser,lawyerUser,otherLawyerUser;let temp;
async function call(agent,method,url,body){const s=await agent.get('/api/session');return agent[method](url).set('X-CSRF-Token',s.body.csrf).send(body||{})}
before(async()=>{process.env.SESSION_SECRET='integration-test-secret-with-at-least-32-characters';process.env.APP_ORIGIN='http://localhost:6001';process.env.PAYU_KEY='test-key';process.env.PAYU_SALT='test-salt';temp=fs.mkdtempSync(path.join(os.tmpdir(),'noticeai-'));process.env.DATA_DIR=temp;if(process.env.TEST_MONGODB_URI){process.env.MONGODB_URI=process.env.TEST_MONGODB_URI;}else{mongo=await MongoMemoryReplSet.create({replSet:{count:1},binary:{version:'7.0.24',downloadDir:path.resolve('.cache/mongodb')}});process.env.MONGODB_URI=mongo.getUri();}await mongoose.connect(process.env.MONGODB_URI);await mongoose.connection.dropDatabase();const{createApp}=require('../server/app');app=createApp({sessionStore:new(require('express-session').MemoryStore)()});await Promise.all(Object.values(mongoose.models).map(m=>m.init()));admin=request.agent(app);client=request.agent(app);other=request.agent(app);lawyer=request.agent(app);const{Admin}=require('../server/src/models/admin.model');const{Lawyer}=require('../server/src/models/lawyer.model');const password=await bcrypt.hash('Testing-password-123',10);adminUser=await Admin.create({name:'Administrator',email:'admin@example.test',password});lawyerUser=await Lawyer.create({name:'Assigned Lawyer',email:'lawyer@example.test',password,status:'active'});otherLawyerUser=await Lawyer.create({name:'Other Lawyer',email:'lawyer2@example.test',password,status:'active'});for(const [a,role,email]of[[admin,'admin','admin@example.test'],[lawyer,'lawyer','lawyer@example.test']]){const r=await call(a,'post','/api/auth/'+role+'/login',{email,password:'Testing-password-123'});assert.equal(r.body.success,true)}for(const [a,email]of[[client,'client@example.test'],[other,'other@example.test']]){const r=await call(a,'post','/api/auth/client/signup',{name:'Example Client',email,password:'Testing-password-123',phone:'9999999999'});assert.equal(r.body.success,true);if(a===client)clientUser=r.body.data;}});
after(async()=>{await mongoose.disconnect();if(mongo)await mongo.stop();if(temp)fs.rmSync(temp,{recursive:true,force:true})});
test('server-side auth, session rotation, role guards and CSRF',async()=>{assert.equal((await request(app).get('/api/get-client')).status,401);assert.equal((await client.get('/api/get-client')).status,403);assert.equal((await client.post('/api/logout')).status,403);const session=(await client.get('/api/session')).body;assert.equal(session.user.role,'client');assert.equal(session.user.password,undefined);assert.equal((await call(other,'post','/api/auth/admin/signup',{name:'Intruder',email:'intruder@example.test',password:'Testing-password-123'})).status,403)});
test('full client intake, payment verification, assignment and document ownership',async()=>{
 const s=await client.get('/api/session');const upload=await client.post('/api/file-upload').set('X-CSRF-Token',s.body.csrf).attach('file',Buffer.from('%PDF-1.7\n%%EOF'),{filename:'authority.pdf',contentType:'application/pdf'});assert.equal(upload.body.success,true,JSON.stringify(upload.body));const name=upload.body.fileName;
 assert.equal((await other.get('/uploads/'+name)).status,404);
 const authorityUrl='/api/authority/'+clientUser._id;
 assert.equal((await other.get(authorityUrl)).status,404);
 assert.equal((await call(client,'post',authorityUrl,{action:'approve',expectedFile:name})).status,403);
 assert.equal((await call(client,'post',authorityUrl,{action:'submit',authorityLetter:name})).body.data.authorityStatus,'pending');
 assert.equal((await client.get(authorityUrl)).body.data.authorityLetter,name);
 const tSession=await admin.get('/api/session');const template=await admin.post('/api/file-upload').set('X-CSRF-Token',tSession.body.csrf).attach('file',Buffer.from('%PDF-1.7\n%%EOF'),{filename:'letter-to-sign.pdf',contentType:'application/pdf'});
 assert.equal((await call(admin,'post',authorityUrl,{action:'template',authorityTemplate:template.body.fileName})).body.success,true);
 assert.equal((await client.get('/uploads/'+template.body.fileName)).status,200);
 assert.equal((await other.get('/uploads/'+template.body.fileName)).status,404);
 assert.equal((await call(admin,'post',authorityUrl,{action:'approve',expectedFile:'old.pdf'})).status,409);
 assert.equal((await call(admin,'post',authorityUrl,{action:'changes',expectedFile:name})).status,400);
 assert.equal((await call(admin,'post',authorityUrl,{action:'changes',expectedFile:name,feedback:'Please sign page 2.'})).body.data.authorityStatus,'changes_required');
 assert.equal((await call(client,'post',authorityUrl,{action:'submit',authorityLetter:name})).body.data.authorityStatus,'pending');

 const d=await call(client,'post','/api/client-portal/defaulters',{name:'Recipient',email:'recipient@example.test',phone:'9999999999',companyName:'Recipient Ltd',address:'Sample Address',totalDueAmount:1000,lastInvoiceDate:'2026-01-01'});assert.equal(d.body.success,true,JSON.stringify(d.body));
 const n=await call(client,'post','/api/client-portal/notices',{subject:'Invoice demand',category:'Invoice',defaulterId:d.body.data._id,caseSummary:'Invoice remains unpaid after the agreed date.'});assert.equal(n.body.success,true,JSON.stringify(n.body));const id=n.body.data._id,code=n.body.data.noticeId;
 assert.equal((await other.get('/api/client-portal/notices')).body.data.length,0);
 assert.equal((await call(other,'put','/api/client-portal/notices/'+id,{clientId:clientUser._id})).status,403);
 assert.equal((await other.get('/api/client-portal/workflow')).body.data.length,0);
 assert.equal((await client.get('/api/client-portal/workflow')).body.data[0].workflow.owner,'admin');
 const pricing=await call(admin,'post','/api/create-admin-payment',{paymentScope:'global',totalAmount:1000,platformFee:200,advocateFee:800,status:'verified'});assert.equal(pricing.body.success,true);
 assert.equal((await call(client,'post','/api/payu/initiate',{noticeId:code})).status,409);
 assert.equal((await call(client,'post','/api/client-portal/payments',{noticeId:code,method:'Bank Transfer',amount:1000})).status,409);
 assert.equal((await call(admin,'post',authorityUrl,{action:'approve',expectedFile:name})).body.data.authorityStatus,'approved');
 assert.equal((await call(client,'post','/api/client-portal/profile/'+clientUser._id,{name:'Updated name',authorityLetter:name})).body.success,true);
 assert.equal((await client.get(authorityUrl)).body.data.authorityStatus,'approved');
 const payment=await call(client,'post','/api/payu/initiate',{noticeId:code});assert.equal(payment.body.success,true,JSON.stringify(payment.body));const data=payment.body.data;
 assert.equal((await call(other,'post','/api/payu/initiate',{noticeId:code})).status,404);
 const callback={...data,status:'success'};callback.hash=require('../server/src/payments').responseHash(callback,'test-salt','test-key');
 assert.equal((await request(app).post('/api/payu/success').send({...callback,amount:'0.01'})).status,400);
 assert.equal((await request(app).post('/api/payu/success').send(callback)).status,302);assert.equal((await request(app).post('/api/payu/success').send(callback)).status,302);
 const assignment=await call(admin,'post','/api/client-portal/notices/'+id+'/assign-lawyer',{lawyerId:lawyerUser.id});assert.equal(assignment.body.success,true,JSON.stringify(assignment.body));
 assert.equal((await lawyer.get('/api/client-portal/notices')).body.data.length,1);
 assert.equal((await lawyer.get('/api/client-portal/workflow')).body.data[0].workflow.step,3);
 const reopenedApp=require('../server/app').createApp({sessionStore:new(require('express-session').MemoryStore)()});
 const resumedLawyer=request.agent(reopenedApp);await call(resumedLawyer,'post','/api/auth/lawyer/login',{email:'lawyer@example.test',password:'Testing-password-123'});
 const download=await resumedLawyer.get('/uploads/'+name);assert.equal(download.status,200);assert.equal(download.headers['content-type'],'application/pdf');
 assert.equal(download.body.toString(),'%PDF-1.7\n%%EOF');
 const attachment=await require('../server/src/storage').attachment(name,'signed.pdf');assert.equal(attachment.filename,'signed.pdf');
 if(attachment.content){const chunks=[];for await(const part of attachment.content)chunks.push(part);assert.equal(Buffer.concat(chunks).toString(),'%PDF-1.7\n%%EOF');}
 
 const secondLawyer=request.agent(app);await call(secondLawyer,'post','/api/auth/lawyer/login',{email:'lawyer2@example.test',password:'Testing-password-123'});assert.equal((await secondLawyer.get('/api/client-portal/notices')).body.data.length,0);assert.equal((await secondLawyer.get('/uploads/'+name)).status,404);
 const edit=await call(lawyer,'post','/api/client-portal/notices/'+id+'/generated-notice',{generatedNotice:'<p>Reviewed draft</p><script>alert(1)</script>'});assert.equal(edit.body.success,true);assert.ok(!edit.body.data.generatedNotice.includes('<script>'));
 assert.equal((await call(lawyer,'post','/api/client-portal/notices/'+id+'/status',{status:'approved'})).body.success,true);
 const signSession=await lawyer.get('/api/session');const signed=await lawyer.post('/api/file-upload').set('X-CSRF-Token',signSession.body.csrf).attach('file',Buffer.from('%PDF-1.7\n%%EOF'),{filename:'signed.pdf',contentType:'application/pdf'});
 assert.equal((await call(lawyer,'post','/api/client-portal/notices/'+id+'/signed-file',{signedFile:signed.body.fileName})).body.success,true);
 assert.equal((await client.get('/api/client-portal/downloads')).body.data.length,1);
 assert.equal((await call(lawyer,'post','/api/client-portal/notices/'+id+'/generated-notice',{generatedNotice:'Changed after signing'})).status,409);
 assert.equal((await call(admin,'post','/api/client-portal/notices/'+id+'/status',{status:'pending'})).status,409);
 assert.equal((await call(admin,'post','/api/client-portal/notices/'+id+'/assign-lawyer',{lawyerId:otherLawyerUser.id})).status,409);
 assert.equal((await call(admin,'post','/api/client-portal/notices/'+id+'/delivery',{deliveryStatus:'In Transit'})).status,400);

 assert.equal((await call(client,'post','/api/client-portal/notices/'+id+'/delivery',{deliveryStatus:'Delivered'})).status,403);
 assert.equal((await call(admin,'post','/api/client-portal/notices/'+id+'/delivery',{courier:'Recorded carrier',trackingId:'REAL-REF',deliveryStatus:'In Transit',dispatchDate:'2026-11-16'})).body.success,true);
 assert.equal((await client.get('/api/client-portal/delivery-tracking')).body.data[0].trackingId,'REAL-REF');
 assert.equal((await client.get('/api/client-portal/workflow')).body.data[0].workflow.label,'In transit — update delivery');
});
test('wallet reservation blocks overspending and duplicate processing',async()=>{const credit=await call(admin,'post','/api/wallet/credit',{lawyerId:lawyerUser.id,amount:500,note:'Verified fee reference'});assert.equal(credit.body.success,true);const withdrawal=await call(lawyer,'post','/api/create-admin-withdrawal',{amount:400,bankAccount:'1234567890',ifsc:'TEST0000001',status:'approved'});assert.equal(withdrawal.body.data.status,'pending');assert.equal((await call(lawyer,'post','/api/create-admin-withdrawal',{amount:200,bankAccount:'123',ifsc:'TEST'})).status,409);const id=withdrawal.body.data._id;assert.equal((await call(admin,'post','/api/update-admin-withdrawal/'+id,{status:'rejected'})).body.success,true);assert.equal((await call(admin,'post','/api/update-admin-withdrawal/'+id,{status:'rejected'})).status,409);assert.equal((await lawyer.get('/api/wallet')).body.data.balance,500)});
test('logout destroys the session',async()=>{assert.equal((await call(other,'post','/api/logout')).body.success,true);assert.equal((await other.get('/api/client-portal/notices')).status,401)});
