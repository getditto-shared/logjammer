import {
  init,
  Authenticator,
  Collection,
  Ditto,
  Identity,
  Subscription,
  TransportConfig,
} from "@dittolive/ditto";
import { v4 as uuidv4 } from "uuid";
import {
  Coordinates,
  Rectangle,
  calculateRectangularMovement,
} from "./flight_path";

// let sense = require("sense-hat-led");

let nconf = require("nconf");

// sense.setRotation(180);

let ditto: Ditto;
let collection: Collection;
let transportConfig: TransportConfig;
let identity: Identity;
let interval = 2000; // 1000ms or 1Hz
let counter = 0;
let presenceObserver;

const startTime: number = Date.now();

nconf.argv().env().file({ file: "config.json" });

let blue = [0, 0, 255];
let black = [0, 0, 0];
let X = blue;
let O = black;
let dittoMark = [
  O,
  O,
  O,
  O,
  O,
  O,
  O,
  O,
  X,
  X,
  O,
  X,
  X,
  O,
  O,
  O,
  O,
  X,
  X,
  O,
  X,
  X,
  O,
  O,
  O,
  O,
  X,
  X,
  O,
  X,
  X,
  O,
  O,
  O,
  O,
  X,
  X,
  O,
  X,
  X,
  O,
  O,
  X,
  X,
  O,
  X,
  X,
  O,
  O,
  X,
  X,
  O,
  X,
  X,
  O,
  O,
  X,
  X,
  O,
  X,
  X,
  O,
  O,
  O,
];

process.once("SIGINT", async () => {
  try {
    // sense.clear();
    await sleep(500);
  } finally {
    console.log("SIGINT received...");
    process.exit(0);
  }
  process.once("SIGINT", async () => {
    try {
      // sense.clear();
      await sleep(500);
    } finally {
      console.log("SIGINT received...");
      process.exit(0);
    }
  });
});

// Random number generator for fake data
function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Sleeper
function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Monty-BESPIN
// TopLeft: 32.3779983, -86.3119614
// BottomRight: 32.3770459, -86.3109061
// const rectangle: Rectangle = {
//   topLeftLat: 32.3779983,
//   topLeftLon: -86.3119614,
//   topRightLat: 32.3779983,
//   topRightLon: -86.3109061,
//   bottomLeftLat: 32.3770459,
//   bottomLeftLon: -86.3119614,
//   bottomRightLat: 32.3770459,
//   bottomRightLon: -86.3109061,
// };

const getConfig = (key: string, fallback?: any) => nconf.get(key) || fallback;

const rectangle: Rectangle = {
  topLeftLat: getConfig("rectangle:topLeftLat", 32.3779983),
  topLeftLon: getConfig("rectangle:topLeftLon", -86.3119614),
  topRightLat: getConfig("rectangle:topRightLat", 32.3779983),
  topRightLon: getConfig("rectangle:topRightLon", -86.3109061),
  bottomLeftLat: getConfig("rectangle:bottomLeftLat", 32.3770459),
  bottomLeftLon: getConfig("rectangle:bottomLeftLon", -86.3119614),
  bottomRightLat: getConfig("rectangle:bottomRightLat", 32.3770459),
  bottomRightLon: getConfig("rectangle:bottomRightLon", -86.3109061),
};

const speed: number = 0.0005; // Degrees per millisecond

const dID = uuidv4();

// This is the Ditto doc generator
function doOnInterval() {
  counter += 1;

  const currentTime: number = startTime + interval * speed * counter; // Current time after 1 hour (milliseconds)
  const currentPosition: Coordinates = calculateRectangularMovement(
    startTime,
    currentTime,
    speed,
    rectangle,
  );

  let siteID = `${ditto.siteID}`;
  console.log(`SITE ID: ${siteID}`);
  // This is just enough fake data
  let payload = {
    _id: dID,
    type: "a-h-A-M-A",
    title: getConfig("info:name", "logjammer"),
    altitude: 300,
    description: "ausa test marker",
    lon: currentPosition.longitude,
    lat: currentPosition.latitude,
    heading: currentPosition.heading,
    timestamp: Date.now(),
    nodeId: "alpha",
    quartetId: "quartet-1",
    magX: randomIntFromInterval(-99, 99),
    magY: randomIntFromInterval(-99, 99),
    magZ: randomIntFromInterval(-99, 99),
    temp: randomIntFromInterval(-99, 99),
    pressure: randomIntFromInterval(-99, 99),
    humidity: randomIntFromInterval(-99, 99),
    state: "published",
    isRemoved: false,
    siteId: siteID,
    timeMillis: Date.now() + 0.001,
  };
  collection.upsert(payload);

  console.log(`Upserting to ditto: [${counter}]`, payload);
}


