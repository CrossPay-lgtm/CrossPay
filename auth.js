const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const DB_PATH = path.join(__dirname, 'db.json');
function readDB(){ return JSON.parse(fs.readFileSync(DB_PATH)); }
function writeDB(d){ fs.writeFileSync(DB_PATH, JSON.stringify(d, null,2)); }

const JWT_SECRET = process.env.JWT_SECRET || 'crosspay_dev_secret';

module.exports = {
  signup: async (req, res) => {
    try{
      const { name, password } = req.body;
      if(!name || !password) return res.status(400).json({error:'name+password required'});
      const db = readDB();
      if(db.users.find(u=>u.name===name)) return res.status(400).json({error:'user exists'});
      const hash = await bcrypt.hash(password, 10);
      const user = { id: `user_${Date.now()}`, name, password: hash, balance: 0, currency: 'GHS' };
      db.users.push(user); writeDB(db);
      const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ ok:true, token, user: { id: user.id, name:user.name, balance: user.balance } });
    }catch(err){ console.error(err); res.status(500).json({error:'signup failed'}); }
  },
  login: async (req, res) => {
    try{
      const { name, password } = req.body; if(!name || !password) return res.status(400).json({error:'name+password required'});
      const db = readDB(); const user = db.users.find(u=>u.name===name);
      if(!user) return res.status(400).json({error:'user not found'});
      const ok = await bcrypt.compare(password, user.password);
      if(!ok) return res.status(400).json({error:'invalid password'});
      const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ ok:true, token, user: { id: user.id, name: user.name, balance: user.balance } });
    }catch(err){ console.error(err); res.status(500).json({error:'login failed'}); }
  },
  middleware: (req, res, next) => {
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({error:'no token'});
    const token = auth.split(' ')[1];
    try{ const payload = jwt.verify(token, JWT_SECRET); req.user = payload; return next(); }
    catch(e){ return res.status(401).json({error:'invalid token'}); }
  }
};
