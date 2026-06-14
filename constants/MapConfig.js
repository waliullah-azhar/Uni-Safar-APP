export const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN'; // Paste your Mapbox Public access token here

// Pure JavaScript implementation of Google Polyline Algorithm
function encodePolyline(coordinates) {
  let result = '';
  let prevLat = 0;
  let prevLon = 0;

  for (let i = 0; i < coordinates.length; i++) {
    // coordinates[i] is [longitude, latitude]
    const lat = Math.round(coordinates[i][1] * 1e5);
    const lon = Math.round(coordinates[i][0] * 1e5);

    const dLat = lat - prevLat;
    const dLon = lon - prevLon;

    result += encodeSignedNumber(dLat);
    result += encodeSignedNumber(dLon);

    prevLat = lat;
    prevLon = lon;
  }

  return result;
}

function encodeSignedNumber(num) {
  let sVal = num << 1;
  if (num < 0) {
    sVal = ~sVal;
  }
  return encodeNumber(sVal);
}

function encodeNumber(num) {
  let result = '';
  while (num >= 0x20) {
    result += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  result += String.fromCharCode(num + 63);
  return result;
}

/**
 * Returns a static map URL.
 * Uses Mapbox Static Images API if MAPBOX_ACCESS_TOKEN is configured.
 * Falls back to Yandex Static Maps API if token is not available.
 * 
 * @param {Object} originCoords - { lat, lon }
 * @param {Object} destCoords - { lat, lon }
 * @param {Array} routeCoordinates - Optional array of coordinates [lon, lat] from OSRM routing
 */
export const getStaticMapUrl = (originCoords, destCoords, routeCoordinates) => {
  if (!originCoords || !destCoords) return null;

  // Verify coordinates exist and are numeric
  const startLon = parseFloat(originCoords.lon);
  const startLat = parseFloat(originCoords.lat);
  const endLon = parseFloat(destCoords.lon);
  const endLat = parseFloat(destCoords.lat);

  if (isNaN(startLon) || isNaN(startLat) || isNaN(endLon) || isNaN(endLat)) {
    return null;
  }

  const isMapboxConfigured = 
    MAPBOX_ACCESS_TOKEN && 
    MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN' && 
    MAPBOX_ACCESS_TOKEN.trim() !== '';

  if (isMapboxConfigured) {
    const coords = routeCoordinates && routeCoordinates.length > 0
      ? routeCoordinates
      : [[startLon, startLat], [endLon, endLat]];

    const polyline = encodePolyline(coords);
    const encodedPoly = encodeURIComponent(polyline);

    // Construct Mapbox pins and path overlays
    // Start pin 'a' (emerald green: 004532), End pin 'b' (red: ba1a1a)
    // Path stroke width 5, stroke color emerald green (004532)
    const startPin = `pin-s-a+004532(${startLon},${startLat})`;
    const endPin = `pin-s-b+ba1a1a(${endLon},${endLat})`;
    const pathOverlay = `path-5+004532(${encodedPoly})`;

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${startPin},${endPin},${pathOverlay}/auto/450x250?access_token=${MAPBOX_ACCESS_TOKEN}`;
  }

  // Fallback to keyless Yandex Static Maps API
  const startPoint = `${startLon},${startLat}`;
  const endPoint = `${endLon},${endLat}`;

  let polylineString = '';
  if (routeCoordinates && routeCoordinates.length > 0) {
    // Downsample coordinate list to avoid Yandex URL length limitations
    const maxPts = 25;
    const step = Math.max(1, Math.floor(routeCoordinates.length / maxPts));
    const points = [];
    for (let i = 0; i < routeCoordinates.length; i += step) {
      points.push(routeCoordinates[i]);
    }
    if (points[points.length - 1] !== routeCoordinates[routeCoordinates.length - 1]) {
      points.push(routeCoordinates[routeCoordinates.length - 1]);
    }
    polylineString = points.map(pt => `${pt[0]},${pt[1]}`).join(',');
  } else {
    polylineString = `${startLon},${startLat},${endLon},${endLat}`;
  }

  return `https://static-maps.yandex.ru/1.x/?l=map&size=450,250&pt=${startPoint},pm2gnm1~${endPoint},pm2rdm2&pl=c:004532ff,w:5,${polylineString}`;
};
