let Gpsd = require('node-gpsd-client')
let fs = require('fs');

export interface Rectangle {
  topLeftLat: number;
  topLeftLon: number;
  topRightLat: number;
  topRightLon: number;
  bottomLeftLat: number;
  bottomLeftLon: number;
  bottomRightLat: number;
  bottomRightLon: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  heading: number;
}

let gpsClient = new Gpsd({
  port: 2947,
  hostname: 'localhost',
  parse: true
})

gpsClient.on('connected', () => {
  gpsClient.watch({
    class: 'WATCH',
    json: true,
    scaled: true
  })
})

gpsClient.on('error', (err: Error) => {
  console.log(`Gpsd error: ${err.message}`)
})

let gpsData: any;

gpsClient.on('TPV', (data: any) => {
  gpsData = data
})

export function calculateRectangularMovement(
  startTime: number,
  currentTime: number,
  speed: number,
  rectangle: Rectangle
): Coordinates {
  if (fs.existsSync('dev/serial0')) {


    return { latitude: gpsData['lat'], longitude: gpsData['lon'], heading: gpsData['track'] };
  } else {
    const topLeft: Coordinates = { latitude: rectangle.topLeftLat, longitude: rectangle.topLeftLon, heading: 0 };
    const topRight: Coordinates = { latitude: rectangle.topRightLat, longitude: rectangle.topRightLon, heading: 0 };
    const bottomLeft: Coordinates = { latitude: rectangle.bottomLeftLat, longitude: rectangle.bottomLeftLon, heading: 0 };
    // const bottomRight: Coordinates = { latitude: rectangle.bottomRightLat, longitude: rectangle.bottomRightLon };

    const width: number = Math.abs(topLeft.longitude - topRight.longitude);
    const height: number = Math.abs(topLeft.latitude - bottomLeft.latitude);

    const perimeter: number = 2 * (width + height);

    const elapsedTime: number = currentTime - startTime;
    const distance: number = speed * elapsedTime;

    const distanceAlongPerimeter: number = distance % perimeter;

    let currentLatitude: number;
    let currentLongitude: number;
    let currentHeading: number;

    if (distanceAlongPerimeter <= width) {
      // Moving along the top edge
      currentHeading = 90;
      currentLatitude = topLeft.latitude;
      currentLongitude = topLeft.longitude + distanceAlongPerimeter;
    } else if (distanceAlongPerimeter <= width + height) {
      // Moving along the right edge
      currentHeading = 180;
      currentLatitude = topLeft.latitude - (distanceAlongPerimeter - width);
      currentLongitude = topRight.longitude;
    } else if (distanceAlongPerimeter <= 2 * width + height) {
      // Moving along the bottom edge
      currentHeading = 270;
      currentLatitude = bottomLeft.latitude;
      currentLongitude = topRight.longitude - (distanceAlongPerimeter - width - height);
    } else {
      // Moving along the left edge
      currentHeading = 0;
      currentLatitude = bottomLeft.latitude + (distanceAlongPerimeter - 2 * width - height);
      currentLongitude = topLeft.longitude;
    }

    return { latitude: currentLatitude, longitude: currentLongitude, heading: currentHeading };
  }
}
