


// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const cors = require("cors");
// const admin = require("firebase-admin");

// // 🔑 Firebase config
// const serviceAccount = require("./serviceAccountKey.json");

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
// });

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: {
//         origin: "*",
//     },
// });

// // 🧠 Online users map (optional now)
// const onlineUsers = new Map();

// // 🔥 FCM SEND FUNCTION
// async function sendFCM(token, title, body, data = {}) {
//     try {
//         await admin.messaging().send({
//             token: token,
//             notification: {
//                 title: title,
//                 body: body,
//             },
//             data: data, // 👈 important for navigation
//         });

//         console.log("📲 FCM SENT");
//     } catch (err) {
//         console.log("❌ FCM ERROR:", err.message);
//     }
// }

// io.on("connection", (socket) => {
//     console.log("🟢 User connected:", socket.id);

//     // ✅ JOIN
//     socket.on("join", (userId) => {
//         onlineUsers.set(userId, socket.id);
//         console.log("👤 Joined:", userId);
//     });

//     // 💬 MESSAGE → ALWAYS FCM
//     socket.on("sendMessage", async ({ senderId, receiverId, message, fcmToken }) => {

//         console.log("💬 Message:", senderId, "→", receiverId);

//         await sendFCM(
//             fcmToken,
//             "New Message 💬",
//             message,
//             {
//                 type: "chat",
//                 senderId: String(senderId),
//             }
//         );
//     });

//     // 📞 CALL → ALWAYS FCM
//     socket.on("callUser", async ({ callerId, receiverId, fcmToken, callerFcmToken }) => {

//         console.log("📞 Call:", callerId, "→", receiverId);

//         await sendFCM(
//             fcmToken,
//             "Incoming Call 📞",
//             "Tap to answer",
//             {
//                 type: "call",
//                 callerId: String(callerId),
//                 callerToken: callerFcmToken
//             }
//         );
//     });

//     // (Optional logs only)
//     socket.on("acceptCall", async ({ callerId, fcmToken }) => {
//         console.log("🔥 ACCEPT EVENT HIT");
//         console.log("🔥 TOKEN:", fcmToken);

//         if (!fcmToken) {
//             console.log("❌ TOKEN MISSING");
//             return;
//         }

//         await sendFCM(
//             fcmToken,
//             "Call Accepted ✅",
//             "Your call was accepted",
//             {
//                 type: "callAccepted",
//                 callerId: String(callerId),
//             }
//         );
//     });
//     socket.on("rejectCall", async ({ callerId, fcmToken }) => {
//         console.log("❌ Call rejected by receiver for:", callerId);

//         await sendFCM(
//             fcmToken,
//             "Call Rejected ❌",
//             "Your call was rejected",
//             {
//                 type: "callRejected",
//                 callerId: String(callerId),
//             }
//         );
//     });

//     socket.on("disconnect", () => {
//         console.log("🔴 User disconnected:", socket.id);
//     });
// });

// server.listen(5000, () => {
//     console.log("🚀 Server running on port 5000");
// });





const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");
const mongoose = require("mongoose");
const GroupMessage = require("./models/GroupMessage");

// 🔑 Firebase config
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

const {
    RtcTokenBuilder,
    RtcRole,
} = require("agora-token");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const connectDB = require("./db");


const app = express();
app.use(cors());
app.use(express.json());
connectDB();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// 🧠 Online users map (optional now)
const onlineUsers = new Map();

// 🔥 FCM SEND FUNCTION
// async function sendFCM(token, title, body, data = {}) {
//     try {
//         await admin.messaging().send({
//             token: token,
//             notification: {
//                 title: title,
//                 body: body,
//             },
//             data: data, // 👈 important for navigation
//         });

//         console.log("📲 FCM SENT");
//     } catch (err) {
//         console.log("❌ FCM ERROR:", err.message);
//     }
// }

// app.get(
//     "/group-messages/:groupId",
//     async (req, res) => {

//         try {

//             const messages =
//                 await GroupMessage.find({
//                     groupId: req.params.groupId
//                 }).sort({
//                     createdAt: 1
//                 });

//             res.json({
//                 status: true,
//                 data: messages
//             });

//         } catch (error) {

//             res.status(500).json({
//                 status: false,
//                 message: error.message
//             });

//         }
//     }
// );

app.get(
    "/group-messages/:groupId",
    async (req, res) => {
        try {

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const skip = (page - 1) * limit;

            const messages = await GroupMessage.find({
                groupId: req.params.groupId
            })
                .sort({ createdAt: -1 }) // latest first
                .skip(skip)
                .limit(limit);

            const totalMessages =
                await GroupMessage.countDocuments({
                    groupId: req.params.groupId
                });

            res.json({
                status: true,
                data: messages,
                page,
                totalMessages,
                hasMore:
                    skip + messages.length <
                    totalMessages,
            });

        } catch (error) {

            res.status(500).json({
                status: false,
                message: error.message
            });

        }
    }
);

app.post(
    "/generate-agora-token",

    async (req, res) => {

        try {

            const { channelName, uid } = req.body;

            // 👇 agora credentials
            const appId =
                "5585e4187e7c42a38f304f4c1bfae791";

            const appCertificate =
                "dd5d6d53050743c0bb675621453d9d7f";

            const role =
                RtcRole.PUBLISHER;

            // 👇 token expiry
            const expirationTimeInSeconds =
                3600;

            const currentTimestamp =
                Math.floor(Date.now() / 1000);

            const privilegeExpiredTs =
                currentTimestamp +
                expirationTimeInSeconds;

            // 👇 token generate
            const token =
                RtcTokenBuilder.buildTokenWithUid(
                    appId,
                    appCertificate,
                    channelName,
                    Number(uid),
                    role,
                    privilegeExpiredTs
                );

            res.json({
                status: true,
                token,
                channelName,
                uid,
            });

        } catch (error) {

            console.log(
                "AGORA TOKEN ERROR",
                error
            );

            res.status(500).json({
                status: false,
                message: error.message,
            });

        }

    }
);



async function sendFCM(token, title, body, data = {}) {
    try {
        await admin.messaging().send({
            token: token,

            // 🔥 VERY IMPORTANT (kill mode ke liye)
            android: {
                priority: "high",
            },

            // ❌ notification hata diya
            // ✅ sirf data bhejna hai
            data: {
                title: title,
                body: body,
                ...data,
            },
        });

        console.log("📲 FCM SENT");
    } catch (err) {
        console.log("❌ FCM ERROR:", err.message);
    }
}


io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // ✅ JOIN
    socket.on("join", (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log("👤 Joined:", userId);
    });

    // 💬 MESSAGE → ALWAYS FCM
    socket.on("sendMessage", async ({ senderId, receiverId, message, fcmToken }) => {

        console.log("💬 Message:", senderId, "→", receiverId);

        await sendFCM(
            fcmToken,
            "New Message 💬",
            message,
            {
                type: "chat",
                senderId: String(senderId),
            }
        );
    });

    // 📞 CALL → ALWAYS FCM
    socket.on("callUser", async ({ callerId, receiverId, fcmToken, callerFcmToken, callername, channelName }) => {

        console.log("📞 Call:", callerId, "→", receiverId);

        await sendFCM(
            fcmToken,
            "📞 Incoming Call",
            `${callername} is calling you...`,
            {
                type: "call",
                callerId: String(callerId),
                callerToken: callerFcmToken,
                callername: callername,
                channelName: channelName
            }
        );
    });

    // (Optional logs only)
    socket.on("acceptCall", async ({ callerId, fcmToken }) => {
        console.log("🔥 ACCEPT EVENT HIT");
        console.log("🔥 TOKEN:", fcmToken);

        if (!fcmToken) {
            console.log("❌ TOKEN MISSING");
            return;
        }

        await sendFCM(
            fcmToken,
            "Call Accepted ✅",
            "Your call was accepted",
            {
                type: "callAccepted",
                callerId: String(callerId),
                callerToken: fcmToken
            }
        );
    });
    socket.on("rejectCall", async ({ callerId, fcmToken }) => {
        console.log("❌ Call rejected by receiver for:", callerId);

        await sendFCM(
            fcmToken,
            "Call Rejected ❌",
            "Your call was rejected",
            {
                type: "callRejected",
                callerId: String(callerId),
            }
        );
    });

    socket.on("endCall", async ({ callerId, fcmToken }) => {
        console.log("📴 Call ended by:", callerId);

        if (!fcmToken) {
            console.log("❌ TOKEN MISSING");
            return;
        }

        await sendFCM(
            fcmToken,
            "Call Ended 📴",
            "Call has been ended",
            {
                type: "callEnded",
                callerId: String(callerId),
            }
        );
    });

    //Video Call Events

    socket.on("videoCallUser", async ({ callerId, receiverId, fcmToken, callerFcmToken, callername, channelName }) => {

        console.log("🎥 Video Call:", callerId, "→", receiverId);

        await sendFCM(
            fcmToken,
            "🎥 Incoming Video Call",
            `${callername} is video calling you...`,
            {
                type: "videoCall",
                callerId: String(callerId),
                callerToken: callerFcmToken,
                callername: callername,
                channelName: channelName
            }
        );
    });

    socket.on("acceptVideoCall", async ({ callerId, fcmToken }) => {

        console.log("🎥 Video Call Accepted:", callerId);

        if (!fcmToken) return;

        await sendFCM(
            fcmToken,
            "Video Call Accepted ✅",
            "Your video call was accepted",
            {
                type: "videoCallAccepted",
                callerId: String(callerId),
                callerToken: fcmToken
            }
        );
    });

    socket.on("rejectVideoCall", async ({ callerId, fcmToken }) => {

        console.log("❌ Video Call Rejected:", callerId);

        await sendFCM(
            fcmToken,
            "Video Call Rejected ❌",
            "Your video call was rejected",
            {
                type: "videoCallRejected",
                callerId: String(callerId),
            }
        );
    });

    socket.on("endVideoCall", async ({ callerId, fcmToken }) => {

        console.log("📴 Video Call Ended:", callerId);

        if (!fcmToken) return;

        await sendFCM(
            fcmToken,
            "Video Call Ended 📴",
            "Video call has been ended",
            {
                type: "videoCallEnded",
                callerId: String(callerId),
            }
        );
    });


    //Group Messages 

    socket.on("joinGroup", ({ groupId, userId }) => {
        socket.join(`group_${groupId}`);

        console.log(
            `👥 User ${userId} joined group ${groupId}`
        );
    });


    //     "sendGroupMessage",
    //     async ({
    //         groupId,
    //         senderId,
    //         senderName,
    //         message
    //     }) => {

    //         console.log(
    //             `💬 Group ${groupId}: ${senderName}`
    //         );

    //         io.to(`group_${groupId}`).emit(
    //             "receiveGroupMessage",
    //             {
    //                 groupId,
    //                 senderId,
    //                 senderName,
    //                 message,
    //                 createdAt: new Date()
    //             }
    //         );
    //     }
    // );



    socket.on(
        "sendGroupMessage",
        async (data) => {

            console.log("================================");
            console.log("GROUP DATA RECEIVED");
            console.log("groupId:", data.groupId);
            console.log("senderId:", data.senderId);
            console.log("senderName:", data.senderName);
            console.log("message:", data.message);
            console.log("FULL DATA:", JSON.stringify(data));
            console.log("================================");

            try {

                const savedMessage =
                    await GroupMessage.create({
                        groupId: data.groupId,
                        senderId: data.senderId,
                        senderName: data.senderName,
                        message: data.message,
                        messageType: "text"
                    });

                console.log(
                    "✅ GROUP MESSAGE SAVED:",
                    savedMessage._id
                );

                io.to(`group_${data.groupId}`).emit(
                    "receiveGroupMessage",
                    savedMessage
                );

            } catch (error) {

                console.log("❌ GROUP SAVE ERROR");
                console.log(error);

            }
        }
    );


    socket.on("leaveGroup", ({ groupId, userId }) => {

        socket.leave(`group_${groupId}`);

        console.log(
            `🚪 User ${userId} left group ${groupId}`
        );
    });








    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});