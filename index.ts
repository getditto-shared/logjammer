import { init, Ditto, Identity, TransportConfig } from '@dittolive/ditto'
require('dotenv').config()

let ditto
let collection
let subscription
let interval = 1000 // 1 second

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function doOnInterval() {
  // Code to fetch updates from the API and update the application
  let payload = {
    "timestamp": Date.now(),
    "nodeId": "alpha",
    "quartetId": "quartet-1",
    "magX":randomIntFromInterval(-99,99),
    "magY":randomIntFromInterval(-99,99),
    "magZ":randomIntFromInterval(-99,99),
    "isDeleted": false
  }
  collection.upsert(payload)

  console.log("Upserting to ditto: ", payload)
}

async function main () {
  await init()

  const config = new TransportConfig()
  config.peerToPeer.bluetoothLE.isEnabled = true
  config.peerToPeer.lan.isEnabled = false
  config.peerToPeer.awdl.isEnabled = false
  // Create a Ditto' context:
  ditto = new Ditto({ 
    type: 'onlinePlayground', 
    appID: process.env.APP_ID, 
    token: process.env.APP_TOKEN
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

  collection = ditto.store.collection("raw_data")
  subscription = collection.find("isDeleted == false").subscribe()
  const doingEverySecond = setInterval(doOnInterval, interval)
}

main()
