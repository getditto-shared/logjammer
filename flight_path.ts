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
}

export function calculateRectangularMovement(
  startTime: number,
  currentTime: number,
  speed: number,
  rectangle: Rectangle
): Coordinates {
  const topLeft: Coordinates = { latitude: rectangle.topLeftLat, longitude: rectangle.topLeftLon };
  const topRight: Coordinates = { latitude: rectangle.topRightLat, longitude: rectangle.topRightLon };
  const bottomLeft: Coordinates = { latitude: rectangle.bottomLeftLat, longitude: rectangle.bottomLeftLon };
  const bottomRight: Coordinates = { latitude: rectangle.bottomRightLat, longitude: rectangle.bottomRightLon };

  const width: number = Math.abs(topLeft.longitude - topRight.longitude);
  const height: number = Math.abs(topLeft.latitude - bottomLeft.latitude);

  const elapsedTime: number = currentTime - startTime;
  const distance: number = speed * elapsedTime;

  const xPosition: number = distance % width;
  const yPosition: number = distance % height;

  const currentLatitude: number = topLeft.latitude - yPosition;
  const currentLongitude: number = topLeft.longitude + xPosition;

  return { latitude: currentLatitude, longitude: currentLongitude };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Example usage:
const rectangle: Rectangle = {
  topLeftLat: 40.0,
  topLeftLon: -74.0,
  topRightLat: 40.0,
  topRightLon: -73.5,
  bottomLeftLat: 39.5,
  bottomLeftLon: -74.0,
  bottomRightLat: 39.5,
  bottomRightLon: -73.5,
};

