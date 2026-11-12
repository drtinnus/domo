# Domo Hub

Synology-hosted hub with a shared web UI. iOS and Android apps are Capacitor shells around the same UI.

## 1. Configure
Copy `config.example.json` to `config.json`, fill in your keys. Test locally: `npm i && npm start`.
- Smart Life: create a Tuya IoT cloud project, link your Smart Life account, copy access id/secret/uid.
- Ring: run `npx -p ring-client-api ring-auth-cli`, paste the refresh token.
- Foscam: add each camera (HTTP port, usually 88, plus a camera user).
- Google Home: see below.

## 2. Synology package
`./build-spk.sh` (add icons/PACKAGE_ICON.PNG 72px and PACKAGE_ICON_256.PNG first).
DSM > Package Center > Manual Install. Requires the Node.js v18 package. Edit `/var/packages/domo/var/config.json`.
Put it behind DSM Reverse Proxy with HTTPS before using remotely.

## 3. Mobile
```
cd mobile && npm i && npx cap add android && npx cap add ios && npx cap sync && npx cap open android|ios
```
On first launch enter the hub address and API token. iOS needs a Mac with Xcode.

## 4. Google Home
Create a Smart Home project in the Google Home Developer Console. Set fulfillment to
`https://YOUR-DOMAIN/google/fulfillment`, account linking to `/google/oauth/authorize` and `/google/oauth/token`.
Add a real login page to the authorize route before exposing it.
