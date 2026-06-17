const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://ishagroup2009_db_user:EBG5h3N0tWnbXYcg@cluster0.qtdsqei.mongodb.net/?appName=Cluster0");

        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.log("DB Error:", error);
    }
};

module.exports = connectDB;