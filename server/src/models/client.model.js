const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const clientSchema = new Schema(
    {
        client_id: { type: String, unique: true, sparse: true },
        name: { type: String },
        phone: { type: String },
        address: { type: String },
        company: { type: String },
        ownerName: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        contact_person: { type: String },
        email: { type: String },
        password: { type: String },
        status: { type: String, default: "onboard" },
        authorityLetter: { type: String },
        authorityTemplate: String,
        authorityStatus: {type:String, enum:['missing','pending','approved','changes_required'],default:'missing'},
        authorityFeedback: String,
        authoritySubmittedAt: Date,
        authorityReviewedAt: Date,
        authorityReviewedBy: String,
    
        // Profile
        profile_pic: { type: String },
    },
    {
        timestamps: true,
    }
);

const Client = mongoose.model("clients", clientSchema);

module.exports = { Client };
