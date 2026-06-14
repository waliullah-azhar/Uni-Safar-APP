import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Platform, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING, SHADOWS } from '../constants/Theme';
import { WebView } from 'react-native-webview';

const getLeafletHtml = (originCoords, destCoords, routeCoordinates, showZoom = false, driverCoords = null) => {
  const startLon = parseFloat(originCoords?.lon) || 0;
  const startLat = parseFloat(originCoords?.lat) || 0;
  const endLon = parseFloat(destCoords?.lon) || 0;
  const endLat = parseFloat(destCoords?.lat) || 0;
  
  // Serialize coordinate array for the Leaflet script
  const coordsJson = JSON.stringify(routeCoordinates || []);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #f9f9ff; }
        html, body, #map { height: 100%; width: 100vw; overflow: hidden; }
        .leaflet-bar { border: none !important; box-shadow: 0 2px 10px rgba(0,0,0,0.15) !important; }
        .leaflet-control-zoom { border: none !important; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          background-color: #ffffff !important;
          color: #004532 !important;
          border-radius: 8px !important;
          margin-bottom: 6px !important;
          font-weight: bold !important;
        }
        .leaflet-attribution-flag { display: none; }
        
        /* Premium custom pin points */
        .custom-pin-start {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pin-inner-start {
          background-color: #004532; /* Primary Emerald */
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,69,50,0.4);
        }
        .custom-pin-end {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pin-inner-end {
          background-color: #ba1a1a; /* Error Red */
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(186,26,26,0.4);
        }
        .custom-pin-car {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: ${showZoom ? 'true' : 'false'},
          attributionControl: false
        }).setView([${startLat || 24.8607}, ${startLon || 67.0011}], 13); // Default Pakistan/Karachi
 
        // Use high-contrast clean tiles from CartoDB Voyager
        L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);

        var startIcon = L.divIcon({
          className: 'custom-pin-start',
          html: '<div class="pin-inner-start"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        var endIcon = L.divIcon({
          className: 'custom-pin-end',
          html: '<div class="pin-inner-end"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        var startMarker = L.marker([${startLat}, ${startLon}], {icon: startIcon}).addTo(map);
        var endMarker = L.marker([${endLat}, ${endLon}], {icon: endIcon}).addTo(map);

        var carMarker = null;
        var carIcon = L.divIcon({
          className: 'custom-pin-car',
          html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.35));">🚗</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        window.updateCarMarker = function(lat, lon) {
          if (!lat || !lon) return;
          var pos = [parseFloat(lat), parseFloat(lon)];
          if (!carMarker) {
            carMarker = L.marker(pos, {icon: carIcon}).addTo(map);
          } else {
            carMarker.setLatLng(pos);
          }
        };

        // Draw initial car marker position if provided
        ${driverCoords?.lat && driverCoords?.lon ? `window.updateCarMarker(${parseFloat(driverCoords.lat)}, ${parseFloat(driverCoords.lon)});` : ''}

        var coords = ${coordsJson};
        if (coords && coords.length > 0) {
          // OSRM coordinates are [lon, lat], convert to [lat, lon] for Leaflet
          var latLons = coords.map(function(c) { return [c[1], c[0]]; });
          
          var routePolyline = L.polyline(latLons, {
            color: '#004532',
            weight: 5,
            opacity: 0.95
          }).addTo(map);

          map.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
        } else {
          map.fitBounds([
            [${startLat}, ${startLon}],
            [${endLat}, ${endLon}]
          ], { padding: [40, 40] });
        }
      </script>
    </body>
    </html>
  `;
};

export const MiniMap = ({
  mapImage,
  origin = 'Campus North Gate',
  destination = 'Tech Park Hub',
  height = 160,
  style,
  originCoords,
  destCoords,
  routeCoordinates,
  driverCoords = null,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const defaultMapUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbmf1g8rI6O5bgR5U5JbwRbqZbdRDFPEBMgKwfHQT4ea0q_GHVVqJeZD1CRKgcsPaViQovox4i1pT-kl7pH6E6f9mS9s4-kyJ0xaWnma0VOHZmi_W4fnn9usSAq6pc2mRoBe6Yntq9jn2kEHFwGD1CaPOjvaKB9QHmiPz_LJYHjDIqL9CBrzUPFo_SMGTFt3Oxycn1S2hrw0q3vn9cb-Ue61gQfA5r3LgQSPuv-8rFClNE-9bR5Zd-GG31pLgNrxDQu9BWEjOAAAdo';
  const webViewRef = React.useRef(null);

  const isLeafletAvailable = 
    Platform.OS !== 'web' && 
    originCoords?.lat && 
    originCoords?.lon && 
    destCoords?.lat && 
    destCoords?.lon;

  React.useEffect(() => {
    if (webViewRef.current && driverCoords?.lat && driverCoords?.lon) {
      const jsCode = `
        if (typeof window.updateCarMarker === 'function') {
          window.updateCarMarker(${parseFloat(driverCoords.lat)}, ${parseFloat(driverCoords.lon)});
        }
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [driverCoords]);

  const handleOpenFullscreen = () => {
    setModalVisible(true);
  };

  const handleCloseFullscreen = () => {
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { height }, style]}>
      {isLeafletAvailable ? (
        <View style={StyleSheet.absoluteFillObject}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: getLeafletHtml(originCoords, destCoords, routeCoordinates, false, driverCoords) }}
            style={StyleSheet.absoluteFillObject}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
          />
        </View>
      ) : (
        <ImageBackground
          source={{ uri: mapImage || defaultMapUri }}
          style={StyleSheet.absoluteFillObject}
          imageStyle={styles.mapImage}
          resizeMode="cover"
        />
      )}

      {/* Floating Expand/Fullscreen Button */}
      {isLeafletAvailable && (
        <TouchableOpacity 
          style={styles.expandButton} 
          onPress={handleOpenFullscreen}
          activeOpacity={0.8}
        >
          <Ionicons name="expand" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {/* Visual Route Info Card */}
      <View style={styles.routeCard}>
        <View style={styles.dotContainer}>
          <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          <View style={styles.dashLine} />
          <View style={[styles.dot, { backgroundColor: COLORS.error }]} />
        </View>
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={styles.routeText}>{origin.split(',')[0]}</Text>
          <Text numberOfLines={1} style={[styles.routeText, { marginTop: 4 }]}>{destination.split(',')[0]}</Text>
        </View>
      </View>

      {/* Interactive Fullscreen Map Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleCloseFullscreen}
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseFullscreen} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Pakistan Route Preview</Text>
              <Text numberOfLines={1} style={styles.modalSubtitle}>
                {origin.split(',')[0]} ➔ {destination.split(',')[0]}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Fullscreen Map WebView (With zoom enabled) */}
          <View style={styles.modalMapWrapper}>
            <WebView
              originWhitelist={['*']}
              source={{ html: getLeafletHtml(originCoords, destCoords, routeCoordinates, true) }}
              style={StyleSheet.absoluteFillObject}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
            {/* Legend Overlay */}
            <View style={styles.legendOverlay}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Origin Pin</Text>
              </View>
              <View style={[styles.legendRow, { marginTop: 6 }]}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
                <Text style={styles.legendText}>Destination Pin</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: ROUNDED.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainer,
    position: 'relative',
  },
  mapImage: {
    opacity: 0.85,
  },
  expandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  routeCard: {
    position: 'absolute',
    left: SPACING.stackMd,
    right: SPACING.stackMd,
    bottom: SPACING.stackMd,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: ROUNDED.default,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 69, 50, 0.1)',
  },
  dotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    width: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dashLine: {
    width: 1.5,
    height: 20,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: 2,
  },
  textContainer: {
    flex: 1,
  },
  routeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.margin,
    paddingVertical: SPACING.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitleContainer: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: 200,
  },
  modalMapWrapper: {
    flex: 1,
    position: 'relative',
  },
  legendOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: ROUNDED.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
});
