require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');
const auth = require('./auth');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_PATH = path.join(__dirname, 'db.json');
function readDB(){ return JSON.parse(fs.readFileSync(DB_PATH)); }
function writeDB(d){ fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2)); }

const CASHRAMP_KEY = process.env.CASHRAMP_KEY || 'CASHRAMP_KEY_PLACEHOLDER';
const CASHRAMP_BASE = process.env.CASHRAMP_BASE || 'https://api.cashramp.example';
const FLUTTERWAVE_KEY = process.env.FLUTTERWAVE_KEY || 'FLUTTERWAVE_KEY_PLACEHOLDER';
const FLUTTERWAVE_BASE = process.env.FLUTTERWAVE_BASE || 'https://api.flutterwave.com';
const EXCHANGE_BASE = process.env.EXCHANGE_BASE || 'https://api.exchangerate.host';

// health
app.get('/ping', (req,res) => res.json({ ok:true, env: process.env.NODE_ENV || 'dev' }));

// auth
app.post('/auth/signup', auth.signup);
app.post('/auth/login', auth.login);
app.get('/me', auth.middleware, (req,res)=> {
  const db = readDB(); const user = db.users.find(u=>u.id===req.user.id);
  if(!user) return res.status(404).json({error:'user not found'});
  res.json({ user: { id: user.id, name: user.name, balance: user.balance } });
});

// convert and transaction endpoints (same as earlier)
app.post('/convert', async (req,res) => {
  try {
    const { from='USD', to='GHS', amount=1, markup=0.02 } = req.body;
    const q = `${EXCHANGE_BASE}/latest?base=${from}&symbols=${to}`;
    const r = await fetch(q);
    const data = await r.json();
    const rate = data.rates && data.rates[to];
    if(!rate) return res.status(400).json({ error: 'Rate not found' });
    const finalRate = rate * (1 + parseFloat(markup));
    const converted = amount * finalRate;
    res.json({ from, to, amount, rate, markup, finalRate, converted });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Conversion error' });
  }
});

app.post('/transaction', (req,res) => {
  try {
    const { type, userId='user_1', amount=0, currency='GHS' } = req.body;
    const db = readDB();
    let user = db.users.find(u => u.id === userId);
    if(!user) {
      user = { id: userId, name: 'Unknown', balance: 0, currency };
      db.users.push(user);
    }
    let fee = 0;
    if(type === 'deposit') {
      user.balance += amount;
      fee = 0;
    } else if(type === 'send') {
      fee = parseFloat((0.015 * amount).toFixed(2));
      user.balance -= (amount + fee);
    } else if(type === 'withdraw') {
      fee = parseFloat((0.01 * amount).toFixed(2));
      user.balance -= (amount + fee);
    } else {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const tx = { id: `tx_${Date.now()}`, type, userId, amount, currency, fee, time: new Date().toISOString() };
    db.transactions.unshift(tx);
    db.profits.total += fee;
    db.profits.entries.unshift({ ...tx, profit: fee });
    writeDB(db);
    res.json({ ok: true, tx, balance: user.balance, profits: db.profits });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

// placeholders and webhooks
app.post('/pay/cashramp', async (req,res) => {
  res.json({ ok:true, note: 'Cashramp integration placeholder - add calls using CASHRAMP_KEY' });
});
app.post('/pay/flutterwave', async (req,res) => {
  res.json({ ok:true, note: 'Flutterwave integration placeholder - add calls using FLUTTERWAVE_KEY' });
});
app.post('/webhook/cashramp', async (req,res) => { console.log('cashramp webhook', req.body); res.json({ ok:true }); });
app.post('/webhook/flutterwave', async (req,res) => { console.log('flutterwave webhook', req.body); res.json({ ok:true }); });

app.get('/profit', (req,res) => { const db = readDB(); res.json(db.profits); });
app.get('/_db', (req,res) => { const db = readDB(); res.json(db); });
app.post('/reset', (req,res) => {
  const seed = { users:[{id:'user_1', name:'Demo User', password:'', balance:1000, currency:'GHS'}], transactions:[], profits:{ total:0, entries:[] } };
  writeDB(seed); res.json({ ok:true, seed });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`CrossPay server listening on ${PORT}`));
