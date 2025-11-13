import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (index.html, script.js, images, etc.)
app.use(express.static(__dirname));

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Schema & Model
const inquirySchema = new mongoose.Schema({
  name: String,
  business_name: String,
  phone: String,
  city: String,
  address: String,
  variety: String,
  quantity_kg: String,
  message: String,
  consent: Boolean,
  date: { type: Date, default: Date.now },
});

const Inquiry = mongoose.model("Inquiry", inquirySchema);

// ✅ Route to handle form submissions
app.post("/submit", async (req, res) => {
  console.log("📩 Incoming form data:", req.body);
  try {
    const newInquiry = new Inquiry(req.body);
    await newInquiry.save();
    console.log("✅ Inquiry saved successfully");
    res.json({ success: true, message: "Inquiry saved successfully" });
  } catch (error) {
    console.error("❌ Error saving inquiry:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Fallback route for SPA / HTML
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
