


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

// 🔑 Firebase config
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// 🧠 Online users map (optional now)
const onlineUsers = new Map();

// 🔥 FCM SEND FUNCTION
async function sendFCM(token, title, body, data = {}) {
    try {
        await admin.messaging().send({
            token: token,
            notification: {
                title: title,
                body: body,
            },
            data: data, // 👈 important for navigation
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
    socket.on("callUser", async ({ callerId, receiverId, fcmToken, callerFcmToken }) => {

        console.log("📞 Call:", callerId, "→", receiverId);

        await sendFCM(
            fcmToken,
            "Incoming Call 📞",
            "Tap to answer",
            {
                type: "call",
                callerId: String(callerId),
                callerToken: callerFcmToken
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

    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});