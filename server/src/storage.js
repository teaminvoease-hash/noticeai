// Private document storage; GridFS uses the existing Mongoose connection.
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const useGridFS = () => process.env.UPLOAD_STORAGE === 'gridfs';
const directory = () => path.resolve(process.env.DATA_DIR || 'data', 'uploads');
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documents' });
function validateName(name) {
  if (!/^[-\w.]+$/.test(name)) throw Object.assign(new Error('File not found'), { status: 404 });
}
async function save(name, buffer, contentType) {
  validateName(name);
  if (useGridFS()) {
    const stream = bucket().openUploadStream(name, { metadata: { contentType } });
    await pipeline(Readable.from(buffer), stream);
    return;
  }
  await fs.mkdir(directory(), { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(directory(), name), buffer, { mode: 0o600, flag: 'wx' });
}
async function remove(name) {
  validateName(name);
  if (useGridFS()) {
    const file = await bucket().find({ filename: name }).next();
    if (file) await bucket().delete(file._id);
    return;
  }
  await fs.rm(path.join(directory(), name), { force: true });
}
async function download(name, res) {
  validateName(name);
  if (useGridFS()) {
    const file = await bucket().find({ filename: name }).next();
    if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
    res.attachment(name);
    res.type(file.metadata?.contentType || 'application/octet-stream');
    res.set('Content-Length', String(file.length));
    await pipeline(bucket().openDownloadStream(file._id), res);
    return;
  }
  res.download(path.join(directory(), name));
}
async function attachment(name, filename) {
  validateName(name);
  if (useGridFS()) {
    const file = await bucket().find({ filename: name }).next();
    if (!file) throw Object.assign(new Error('Signed document not found'), { status: 404 });
    return { filename, content: bucket().openDownloadStream(file._id), contentType: 'application/pdf' };
  }
  return { filename, path: path.join(directory(), name) };
}
async function read(name,limit=10*1024*1024){
 validateName(name);
 if(!useGridFS()){const target=path.join(directory(),name),stat=await fs.stat(target);if(!stat.isFile()||stat.size>limit)throw Object.assign(new Error('Document is too large to process'),{status:413});return fs.readFile(target)}
 const file=await bucket().find({filename:name}).next();if(!file)throw Object.assign(new Error('Document not found'),{status:404});if(file.length>limit)throw Object.assign(new Error('Document is too large to process'),{status:413});let size=0;const parts=[];for await(const part of bucket().openDownloadStream(file._id)){size+=part.length;if(size>limit)throw Object.assign(new Error('Document is too large to process'),{status:413});parts.push(part)}return Buffer.concat(parts);
}
module.exports = { save, remove, download, attachment, read };

async function info(name){
 validateName(name);
 if(useGridFS()){const file=await bucket().find({filename:name}).next();if(!file)throw Object.assign(new Error('File not found'),{status:404});return {name,size:file.length,contentType:file.metadata?.contentType||'application/octet-stream'};}
 const stat=await fs.stat(path.join(directory(),name));return {name,size:stat.size,contentType:'application/octet-stream'};
}
async function readRange(name,start,end){
 validateName(name);
 if(useGridFS()){
  const file=await bucket().find({filename:name}).next();if(!file)throw Object.assign(new Error('File not found'),{status:404});
  const chunks=[];for await(const chunk of bucket().openDownloadStream(file._id,{start,end}))chunks.push(chunk);return Buffer.concat(chunks);
 }
 const handle=await fs.open(path.join(directory(),name),'r');try{const buffer=Buffer.alloc(end-start);const {bytesRead}=await handle.read(buffer,0,buffer.length,start);return buffer.subarray(0,bytesRead)}finally{await handle.close()}
}
module.exports.info=info;module.exports.readRange=readRange;
