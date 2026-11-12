'use strict';
// Smart Life / Tuya via the Tuya Cloud API. Link your Smart Life account to a
// Tuya IoT Platform cloud project (Devices > Link App Account) to get the uid.
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');

module.exports = cfg => {
  const t = cfg.tuya;
  const ctx = new TuyaContext({ baseUrl: t.baseUrl, accessKey: t.accessKey, secretKey: t.secretKey });
  const switchCode = d => (d.status || []).find(s => /^switch(_led|_1)?$/.test(s.code));
  return {
    prefix: 'tuya',
    async list() {
      const r = await ctx.request({ path: `/v1.0/users/${t.uid}/devices`, method: 'GET' });
      if (!r.success) throw new Error(r.msg);
      return r.result.filter(switchCode).map(d => ({
        id: 'tuya:' + d.id, provider: 'Smart Life', name: d.name,
        type: d.category === 'dj' ? 'light' : 'switch', online: d.online, on: !!switchCode(d).value
      }));
    },
    async command(id, { on }) {
      const dev = id.slice(5);
      const info = await ctx.request({ path: `/v1.0/devices/${dev}`, method: 'GET' });
      const code = (switchCode(info.result) || { code: 'switch_1' }).code;
      const r = await ctx.request({ path: `/v1.0/devices/${dev}/commands`, method: 'POST',
        body: { commands: [{ code, value: !!on }] } });
      if (!r.success) throw new Error(r.msg);
    }
  };
};
