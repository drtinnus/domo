'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');

// Config lives in the DSM package var folder when installed as .spk
const cfgPath = process.env.DOMO_CONFIG ||
  (fs.existsSync('/var/packages/domo/var/config.json') ? '/var/packages/domo/var/config.json'
    : path.join(__dirname, 'config.json'));
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const providers = [];
const load = (name, enabled) => { if (enabled) providers.push(require('./providers/' + name)(cfg)); };
load('tuya', cfg.tuya && cfg.tuya.accessKey);
load('ring', cfg.ring && cfg.ring.refreshToken);
load('foscam', cfg.foscam && cfg.foscam.length);

const app = express();
app.use(express.json());

// CORS so the iOS/Android shells can talk to the NAS
app.use((req, res, next) => {
  res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Google Home fulfillment authenticates with its own OAuth token, not the app token
const googleRouter = require('./providers/google')(cfg, () => providers);
app.use('/google', googleRouter);

// Everything under /api needs the app token (header, or ?token= for <img> tags)
app.use('/api', (req, res, next) => {
  const t = (req.get('Authorization') || '').replace('Bearer ', '') || req.query.token;
  if (t !== cfg.apiToken) return res.status(401).json({ error: 'Invalid token' });
  next();
});

const owner = id => providers.find(p => id.startsWith(p.prefix + ':'));

app.get('/api/devices', async (req, res) => {
  const lists = await Promise.allSettled(providers.map(p => p.list()));
  res.json(lists.flatMap((r, i) => r.status === 'fulfilled' ? r.value
    : (console.error(providers[i].prefix, r.reason), [])));
});

app.post('/api/devices/:id/command', async (req, res) => {
  const p = owner(req.params.id);
  if (!p) return res.status(404).json({ error: 'Unknown device' });
  try { await p.command(req.params.id, req.body); res.json({ ok: true }); }
  catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

app.get('/api/cameras/:id/snapshot', async (req, res) => {
  const p = owner(req.params.id);
  if (!p || !p.snapshot) return res.sendStatus(404);
  try { res.type('jpeg').set('Cache-Control', 'no-store').send(await p.snapshot(req.params.id)); }
  catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

app.post('/api/cameras/:id/ptz', async (req, res) => {
  const p = owner(req.params.id);
  if (!p || !p.ptz) return res.sendStatus(404);
  try { await p.ptz(req.params.id, req.body.dir); res.json({ ok: true }); }
  catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});

app.listen(cfg.port || 8420, () => console.log('Domo Hub on :' + (cfg.port || 8420)));
