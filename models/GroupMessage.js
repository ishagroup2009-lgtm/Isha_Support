const mongoose = require("mongoose");

const GroupMessageSchema = new mongoose.Schema(
    {
        groupId: {
            type: String,
            required: true,
        },
        senderId: {
            type: String,
            required: true,
        },
        senderName: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        messageType: {
            type: String,
            default: "text", // text,image,file,voice
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "GroupMessage",
    GroupMessageSchema
);