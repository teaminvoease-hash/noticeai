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
const upload=async(file,field,url)=>{
 if(file?.size>3*1024*1024){
  if(file.size>10*1024*1024)return {success:false,message:'Choose one document up to 10 MB'};
  const start=await fetchData('/api/file-transfers','POST',{filename:file.name,size:file.size});
  if(!start.success)return start;
  const {id,partBytes}=start.data;
  for(let offset=0,index=0;offset<file.size;offset+=partBytes,index++){
   const bytes=new Uint8Array(await file.slice(offset,offset+partBytes).arrayBuffer());
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   const part=await fetchData('/api/file-transfers/'+id+'/'+index,'PUT',{data:btoa(binary)});
   if(!part.success)return part;
  }
  return fetchData('/api/file-transfers/'+id+'/complete','POST',{});
 }
 const data=new FormData();data.append(field,file);return fetchData(url,'POST',data)
};
export const FileUpload=file=>upload(file,'file',END_POINT.PdfFileUpload);
export const ImageUpload=file=>upload(file,'image',END_POINT.ImageUpload);
export const MoreImageUpload=async()=>({success:false,message:'Upload one file at a time'});
export const VideoUpload=async()=>({success:false,message:'Video upload is not supported'});
