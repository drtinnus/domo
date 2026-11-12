'use strict';
// Foscam HTTP CGI (works on most models with the CGIProxy interface).
const PTZ = { up: 'ptzMoveUp', down: 'ptzMoveDown', left: 'ptzMoveLeft', right: 'ptzMoveRight' };

module.exports = cfg => {
  const cams = Object.fromEntries(cfg.foscam.map(c => ['foscam:' + c.id.replace(/^foscam-/, ''), c]));
  const url = (c, cmd) => `http://${c.host}:${c.port || 88}/cgi-bin/CGIProxy.fcgi?cmd=${cmd}` +
    `&usr=${encodeURIComponent(c.user)}&pwd=${encodeURIComponent(c.pass)}`;
  const get = id => { const c = cams[id]; if (!c) throw new Error('Unknown camera'); return c; };
  return {
    prefix: 'foscam',
    async list() {
      return Object.entries(cams).map(([id, c]) => ({ id, provider: 'Foscam', name: c.name, type: 'camera', online: true, ptz: true }));
    },
    async snapshot(id) {
      const r = await fetch(url(get(id), 'snapPicture2'), { signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error('Camera returned ' + r.status);
      return Buffer.from(await r.arrayBuffer());
    },
    async ptz(id, dir) {
      const c = get(id);
      if (!PTZ[dir]) throw new Error('Bad direction');
      await fetch(url(c, PTZ[dir]));
      setTimeout(() => fetch(url(c, 'ptzStopRun')).catch(() => {}), 400);
    },
    async command() { throw new Error('Not supported'); }
  };
};
