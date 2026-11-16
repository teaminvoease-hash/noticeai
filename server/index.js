require('dotenv').config();
// Render injects the verified HTTPS service origin; custom domains may override APP_ORIGIN.
process.env.APP_ORIGIN ||= process.env.RENDER_EXTERNAL_URL;
const mongoose=require('mongoose');const {createApp}=require('./app');
async function start(){if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required');if(process.env.NODE_ENV==='production'&&!/^https:\/\//.test(process.env.APP_ORIGIN||''))throw new Error('Production APP_ORIGIN must use HTTPS');await mongoose.connect(process.env.MONGODB_URI);const app=createApp();await Promise.all(Object.values(mongoose.models).map(model=>model.init()));const server=app.listen(Number(process.env.PORT||6001),'0.0.0.0',()=>console.log('Notice AI server is ready'));process.on('SIGTERM',()=>server.close(()=>mongoose.disconnect().then(()=>process.exit(0))))}start().catch(e=>{console.error(e.message);process.exit(1)});
