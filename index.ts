import { init, Collection, Ditto, Identity, Presence, Subscription, TransportConfig } from '@dittolive/ditto'
require('dotenv').config()

let ditto: Ditto
let collection: Collection
let subscription: Subscription
let interval = 1000 // 1000ms or 1Hz
let counter = 0
let presenceObserver

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

// This is the Ditto doc generator
function doOnInterval() {
  counter += 1

  // This is just enough fake data
  let payload = {
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

async function main() {
  await init()
  console.log("Starting logjammer...")

  // We're testing BLE here
  const config = new TransportConfig()
  config.peerToPeer.bluetoothLE.isEnabled = true
  config.peerToPeer.lan.isEnabled = false
  config.peerToPeer.awdl.isEnabled = false

  // Create a Ditto' context:
  ditto = new Ditto({
    type: 'onlinePlayground',
    appID: process.env.APP_ID || '',
    token: process.env.APP_TOKEN || '',
    enableDittoCloudSync: false,
  })
  const transportConditionsObserver = ditto.observeTransportConditions((condition, source) => {
    if (condition === 'BLEDisabled') {
      console.log('BLE disabled')
    } else if (condition === 'NoBLECentralPermission') {
      console.log('Permission missing for BLE')
    } else if (condition === 'NoBLEPeripheralPermission') {
      console.log('Permissions missing for BLE')
    }
  })

  ditto.setTransportConfig(config)

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
  collection = ditto.store.collection("raw_data")
  subscription = collection.find("synced == false").subscribe()

  // Wait five seconds at start to try and find BLE peers before writing docs
  await sleep(5000)

  // Do the thing
  const doingEverySecond = setInterval(doOnInterval, interval)
}

main()
