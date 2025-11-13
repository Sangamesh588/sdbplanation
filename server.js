// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const DRAFTS_FILE = path.join(DATA_DIR, 'drafts.json');

function readJSON(file){
  try{
    if(!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file,'utf8');
    return JSON.parse(raw || '[]');
  }catch(e){ console.error('readJSON error', e); return []; }
}

function writeJSON(file, arr){
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8');
}

// POST draft (non-blocking)
app.post('/api/orders/draft', (req, res) => {
  try{
    const draft = req.body || {};
    draft.id = draft.id || uuidv4();
    draft._savedAt = new Date().toISOString();
    const drafts = readJSON(DRAFTS_FILE);
    drafts.push(draft);
    writeJSON(DRAFTS_FILE, drafts);
    return res.status(201).json({ ok:true, draftId: draft.id });
  }catch(err){
    console.error(err);
    return res.status(500).json({ ok:false, error:'draft save failed' });
  }
});

// POST final order
app.post('/api/orders', (req, res) => {
  try{
    const payload = req.body || {};
    // validation: ensure items exist
    if(!Array.isArray(payload.items) || payload.items.length === 0){
      return res.status(400).json({ ok:false, error: 'no items' });
    }
    const order = {
      orderId: 'SDB-' + uuidv4().split('-')[0].toUpperCase(),
      customer: payload.customer || {},
      items: payload.items,
      subtotal: payload.subtotal || payload.items.reduce((s,i)=>s + (i.price * i.qty), 0),
      createdAt: new Date().toISOString(),
      status: 'received'
    };
    const orders = readJSON(ORDERS_FILE);
    orders.push(order);
    writeJSON(ORDERS_FILE, orders);
    return res.status(201).json({ ok:true, orderId: order.orderId });
  }catch(err){
    console.error(err);
    return res.status(500).json({ ok:false, error:'order save failed' });
  }
});

// simple list orders (for admin)
app.get('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  res.json(orders);
});

app.get('/api/drafts', (req, res) => {
  const drafts = readJSON(DRAFTS_FILE);
  res.json(drafts);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`SDB backend listening on http://localhost:${PORT}`));
