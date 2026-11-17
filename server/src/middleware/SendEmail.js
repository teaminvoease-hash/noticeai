const nodemailer=require('nodemailer');
const transport=()=>{
 if(process.env.APP_ENV==='staging'&&process.env.STAGING_ALLOW_EXTERNAL_DELIVERY!=='true')throw Object.assign(new Error('Outbound email is disabled in staging'),{status:503});
 if(!process.env.SMTP_HOST||!process.env.SMTP_FROM) throw Object.assign(new Error('Email service is not configured'),{status:503});
 return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_PORT==='465',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined});
};
exports.EmailSendHnaldre=async(to,subject,text,attachments=[])=>{if(!to)throw new Error('Notification recipient is not configured');return transport().sendMail({from:process.env.SMTP_FROM,to,subject,text,attachments})};
exports.EmailSendHnaldreHtml=async(to,subject,html)=>transport().sendMail({from:process.env.SMTP_FROM,to,subject,html});
