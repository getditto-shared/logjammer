import { init, Ditto, Identity, TransportConfig } from '@dittolive/ditto'
require('dotenv').config()

let ditto
let collection
let subscription
let interval = 100 // 1 second
let counter = 0

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function doOnInterval() {
  counter += 1
  let payload = {
    "timestamp": Date.now(),
    "nodeId": "alpha",
    "quartetId": "quartet-1",
    "magX":randomIntFromInterval(-99,99),
    "magY":randomIntFromInterval(-99,99),
    "magZ":randomIntFromInterval(-99,99),
    "synced": false
  }
  collection.upsert(payload)

  console.log(`Upserting to ditto: [${counter}]`, payload)
}

async function main () {
  await init()
  console.log("Starting logjammer...")
  const config = new TransportConfig()
  config.peerToPeer.bluetoothLE.isEnabled = true
  config.peerToPeer.lan.isEnabled = false
  config.peerToPeer.awdl.isEnabled = false
  // Create a Ditto' context:
  ditto = new Ditto({ 
    type: 'onlinePlayground', 
    appID: process.env.APP_ID, 
    token: process.env.APP_TOKEN,
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
  const presenceObserver = ditto.presence.observe((graph) => {
    if (graph.remotePeers.length != 0) {
      graph.remotePeers.forEach((peer) => {
        console.log("peer connection: ", peer.deviceName, peer.connections[0].connectionType)
      })
    }
  })

  collection = ditto.store.collection("raw_data")
  subscription = collection.find("isDeleted == false").subscribe()
  await sleep(5000)
  const doingEverySecond = setInterval(doOnInterval, interval)

}

main()
