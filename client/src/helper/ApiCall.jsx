import {END_POINT} from './helper';
export async function fetchData(url,method='GET',body){
 const headers={};let data;
 if(method!=='GET'){
  const session=await fetch('/api/session',{credentials:'same-origin'}).then(r=>r.json());headers['X-CSRF-Token']=session.csrf;
  if(body instanceof FormData)data=body;else {headers['Content-Type']='application/json';data=typeof body==='string'?body:JSON.stringify(body||{});}
 }
 const response=await fetch(url,{method,headers,body:data,credentials:'same-origin'});
 const result=await response.json();
 if(response.status===401)window.dispatchEvent(new Event('session-expired'));
 return result;
}
const upload=async(file,field,url)=>{const data=new FormData();data.append(field,file);return fetchData(url,'POST',data)};
export const FileUpload=file=>upload(file,'file',END_POINT.PdfFileUpload);
export const ImageUpload=file=>upload(file,'image',END_POINT.ImageUpload);
export const MoreImageUpload=async()=>({success:false,message:'Upload one file at a time'});
export const VideoUpload=async()=>({success:false,message:'Video upload is not supported'});
