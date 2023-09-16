import { init, Collection, Ditto, Identity, Subscription, TransportConfig } from '@dittolive/ditto'
import { v4 as uuidv4 } from 'uuid';

let nconf = require("nconf")

let ditto: Ditto
let collection: Collection
let transportConfig: TransportConfig
let identity: Identity
let interval = 1000 // 1000ms or 1Hz
let counter = 0

// Starting map point
let lat = -105.11
let long = 35.11

nconf.argv()
  .env()
  .file({ file: 'config.json' })

// Random number generator for fake data
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// Sleeper
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// This is the Ditto doc generator
function doOnInterval() {
  lat = lat + (counter * .10)
  long = long - (counter * .10)

  counter += 1

  // This is just enough fake data
  let payload = {
    "_id": uuidv4(),
    "type": "WKT",
    "title": "logjammer",
    "description": "test data chucker",
    "data": `POINT(${lat},${long})`,
    "timestamp": Date.now(),
    "nodeId": "alpha",
    "quartetId": "quartet-1",
    "magX": randomIntFromInterval(-99, 99),
    "magY": randomIntFromInterval(-99, 99),
    "magZ": randomIntFromInterval(-99, 99),
    "temp": randomIntFromInterval(-99, 99),
    "pressure": randomIntFromInterval(-99, 99),
    "humidity": randomIntFromInterval(-99, 99),
    "state": "published"
  }
  collection.upsert(payload)

  console.log(`Upserting to ditto: [${counter}]`, payload)
}

const getConfig = (key: string, fallback?: any) => nconf.get(key) || fallback;
const asBoolean = (value: any) => [true, 'true', 'True', 'TRUE', '1', 1].includes(value);

async function main() {
  await init()
  console.log("Starting logjammer...")

  const config: Record<string, any> = {
    APP_ID: getConfig('ditto:app-id', ''),
    APP_TOKEN: getConfig('ditto:app-token', ''),
    OFFLINE_TOKEN: getConfig('ditto:offline-token', ''),
    USE_CLOUD: asBoolean(getConfig('ditto:use-cloud', true)),
    USE_LAN: asBoolean(getConfig('ditto:use-lan', true)),
    USE_BLE: asBoolean(getConfig('ditto:use-ble', true)),
    BPA_URL: getConfig('ditto:bpa-url', ''),
  };

  // We're testing BLE here
  transportConfig = new TransportConfig()
  transportConfig.peerToPeer.bluetoothLE.isEnabled = config.USE_BLE
  transportConfig.peerToPeer.lan.isEnabled = config.USE_LAN

  // Create a Ditto' context:
  // identity = {
  //   type: 'onlinePlayground',
  //   appID: process.env.APP_ID,
  //   token: process.env.APP_TOKEN,
  //   enableDittoCloudSync: false,
  // }

  // identity = {
  //   type: 'sharedKey',
  //   appID: process.env.APP_ID,
  //   sharedKey: process.env.SHARED_KEY,
  // }
  const authHandler = {
    authenticationRequired: async function(authenticator) {
      await authenticator.loginWithToken("full_access", "dummy-provider")
      console.log(`Login requested`);

    },
    authenticationExpiringSoon: function(authenticator, secondsRemaining) {
      console.log(`Auth token expiring in ${secondsRemaining} seconds`)
    }
  }

  console.log(`BPA_URL: ${config.BPA_URL}`)

  identity = {
    type: 'onlineWithAuthentication',
    appID: config.APP_ID,
    enableDittoCloudSync: false,
    authHandler: authHandler,
    customAuthURL: config.BPA_URL,
  }


  ditto = new Ditto(identity, "./ditto")

  //  ditto.setOfflineOnlyLicenseToken(process.env.OFFLINE_TOKEN)
  const transportConditionsObserver = ditto.observeTransportConditions((condition, source) => {
    if (condition === 'BLEDisabled') {
      console.log('BLE disabled')
    } else if (condition === 'NoBLECentralPermission') {
      console.log('Permission missing for BLE')
    } else if (condition === 'NoBLEPeripheralPermission') {
      console.log('Permissions missing for BLE')
    }
  })

  ditto.setTransportConfig(transportConfig)

  ditto.startSync()

  // Console out the peers found
  const presenceObserver = ditto.presence.observe((graph) => {
    if (graph.remotePeers.length != 0) {
      graph.remotePeers.forEach((peer) => {
        console.log("peer connection: ", peer.deviceName, peer.connections[0].connectionType)
      })
    }
  })

  // Basic Ditto collection and subscription
  collection = ditto.store.collection("TAK_interop")

  // Wait five seconds at start to try and find BLE peers before writing docs
  await sleep(5000)

  // Do the thing
  const doingEverySecond = setInterval(doOnInterval, interval)
}

main()
