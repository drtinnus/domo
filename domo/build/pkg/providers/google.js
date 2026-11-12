'use strict';
// Google Home Smart Home Action fulfillment: exposes Tuya switches/lights to
// Google Home and Assistant. Needs a public HTTPS URL (DSM Reverse Proxy +
// Let's Encrypt) and an Actions on Google project with account linking.
const express = require('express');
const crypto = require('crypto');

module.exports = (cfg, getProviders) => {
  const r = express.Router();
  const g = cfg.google || {};
  const tokens = new Set(); // TODO: persist to disk

  r.get('/oauth/authorize', (req, res) => {
    if (!g.enabled || req.query.client_id !== g.clientId) return res.sendStatus(400);
    const u = new URL(req.query.redirect_uri);
    u.searchParams.set('code', crypto.randomBytes(16).toString('hex'));
    u.searchParams.set('state', req.query.state);
    res.redirect(u.toString()); // TODO: add a real login page before exposing publicly
  });
  r.post('/oauth/token', express.urlencoded({ extended: false }), (req, res) => {
    if (!g.enabled || req.body.client_secret !== g.clientSecret) return res.sendStatus(401);
    const access = crypto.randomBytes(24).toString('hex');
    tokens.add(access);
    res.json({ token_type: 'Bearer', access_token: access, refresh_token: access, expires_in: 31536000 });
  });

  const all = async () => (await Promise.all(getProviders().map(p => p.list().catch(() => [])))).flat()
    .filter(d => d.type !== 'camera');

  r.post('/fulfillment', express.json(), async (req, res) => {
    if (!tokens.has((req.get('Authorization') || '').replace('Bearer ', ''))) return res.sendStatus(401);
    const { requestId, inputs } = req.body, intent = inputs[0].intent;
    const devs = await all();
    let payload = {};
    if (intent === 'action.devices.SYNC') {
      payload = { agentUserId: 'domo-home', devices: devs.map(d => ({
        id: d.id, type: d.type === 'light' ? 'action.devices.types.LIGHT' : 'action.devices.types.SWITCH',
        traits: ['action.devices.traits.OnOff'], name: { name: d.name }, willReportState: false })) };
    } else if (intent === 'action.devices.QUERY') {
      payload = { devices: Object.fromEntries(inputs[0].payload.devices.map(({ id }) => {
        const d = devs.find(x => x.id === id);
        return [id, d ? { status: 'SUCCESS', online: d.online, on: d.on } : { status: 'ERROR', errorCode: 'deviceNotFound' }];
      })) };
    } else if (intent === 'action.devices.EXECUTE') {
      const results = [];
      for (const c of inputs[0].payload.commands) for (const { id } of c.devices) {
        const p = getProviders().find(p => id.startsWith(p.prefix + ':'));
        const on = c.execution[0].params.on;
        try { await p.command(id, { on }); results.push({ ids: [id], status: 'SUCCESS', states: { on, online: true } }); }
        catch { results.push({ ids: [id], status: 'ERROR', errorCode: 'hardError' }); }
      }
      payload = { commands: results };
    }
    res.json({ requestId, payload });
  });
  return r;
};
