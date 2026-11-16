const mongoose=require('mongoose');
module.exports=mongoose.model('private_files',new mongoose.Schema({name:{type:String,unique:true},original:String,ownerId:String,sessionId:String,role:String},{timestamps:true}));
