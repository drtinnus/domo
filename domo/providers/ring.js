'use strict';
// Ring has no official API. This uses the community ring-client-api.
// Get a token once with:  npx -p ring-client-api ring-auth-cli
const { RingApi } = require('ring-client-api');

module.exports = cfg => {
  const api = new RingApi({ refreshToken: cfg.ring.refreshToken });
  api.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) =>
    console.warn('Ring refresh token rotated. Save it to config.json:', newRefreshToken));
  const cam = async id => (await api.getCameras()).find(c => 'ring:' + c.id === id);
  return {
    prefix: 'ring',
    async list() {
      return (await api.getCameras()).map(c => ({
        id: 'ring:' + c.id, provider: 'Ring', name: c.name, type: 'camera', online: true, hasLight: c.hasLight }));
    },
    async snapshot(id) { return (await cam(id)).getSnapshot(); },
    async command(id, { light }) { await (await cam(id)).setLight(!!light); }
  };
};
