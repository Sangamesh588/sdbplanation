// server.js — safe startup, saves /order to Mongo when available
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
app.use(express.static(__dirname));

// Try connect but do not crash
async function tryConnectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️ MONGO_URI not provided — running without DB. Orders will NOT be persisted to Mongo.");
    return null;
  }
  try {
    await mongoose.connect(uri, { autoIndex: true });
    console.log("✅ Connected to MongoDB Atlas");
    return mongoose;
  } catch (err) {
    console.error("❌ MongoDB connection error (continuing without DB):", err.message || err);
    return null;
  }
}
mongoose.connection.on('connected', () => {
  console.log('🔎 Mongoose connected. DB name:', mongoose.connection.name);
  console.log('🔎 Mongoose hosts:', mongoose.connection.hosts || mongoose.connection.client?.topology?.s?.options?.hosts);
});

// Simple order item schema (no _id per item)
const orderItemSchema = new mongoose.Schema({
  sku:   { type: String, required: true },
  name:  { type: String, required: true },
  qtyKg: { type: Number, required: true },
  price: { type: Number, required: true },
  img:   { type: String, default: "" }
}, { _id: false });

// Clean order schema (no __v, keeps only needed fields)
const orderSchema = new mongoose.Schema({
  customer: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    address: { type: String, required: true }
  },
  items:      { type: [orderItemSchema], required: true },
  totalKg:    { type: Number, required: true },
  totalAmount:{ type: Number, required: true },
  date:       { type: Date, default: Date.now }
}, {
  versionKey: false // removes __v
});

let Order;
try { Order = mongoose.model('Order', orderSchema); }
catch(e) { Order = mongoose.models.Order || mongoose.model('Order', orderSchema); }

// POST /order - validate + normalize + save - respond with friendly message (no DB id returned)
app.post('/order', async (req, res) => {
  try {
    const body = req.body || {};
    // Basic validation
    if (!body.customer || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order payload' });
    }

    // Normalize items: ensure numeric types
    const items = body.items.map(it => ({
      sku: String(it.sku || '').trim(),
      name: String(it.name || '').trim(),
      qtyKg: Number(it.qtyKg || 0),
      price: Number(it.price || 0),
      img: String(it.img || '')
    }));

    // compute totals (trust server-side calculation)
    const totalKg = items.reduce((s,i) => s + (Number(i.qtyKg) || 0), 0);
    const totalAmount = items.reduce((s,i) => s + ((Number(i.qtyKg) || 0) * (Number(i.price) || 0)), 0);

    const orderDoc = {
      customer: {
        name: String(body.customer.name || '').trim(),
        phone: String(body.customer.phone || '').trim(),
        address: String(body.customer.address || '').trim()
      },
      items,
      totalKg,
      totalAmount
    };

    // Save if DB connected; otherwise acknowledge but don't error
    if (mongoose.connection.readyState) {
      await new Order(orderDoc).save();
      // friendly response — do NOT return DB id
      return res.json({ success: true, message: 'Thank you — our team will contact you shortly.' });
    } else {
      console.warn('DB not connected - order not persisted');
      return res.json({ success: true, message: 'Order received (not saved — DB not connected).' });
    }
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ success: false, message: 'Server error saving order' });
  }
});

// Fallback (serve index.html)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

tryConnectMongo().finally(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
