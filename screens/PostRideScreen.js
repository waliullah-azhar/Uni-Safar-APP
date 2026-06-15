import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';
import { getStaticMapUrl } from '../constants/MapConfig';
import { MiniMap } from '../components/MiniMap';
import { supabase } from '../lib/supabaseClient';
import * as Location from 'expo-location';

export const PostRideScreen = ({ navigation }) => {
  const { currentUser, postRide } = useAppContext();
  const [currentStep, setCurrentStep] = useState(1);

  // Form States
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('04:30 PM');
  const [seats, setSeats] = useState(3);
  const [selectedVehicle, setSelectedVehicle] = useState(currentUser.savedVehicles[0] || null);
  const [baseFare, setBaseFare] = useState('150'); // Default in Rupees matching the feed
  const [genderPreference, setGenderPreference] = useState('Any Gender'); // 'Any Gender', 'Male Only', 'Female Only'

  useEffect(() => {
    if (!selectedVehicle && currentUser.savedVehicles && currentUser.savedVehicles.length > 0) {
      setSelectedVehicle(currentUser.savedVehicles[0]);
    }
  }, [currentUser.savedVehicles, selectedVehicle]);


  // Autocomplete and Route Selection States
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [originCoords, setOriginCoords] = useState(null); // { lat, lon }
  const [destCoords, setDestCoords] = useState(null); // { lat, lon }
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState(null); // 'origin' or 'dest'

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const searchTimeoutRef = useRef(null);

  // Success Overlay
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (originCoords && destCoords) {
      fetchRoutes();
    } else {
      setRoutes([]);
      setSelectedRoute(null);
    }
  }, [originCoords, destCoords]);

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions in your settings to use your current location.',
          [{ text: 'OK' }]
        );
        return;
      }

      setLoadingSuggestions(true);
      setActiveSearchField('origin');

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const { latitude, longitude } = location.coords;
      console.log(`[CURRENT LOCATION] Lat: ${latitude}, Lon: ${longitude}`);

      const url = `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.features && data.features.length > 0) {
        const topFeature = data.features[0];
        const props = topFeature.properties || {};
        const parts = [
          props.name,
          props.street,
          props.district,
          props.city,
          props.state,
          props.country
        ].filter(Boolean);
        
        const display_name = parts.length > 0 ? parts.join(', ') : 'Current Location';
        setOrigin(display_name);
        setOriginCoords({ lat: latitude.toString(), lon: longitude.toString() });
        console.log(`[CURRENT LOCATION SET] Address: ${display_name}`);
      } else {
        const coordStr = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setOrigin(`Current Location (${coordStr})`);
        setOriginCoords({ lat: latitude.toString(), lon: longitude.toString() });
      }
    } catch (err) {
      console.log('Error getting current location:', err);
      Alert.alert('Error', 'Failed to retrieve your device location. Please type manually.');
    } finally {
      setLoadingSuggestions(false);
      setActiveSearchField(null);
    }
  };

  const fetchSuggestions = async (query, setSuggestions) => {
    setLoadingSuggestions(true);
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&countrycode=pk`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.features) {
        const mapped = data.features.map(feat => {
          const props = feat.properties || {};
          const parts = [
            props.name,
            props.street,
            props.district,
            props.city,
            props.state,
            props.country
          ].filter(Boolean);
          
          const display_name = parts.length > 0 ? parts.join(', ') : 'Unknown Address';
          const coords = feat.geometry && feat.geometry.coordinates;
          const lon = coords ? coords[0].toString() : '0';
          const lat = coords ? coords[1].toString() : '0';
          
          return {
            display_name,
            lat,
            lon
          };
        });
        setSuggestions(mapped);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.log('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originCoords.lon},${originCoords.lat};${destCoords.lon},${destCoords.lat}?overview=full&geometries=geojson&alternatives=true`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        setRoutes(data.routes);
        setSelectedRoute(data.routes[0]);
      } else {
        setRoutes([]);
        setSelectedRoute(null);
      }
    } catch (error) {
      console.log('Error fetching routes:', error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleOriginChange = (text) => {
    setOrigin(text);
    setOriginCoords(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (text.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        setActiveSearchField('origin');
        fetchSuggestions(text, setOriginSuggestions);
      }, 500);
    } else {
      setOriginSuggestions([]);
    }
  };

  const handleDestChange = (text) => {
    setDestination(text);
    setDestCoords(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (text.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        setActiveSearchField('dest');
        fetchSuggestions(text, setDestSuggestions);
      }, 500);
    } else {
      setDestSuggestions([]);
    }
  };

  const getDynamicMapUrl = () => {
    if (!originCoords || !destCoords || !selectedRoute) return null;
    return getStaticMapUrl(originCoords, destCoords, selectedRoute.geometry.coordinates);
  };

  const dynamicMapUrl = getDynamicMapUrl();

  const handleNext = () => {
    if (currentStep < 3) {
      if (currentStep === 1) {
        if (!origin || !destination) {
          Alert.alert('Missing Fields', 'Please fill out origin and destination.');
          return;
        }
        if (!originCoords || !destCoords) {
          Alert.alert('Missing Selection', 'Please select valid start and destination locations from the autocomplete list.');
          return;
        }
        if (!selectedRoute) {
          Alert.alert('Routing Error', 'No routing options could be configured. Please check your start and destination points.');
          return;
        }
      }
      if (currentStep === 2) {
        if (!selectedVehicle) {
          Alert.alert(
            'Vehicle Required',
            'Please select a vehicle. If you do not have one registered, you can add it in the Profile tab.',
            [{ text: 'OK' }]
          );
          return;
        }
        if (!departureTime || !departureTime.trim()) {
          Alert.alert('Time Required', 'Please enter a departure time (e.g. 04:30 PM).');
          return;
        }
      }
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleIncrement = () => {
    if (seats < 8) setSeats((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (seats > 1) setSeats((prev) => prev - 1);
  };

  const handlePublish = async () => {
    if (currentUser?.verificationStatus !== 'verified') {
      Alert.alert(
        'Verification Required',
        'You cannot publish/post a ride until your account is verified by the admin. Please complete your profile verification under the Profile tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Check if driver already has an active trip (status 'Open' or 'Full')
      const { data, error } = await supabase
        .from('trips')
        .select('id')
        .eq('driver_id', currentUser.id)
        .in('status', ['Open', 'Full']);

      if (error) {
        console.log('Error checking active trips:', error.message);
        Alert.alert('Database Query Error', `Failed to check active rides: ${error.message}`);
        return;
      } else if (data && data.length > 0) {
        Alert.alert(
          'Active Ride Limit',
          `At a time one driver only post one ride. You already have an active ride posted. (Debug IDs: ${data.map(d => d.id).join(', ')})`,
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (err) {
      console.log('Exception checking active trips:', err);
    }

    Alert.alert(
      'Confirm Publishing',
      `Are you sure you want to publish this ride from ${origin.split(',')[0]} to ${destination.split(',')[0]} for Rs. ${baseFare} per seat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Publish', 
          onPress: async () => {
            const success = await postRide({
              origin,
              destination,
              departureTime,
              seats,
              vehicleName: selectedVehicle ? `${selectedVehicle.color} ${selectedVehicle.make} ${selectedVehicle.model}` : 'Toyota Corolla',
              vehicleType: selectedVehicle ? selectedVehicle.type : 'ICE',
              baseFare,
              mapImage: dynamicMapUrl,
              distance: selectedRoute ? `${(selectedRoute.distance / 1000).toFixed(1)} km` : '4.2 km',
              duration: selectedRoute ? `${Math.round(selectedRoute.duration / 60)} mins` : '12 mins',
              routeDescription: selectedRoute ? `via ${selectedRoute.legs[0]?.summary || 'Expressway'}` : 'via Expressway',
              originCoords,
              destCoords,
              routeCoordinates: selectedRoute ? selectedRoute.geometry.coordinates : null,
              genderPreference,
            });
            if (success) {
              setSuccessVisible(true);
            }
          }
        }
      ]
    );
  };

  const handleAddWaypoint = (point) => {
    if (!origin) {
      setOrigin(point);
    } else if (!destination) {
      setDestination(point);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Ride</Text>
        </View>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step {currentStep} / 3</Text>
        </View>
      </View>

      {/* Verification Alert Banner */}
      {currentUser?.verificationStatus === 'unverified' && (
        <View style={{ paddingHorizontal: SPACING.padding, marginBottom: SPACING.stackSm, marginTop: 8 }}>
          <View style={[styles.bannerCard, styles.bannerCardWarning]}>
            <View style={styles.bannerIconWrapper}>
              <Ionicons name="warning-outline" size={20} color="#b45309" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Profile Incomplete</Text>
              <Text style={styles.bannerDesc}>
                Upload your university card details in the Profile tab to request or publish rides.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.bannerActionBtn}>
                  <Text style={styles.bannerActionText}>Complete Setup</Text>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {currentUser?.verificationStatus === 'pending' && (
        <View style={{ paddingHorizontal: SPACING.padding, marginBottom: SPACING.stackSm, marginTop: 8 }}>
          <View style={[styles.bannerCard, styles.bannerCardPending]}>
            <View style={styles.bannerIconWrapper}>
              <Ionicons name="time-outline" size={20} color="#2563eb" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Verification Pending</Text>
              <Text style={styles.bannerDesc}>
                Your details are currently under review. Only verified students can join or post rides.
              </Text>
            </View>
          </View>
        </View>
      )}

      {currentUser?.verificationStatus === 'rejected' && (
        <View style={{ paddingHorizontal: SPACING.padding, marginBottom: SPACING.stackSm, marginTop: 8 }}>
          <View style={[styles.bannerCard, styles.bannerCardError]}>
            <View style={styles.bannerIconWrapper}>
              <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: COLORS.error }]}>Verification Rejected</Text>
              <Text style={styles.bannerDesc}>
                Reason: {currentUser.rejectReason || 'Invalid details provided.'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.bannerActionBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                  <Text style={[styles.bannerActionText, { color: '#dc2626' }]}>Re-upload Details</Text>
                  <Ionicons name="arrow-forward" size={12} color="#dc2626" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Route & Logistics */}
        {currentStep === 1 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Where are you heading?</Text>
              <Text style={styles.stepSubtitle}>
                Set your origin and destination, then choose a route option below.
              </Text>
            </View>

            {/* Inputs Card */}
            <View style={styles.card}>
              <View style={styles.routeInputs}>
                <View style={styles.timelineIndicators}>
                  <View style={[styles.timelineDot, { backgroundColor: COLORS.primary }]} />
                  <View style={styles.timelineLine} />
                  <View style={[styles.timelineDot, { backgroundColor: COLORS.primaryContainer }]} />
                </View>

                <View style={{ flex: 1 }}>
                  {/* Origin Field */}
                  <View style={styles.inputWrapperRel}>
                    <Text style={styles.inputLabel}>Starting Point</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Type starting point (e.g. DHA Suffa)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={origin}
                      onChangeText={handleOriginChange}
                    />
                    <TouchableOpacity
                      onPress={useCurrentLocation}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 6,
                        alignSelf: 'flex-start',
                        paddingVertical: 4,
                        paddingHorizontal: 2,
                      }}
                    >
                      <Ionicons name="location" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: '750', color: COLORS.primary }}>
                        Use Current Location
                      </Text>
                    </TouchableOpacity>
                    {loadingSuggestions && activeSearchField === 'origin' ? (
                      <View style={styles.loadingSuggestionsContainer}>
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.loadingSuggestionsText}>Searching locations...</Text>
                      </View>
                    ) : null}
                    {activeSearchField === 'origin' && originSuggestions.length > 0 ? (
                      <View style={styles.suggestionsListInline}>
                        {originSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.suggestionItem}
                            onPress={() => {
                              setOrigin(item.display_name);
                              setOriginCoords({ lat: item.lat, lon: item.lon });
                              setOriginSuggestions([]);
                              setActiveSearchField(null);
                            }}
                          >
                            <Ionicons name="location-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                            <Text numberOfLines={1} style={styles.suggestionText}>
                              {item.display_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  {/* Destination Field */}
                  <View style={[styles.inputWrapperRel, { marginTop: SPACING.stackMd }]}>
                    <Text style={styles.inputLabel}>Destination</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Type destination (e.g. Clifton)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={destination}
                      onChangeText={handleDestChange}
                    />
                    {loadingSuggestions && activeSearchField === 'dest' ? (
                      <View style={styles.loadingSuggestionsContainer}>
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.loadingSuggestionsText}>Searching locations...</Text>
                      </View>
                    ) : null}
                    {activeSearchField === 'dest' && destSuggestions.length > 0 ? (
                      <View style={styles.suggestionsListInline}>
                        {destSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.suggestionItem}
                            onPress={() => {
                              setDestination(item.display_name);
                              setDestCoords({ lat: item.lat, lon: item.lon });
                              setDestSuggestions([]);
                              setActiveSearchField(null);
                            }}
                          >
                            <Ionicons name="location-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                            <Text numberOfLines={1} style={styles.suggestionText}>
                              {item.display_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Waypoint Pickers */}
              <View style={styles.waypointContainer}>
                <Text style={styles.waypointLabel}>Quick Location Shortcuts</Text>
                <View style={styles.waypointRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setOrigin('DHA Suffa University, Karachi');
                      setOriginCoords({ lat: '24.8146336', lon: '67.0800032' });
                    }}
                    style={styles.waypointBtn}
                  >
                    <Ionicons name="school-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.waypointText}>DHA Suffa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setDestination('Clifton Karachi');
                      setDestCoords({ lat: '24.8190552', lon: '67.0262397' });
                    }}
                    style={styles.waypointBtn}
                  >
                    <Ionicons name="location-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.waypointText}>Clifton</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Map Preview Card (Directly below Inputs Card) */}
            {originCoords && destCoords && selectedRoute ? (
              <View style={styles.mapPreviewCard}>
                <MiniMap
                  mapImage={dynamicMapUrl}
                  origin={origin}
                  destination={destination}
                  originCoords={originCoords}
                  destCoords={destCoords}
                  routeCoordinates={selectedRoute.geometry.coordinates}
                  height={180}
                />
                <View style={styles.mapTag}>
                  <Ionicons name="shuffle" size={16} color={COLORS.primary} />
                  <Text style={styles.mapTagText}>
                    {(selectedRoute.distance / 1000).toFixed(1)} km Route Visualized
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.mapPreviewCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surfaceContainer }]}>
                <Ionicons name="map-outline" size={40} color={COLORS.outline} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 8 }}>
                  Enter start & destination points to display route.
                </Text>
              </View>
            )}

            {/* Route Alternatives (Displayed BELOW Map Card) */}
            {loadingRoutes ? (
              <View style={[styles.card, { marginTop: SPACING.stackMd, alignItems: 'center', paddingVertical: 20 }]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 8 }}>
                  Finding routing alternatives...
                </Text>
              </View>
            ) : routes.length > 0 ? (
              <View style={[styles.card, { marginTop: SPACING.stackMd }]}>
                <Text style={styles.waypointLabel}>CHOOSE YOUR ROUTE OPTION</Text>
                <View style={styles.routesRow}>
                  {routes.slice(0, 3).map((route, index) => {
                    const isSelected = selectedRoute === route;
                    const routeSummary = route.legs[0]?.summary || `Route ${index + 1}`;
                    const distanceText = `${(route.distance / 1000).toFixed(1)} km`;
                    const durationText = `${Math.round(route.duration / 60)} mins`;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.routeOptionCard, isSelected && styles.routeOptionCardActive]}
                        onPress={() => setSelectedRoute(route)}
                      >
                        <View style={styles.routeHeaderRow}>
                          <Ionicons
                            name="navigate"
                            size={14}
                            color={isSelected ? COLORS.white : COLORS.primary}
                          />
                          <Text style={[styles.routeCardLabel, isSelected && styles.routeCardLabelActive]}>
                            Option {index === 0 ? 'A' : index === 1 ? 'B' : 'C'}
                          </Text>
                        </View>
                        <Text numberOfLines={1} style={[styles.routeCardSummary, isSelected && styles.routeCardSummaryActive]}>
                          via {routeSummary}
                        </Text>
                        <View style={styles.routeCardMeta}>
                          <Text style={[styles.routeCardMetaText, isSelected && styles.routeCardMetaTextActive]}>
                            {distanceText} • {durationText}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Step 2: Timing & Capacity */}
        {currentStep === 2 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Timing & Seats</Text>
              <Text style={styles.stepSubtitle}>
                When are you leaving and how many students can you fit?
              </Text>
            </View>

            <View style={styles.row}>
              {/* Departure Input */}
              <View style={[styles.card, { flex: 1, marginRight: SPACING.gutter }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="time" size={18} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Departure Time</Text>
                </View>
                <TextInput
                  style={styles.timeInput}
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="04:30 PM"
                  placeholderTextColor={COLORS.outline}
                />
              </View>

              {/* Seat Counter */}
              <View style={[styles.card, { flex: 1 }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="people" size={18} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Available Seats</Text>
                </View>
                <View style={styles.counterRow}>
                  <TouchableOpacity onPress={handleDecrement} style={styles.counterBtn}>
                    <Ionicons name="remove" size={20} color={COLORS.text} />
                  </TouchableOpacity>
                  <Text style={styles.counterVal}>{seats}</Text>
                  <TouchableOpacity onPress={handleIncrement} style={styles.counterBtn}>
                    <Ionicons name="add" size={20} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Vehicle Selector */}
            <View style={[styles.card, { marginTop: SPACING.stackLg }]}>
              <Text style={styles.vehicleLabel}>SELECT REGISTERED VEHICLE</Text>
              {currentUser.savedVehicles.length === 0 ? (
                <View style={styles.noVehiclesContainer}>
                  <Ionicons name="car-outline" size={32} color={COLORS.outline} style={{ marginBottom: SPACING.stackSm }} />
                  <Text style={styles.noVehiclesText}>
                    You haven't registered any vehicles yet.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Profile')}
                    style={styles.goToProfileBtn}
                  >
                    <Text style={styles.goToProfileBtnText}>Go to Profile to Add Vehicle</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                currentUser.savedVehicles.map((vehicle) => {
                  const isSelected = selectedVehicle && selectedVehicle.id === vehicle.id;
                  return (
                    <TouchableOpacity
                      key={vehicle.id}
                      onPress={() => setSelectedVehicle(vehicle)}
                      style={[
                        styles.vehicleOption,
                        isSelected && styles.vehicleOptionActive,
                      ]}
                    >
                      <View style={styles.rowAlign}>
                        <Ionicons
                          name={vehicle.type === 'EV' ? 'flash' : 'car'}
                          size={24}
                          color={isSelected ? COLORS.primary : COLORS.outline}
                          style={{ marginRight: 12 }}
                        />
                        <View>
                          <Text style={styles.vehicleName}>
                            {vehicle.make} {vehicle.model} ({vehicle.year})
                          </Text>
                          <Text style={styles.vehiclePlate}>
                            Plate: {vehicle.plate} • {vehicle.color}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.radioIndicator,
                          isSelected && styles.radioIndicatorActive,
                        ]}
                      >
                        {isSelected ? <View style={styles.radioDot} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Rider Gender Preference Selector */}
            <View style={[styles.card, { marginTop: SPACING.stackLg }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="transgender-outline" size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Rider Gender Preference</Text>
              </View>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 12 }}>
                Select who can request to join your ride:
              </Text>
              <View style={{ flexDirection: 'row', gap: SPACING.stackSm }}>
                {['Any Gender', 'Male Only', 'Female Only'].map((pref) => {
                  const isActive = genderPreference === pref;
                  return (
                    <TouchableOpacity
                      key={pref}
                      onPress={() => setGenderPreference(pref)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderWidth: 1.5,
                        borderColor: isActive ? COLORS.primary : COLORS.outlineVariant,
                        borderRadius: ROUNDED.md,
                        backgroundColor: isActive ? 'rgba(0, 69, 50, 0.05)' : COLORS.white,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isActive ? COLORS.primary : COLORS.textSecondary,
                      }}>
                        {pref}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </View>
        ) : null}

        {/* Step 3: Fare & Confirmation */}
        {currentStep === 3 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Set Your Fare</Text>
              <Text style={styles.stepSubtitle}>
                Recommended base fare for this route is Rs. 150.
              </Text>
            </View>

            {/* Fare input card */}
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
              <View style={styles.fareInputWrapper}>
                <Text style={styles.fareSymbol}>Rs.</Text>
                <TextInput
                  style={styles.fareTextVal}
                  value={baseFare}
                  onChangeText={setBaseFare}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.fareBadge}>
                <Text style={styles.fareBadgeText}>Per Seat Base Fare</Text>
              </View>
            </View>

            {/* Summary card */}
            <View style={[styles.card, { padding: 0, overflow: 'hidden', marginTop: SPACING.stackLg }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.summaryHeaderTitle}>Ride Summary</Text>
              </View>
              <View style={styles.summaryBody}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Route</Text>
                  <Text style={styles.summaryValue}>{origin.split(',')[0]} ➔ {destination.split(',')[0]}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Chosen Path</Text>
                  <Text style={styles.summaryValue}>
                    {selectedRoute ? `via ${selectedRoute.legs[0]?.summary || 'Expressway'}` : 'via Expressway'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Distance & Time</Text>
                  <Text style={styles.summaryValue}>
                    {selectedRoute ? `${(selectedRoute.distance / 1000).toFixed(1)} km • ${Math.round(selectedRoute.duration / 60)} mins` : '4.2 km • 12 mins'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Departure</Text>
                  <Text style={styles.summaryValue}>Today, {departureTime}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Gender Policy</Text>
                  <Text style={styles.summaryValue}>{genderPreference}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Est. Total Earnings</Text>
                  <Text style={styles.summaryTotalValue}>Rs. {parseInt(baseFare || 0) * seats}</Text>
                </View>
              </View>
            </View>

            {/* Insurance disclaimer */}
            <View style={styles.disclaimerRow}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.disclaimerText}>
                Your student insurance covers this peer-to-peer ride.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer Navigation Action Bar */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {currentStep > 1 ? (
            <TouchableOpacity onPress={handlePrev} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : null}
          {currentStep < 3 ? (
            <TouchableOpacity onPress={handleNext} style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handlePublish} style={styles.publishBtn}>
              <Text style={styles.publishBtnText}>Post This Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Success Published Dialog Overlay */}
      <Modal visible={successVisible} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.successTitle}>Ride Published!</Text>
            <Text style={styles.successSubtitle}>
              Students can now see and request seats on your route.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSuccessVisible(false);
                navigation.navigate('MainTabs', { screen: 'Profile' });
              }}
              style={styles.goToRidesBtn}
            >
              <Text style={styles.goToRidesText}>Go to My Rides</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.margin,
    paddingVertical: SPACING.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  stepBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDED.full,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.margin,
    paddingBottom: 120,
  },
  stepContainer: {
    width: '100%',
  },
  stepHeader: {
    marginBottom: SPACING.stackLg,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: SPACING.padding,
  },
  routeInputs: {
    flexDirection: 'row',
  },
  timelineIndicators: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    width: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    height: 48,
    backgroundColor: COLORS.outlineVariant,
    borderStyle: 'dashed',
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingVertical: 6,
  },
  waypointContainer: {
    marginTop: SPACING.stackLg,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainer,
    paddingTop: SPACING.stackMd,
  },
  waypointLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.stackSm,
  },
  waypointRow: {
    flexDirection: 'row',
    gap: SPACING.stackSm,
  },
  waypointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  waypointText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 6,
  },
  mapPreviewCard: {
    marginTop: SPACING.stackLg,
    borderRadius: ROUNDED.lg,
    overflow: 'hidden',
    height: 180,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    position: 'relative',
  },
  mapPreviewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  mapTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDED.full,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  mapTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 6,
  },
  row: {
    flexDirection: 'row',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.stackMd,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 6,
  },
  timeInput: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingVertical: 4,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    padding: 2,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: ROUNDED.default,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  vehicleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.0,
    marginBottom: SPACING.stackMd,
  },
  vehicleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.stackMd,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    marginBottom: SPACING.stackSm,
  },
  vehicleOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 69, 50, 0.05)',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  vehiclePlate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  radioIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioIndicatorActive: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  fareInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fareSymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 6,
  },
  fareTextVal: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    width: 140,
    textAlign: 'center',
  },
  fareBadge: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDED.default,
    marginTop: 12,
  },
  fareBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  summaryHeader: {
    backgroundColor: 'rgba(0, 69, 50, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING.padding,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summaryBody: {
    padding: SPACING.padding,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 12,
    marginTop: 6,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: ROUNDED.lg,
    padding: SPACING.gutter,
    marginTop: SPACING.stackLg,
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
    padding: SPACING.margin,
    zIndex: 100,
  },
  footerRow: {
    flexDirection: 'row',
    gap: SPACING.gutter,
  },
  backBtn: {
    paddingHorizontal: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: ROUNDED.lg,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  continueBtn: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDED.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  publishBtn: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDED.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 27, 43, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.margin,
  },
  successCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDED.xl * 1.5,
    padding: 30,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 69, 50, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.stackLg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.stackSm,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.stackLg,
  },
  goToRidesBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: ROUNDED.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  goToRidesText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionsList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    marginTop: 4,
    maxHeight: 180,
    zIndex: 1000,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    elevation: 5,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerLow,
  },
  suggestionText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  routesWrapper: {
    marginTop: SPACING.stackMd,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainer,
    paddingTop: SPACING.stackMd,
  },
  routesRow: {
    flexDirection: 'row',
    gap: SPACING.stackSm,
    marginTop: 6,
  },
  routeOptionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    padding: 10,
    backgroundColor: COLORS.white,
  },
  routeOptionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  routeCardLabelActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  routeCardSummary: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  routeCardSummaryActive: {
    color: COLORS.white,
  },
  routeCardMeta: {
    marginTop: 6,
  },
  routeCardMetaText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  routeCardMetaTextActive: {
    color: COLORS.white,
  },
  inputWrapperRel: {
    position: 'relative',
    width: '100%',
  },
  suggestionsListInline: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
  },
  loadingSuggestionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  loadingSuggestionsText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  noVehiclesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noVehiclesText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  goToProfileBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: ROUNDED.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goToProfileBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bannerCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: ROUNDED.md,
    borderWidth: 1,
    marginBottom: SPACING.stackMd,
  },
  bannerCardWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.05)',
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  bannerCardError: {
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  bannerCardPending: {
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  bannerIconWrapper: {
    marginRight: 12,
    justifyContent: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  bannerDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  bannerActionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDED.default,
    marginTop: SPACING.stackSm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
});