const asBoolean = (value: any) =>
  [true, "true", "True", "TRUE", "1", 1].includes(value);

async function main() {
  await init();
  console.log("Starting logjammer...");

  // sense.clear();
  await sleep(1000);
  // sense.setPixels(dittoMark);

  const config: Record<string, any> = {
    APP_ID: getConfig("ditto:app-id", ""),
    APP_TOKEN: getConfig("ditto:app-token", ""),
    OFFLINE_TOKEN: getConfig("ditto:offline-token", ""),
    SHARED_KEY: getConfig("ditto:shared-key", ""),
    USE_CLOUD: asBoolean(getConfig("ditto:use-cloud", true)),
    USE_LAN: asBoolean(getConfig("ditto:use-lan", true)),
    USE_BLE: asBoolean(getConfig("ditto:use-ble", true)),
    BPA_URL: getConfig("ditto:bpa-url", ""),
  };

  console.log(config.APP_ID)
  console.log(config.APP_TOKEN)
  console.log(config.OFFLINE_TOKEN)
  console.log(config.SHARED_KEY)
  console.log(config.USE_CLOUD)
  console.log(config.USE_LAN)
  console.log(config.USE_BLE)
  console.log(config.BLA_URL)

  // We're testing BLE here
  transportConfig = new TransportConfig();
  transportConfig.peerToPeer.bluetoothLE.isEnabled = config.USE_BLE;
  transportConfig.peerToPeer.lan.isEnabled = config.USE_LAN;

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
    authenticationRequired: async function (authenticator: Authenticator) {
      await authenticator.loginWithToken("full_access", "dummy-provider");
      console.log(`Login requested`);
    },
    authenticationExpiringSoon: function (
      authenticator: Authenticator,
      secondsRemaining: number,
    ) {
      console.log(`Auth token expiring in ${secondsRemaining} seconds`);
    },
  };

  console.log(`BPA_URL: ${config.BPA_URL}`);

  if (config.BPA_URL == "NA") {
    identity = {
      type: "sharedKey",
      appID: config.APP_ID,
      sharedKey: config.SHARED_KEY,
    };
  } else {
    identity = {
      type: "onlineWithAuthentication",
      appID: config.APP_ID,
      enableDittoCloudSync: false,
      authHandler: authHandler,
      customAuthURL: config.BPA_URL,
    };
  }

  ditto = new Ditto(identity, "./ditto");

  if (config.BPA_URL == "NA") {
    ditto.setOfflineOnlyLicenseToken(config.OFFLINE_TOKEN);
  }
  const transportConditionsObserver = ditto.observeTransportConditions(
    (condition, source) => {
      if (condition === "BLEDisabled") {
        console.log("BLE disabled");
      } else if (condition === "NoBLECentralPermission") {
        console.log("Permission missing for BLE");
      } else if (condition === "NoBLEPeripheralPermission") {
        console.log("Permissions missing for BLE");
      }
    },
  );

  ditto.setTransportConfig(transportConfig);

  ditto.startSync();

  // Console out the peers found
  presenceObserver = ditto.presence.observe((graph) => {
    if (graph.remotePeers.length != 0) {
      graph.remotePeers.forEach((peer) => {
        console.log(
          "peer connection: ",
          peer.deviceName,
          peer.connections[0].connectionType,
        );
      });
    }
  });

  // Basic Ditto collection and subscription
  collection = ditto.store.collection("TAK_Markers");

  // Wait five seconds at start to try and find BLE peers before writing docs
  await sleep(5000);

  // Do the thing
  const doingEverySecond = setInterval(doOnInterval, interval);
}

main();
