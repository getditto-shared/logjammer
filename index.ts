import { init, Authenticator, Collection, Ditto, Identity, Subscription, TransportConfig } from '@dittolive/ditto'
import { v4 as uuidv4 } from 'uuid';
import { Coordinates, Rectangle, calculateRectangularMovement } from "./flight_path"

let nconf = require("nconf")

let ditto: Ditto
let collection: Collection
let transportConfig: TransportConfig
let identity: Identity
let interval = 5000 // 1000ms or 1Hz
let counter = 0
let presenceObserver

// Starting map point
let lat = -105.11
let long = 35.11
const startTime: number = Date.now();

nconf.argv()
  .env()
  .file({ file: 'config.json' })

// Random number generator for fake data
function randomIntFromInterval(min: number, max: number) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// Sleeper
function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

//
//-74.749558,40.118855,0.0 
// -74.749558,39.938513,0.0 
// -74.338257,39.938513,0.0 
// -74.338257,40.118855,0.0
const rectangle: Rectangle = {
  topLeftLat: -74.749558,
  topLeftLon: 40.118855,
  topRightLat: -74.749558,
  topRightLon: 39.938513,
  bottomLeftLat: -74.338257,
  bottomLeftLon: 39.938513,
  bottomRightLat: -74.338257,
  bottomRightLon: 40.118855,
};

// This is the Ditto doc generator
function doOnInterval() {

  counter += 1

  const speed: number = 0.01; // Degrees per millisecond

  const currentTime: number = startTime + Date.now(); // Current time after 1 hour (milliseconds)
  const currentPosition: Coordinates = calculateRectangularMovement(startTime, currentTime, speed, rectangle);

  let siteID = `${ditto.siteID}`
  console.log(`SITE ID: ${siteID}`)
  // This is just enough fake data
  let payload = {
    "_id": uuidv4(),
    "type": "WKT",
    "title": "logjammer",
    "description": "netmodx data chucker",
    "data": `POINT(${currentPosition.latitude} ${currentPosition.longitude})`,
    "timestamp": Date.now(),
    "nodeId": "alpha",
    "quartetId": "quartet-1",
    "magX": randomIntFromInterval(-99, 99),
    "magY": randomIntFromInterval(-99, 99),
    "magZ": randomIntFromInterval(-99, 99),
    "temp": randomIntFromInterval(-99, 99),
    "pressure": randomIntFromInterval(-99, 99),
    "humidity": randomIntFromInterval(-99, 99),
    "state": "published",
    "isRemoved": false,
    "siteId": siteID,
    "timeMillis": Date.now() + 0.001
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
    SHARED_KEY: getConfig('ditto:shared-key', ''),
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
    authenticationRequired: async function(authenticator: Authenticator) {
      await authenticator.loginWithToken("full_access", "dummy-provider")
      console.log(`Login requested`);

    },
    authenticationExpiringSoon: function(authenticator: Authenticator, secondsRemaining: number) {
      console.log(`Auth token expiring in ${secondsRemaining} seconds`)
    }
  }

  console.log(`BPA_URL: ${config.BPA_URL}`)

  if (config.BPA_URL == "NA") {
    identity = {
      type: 'sharedKey',
      appID: config.APP_ID,
      sharedKey: config.SHARED_KEY
    }
  } else {
    identity = {
      type: 'onlineWithAuthentication',
      appID: config.APP_ID,
      enableDittoCloudSync: false,
      authHandler: authHandler,
      customAuthURL: config.BPA_URL,
    }
  }

  ditto = new Ditto(identity, "./ditto")

  if (config.BPA_URL == "NA") {
    ditto.setOfflineOnlyLicenseToken(config.OFFLINE_TOKEN)
  }
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
  presenceObserver = ditto.presence.observe((graph) => {
    if (graph.remotePeers.length != 0) {
      graph.remotePeers.forEach((peer) => {
        console.log("peer connection: ", peer.deviceName, peer.connections[0].connectionType)
      })
    }
  })

  // Basic Ditto collection and subscription
  collection = ditto.store.collection("TAK_Interop")

  // Wait five seconds at start to try and find BLE peers before writing docs
  await sleep(5000)

  // Do the thing
  const doingEverySecond = setInterval(doOnInterval, interval)
}

main()
