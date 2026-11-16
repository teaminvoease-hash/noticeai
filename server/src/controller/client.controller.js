const { Client } = require("../models/client.model");
const { EmailSendHnaldre } = require("../middleware/SendEmail");

const bcrypt = require("bcryptjs");


const generateUniqueClientId = async () => {
    let clientId = "";
    let exists = true;
    while (exists) {
        const random = Math.floor(1000 + Math.random() * 9000);
        clientId = `CLT-${random}`;
        const found = await Client.findOne({ client_id: clientId }).select("_id");
        exists = Boolean(found);
    }
    return clientId;
};


// about banner
const GetClient = async (req, res, next) => {
    try {
        let Data = await Client.find().sort({ createdAt: -1 });

        // Backfill client_id for older records.
        for (const item of Data) {
            if (!item.client_id) {
                item.client_id = await generateUniqueClientId();
                await item.save();
            }
        }

        res.status(200).json({
            success: true,
            data: Data,
        });
    } catch (err) {
        res.status(400).json("Error: " + err);
    }
};
// Delete 
const DeleteClient = async (req, res, next) => {
    try {
        var Data = await Client.findOneAndDelete({ _id: req.params.id });

        res.status(200).json({
            success: true,
            data: Data,
        });
    } catch (err) {
        res.status(400).json("Error: " + err);
    }
};


const GetClientByid = async (req, res, next) => {
    try {
        const Data = await Client.findOne({ _id: req.params.id });
        res.status(200).json({
            success: true,
            data: Data,
        });
    } catch (err) {
        res.status(400).json("Error: " + err);
    }
};

const UpdateClient = async (req, res, next) => {
    try {
        var Data = await Client.findOne({ _id: req.params.id });

        // Only update password if a new one is provided, otherwise keep existing
        let updateData = {
            client_id: req.body.client_id,
            client_name: req.body.client_name,
            company_name: req.body.company_name,
            primary_phone: req.body.primary_phone,
            secondary_phone: req.body.secondary_phone,
            lead: req.body.lead,
            location: req.body.location,
            amount: req.body.amount,
            contact_person: req.body.contact_person,
            address: req.body.address,
            date: req.body.date,
            email: req.body.email,
            status: req.body.status,
            // New fields
            contact_number: req.body.contact_number,
            lead_source: req.body.lead_source,
            gst_number: req.body.gst_number,
            profile_pic: req.body.profile_pic,
        };

        // Only update file fields if new data is provided
        if (req.body.client_agreement_file) {
            updateData.client_agreement_file = req.body.client_agreement_file;
            updateData.client_agreement_filename = req.body.client_agreement_filename;
        }

        // Only update password if provided
        if (req.body.password && req.body.password.trim() !== "") {
            const hash = bcrypt.hashSync(req.body.password, 12);
            updateData.password = hash;
        }

        if (Data != undefined) {

            const UpdatedData = await Client.findOneAndUpdate(
                { _id: req.params.id },
                updateData,
                { new: true }
            );
            res.status(200).json({
                success: true,
                message: "New Client has been updated",
                data: UpdatedData,
            });
        } else {
            res.status(200).json({
                success: false,
                message: " Defaulter not found",
            });
        }
    } catch (err) {
        res.status(400).json("Error: " + err);
    }
};



const RegisterClient = async (req, res) => {
    try {
        const UserCheck = await Client.findOne({ email: req.body.email });


        if (UserCheck == undefined) {
            const hash = bcrypt.hashSync(req.body.password, 12);
            const clientId = await generateUniqueClientId();

            const userObj = new Client({
                client_id: clientId,
                email: req.body.email,
                name: req.body.name,
                phone: req.body.phone || "",
                address: req.body.address || "",
                company: req.body.company || "",
                ownerName: req.body.ownerName || "",
                password: hash,
                status: "onboard",
            });

            await userObj.save();


            res.status(200).json({
                success: true,
                message: "Client has been registered successfully",
                data: userObj,
            });
        } else {
            res.status(200).json({
                success: false,
                message: "Client already registered with this email",
            });
        }
    } catch (err) {
        res.status(400).json("Error: " + err);
    }
};

const UpdateClientBasic = async (req, res, next) => {
    try {
        const existing = await Client.findOne({ _id: req.params.id });
        if (!existing) {
            return res.status(200).json({
                success: false,
                message: "Client not found",
            });
        }

        const updateData = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address || "",
            company: req.body.company || "",
            ownerName: req.body.ownerName || "",
        };

        if (req.body.status) {
            const normalized = String(req.body.status).toLowerCase();
            if (!["onboard", "verified", "inactive"].includes(normalized)) {
                return res.status(200).json({
                    success: false,
                    message: "Allowed statuses are onboard, verified, inactive",
                });
            }
            updateData.status = normalized;
        }

        if (req.body.password && String(req.body.password).trim()) {
            updateData.password = bcrypt.hashSync(String(req.body.password).trim(), 10);
        }

        const updated = await Client.findOneAndUpdate(
            { _id: req.params.id },
            updateData,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Client updated successfully",
            data: updated,
        });
    } catch (err) {
        return res.status(400).json("Error: " + err);
    }
};

const UpdateClientStatus = async (req, res, next) => {
    try {
        const allowed = ["onboard", "verified", "inactive"];
        const nextStatus = String(req.body.status || "").toLowerCase();
        if (!allowed.includes(nextStatus)) {
            return res.status(200).json({
                success: false,
                message: "Allowed statuses are onboard, verified, inactive",
            });
        }

        const Newabout = {
            status: nextStatus,
        };
        const DataLast = await Client.findOneAndUpdate(
            { _id: req.params.id },
            Newabout,
            { new: true }
        );
        res.status(200).json({
            success: true,
            message: "Client Status has been updated",
            data: DataLast,
        });
    } catch (err) {
        res.status(400).json("Error: " + err);
    }
};



module.exports = {
    GetClient,
    DeleteClient,
    GetClientByid,
    UpdateClient,
    UpdateClientBasic,
    RegisterClient,
    UpdateClientStatus,
};
