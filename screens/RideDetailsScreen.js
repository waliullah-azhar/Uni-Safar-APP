import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';
import { MiniMap } from '../components/MiniMap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SHEET_HEIGHT = SCREEN_HEIGHT * 0.45;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

export const RideDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { rideId } = route.params;
  const { rides, requestToJoin, currentUser, history, requests, startTripTracking } = useAppContext();
  
  const contextRide = rides.find((r) => r.id === rideId) || rides[0];
  const [ride, setRide] = useState(contextRide);

  const [proposedFare, setProposedFare] = useState(contextRide.fare.toString());
  const [successVisible, setSuccessVisible] = useState(false);
  const [acceptedPassengers, setAcceptedPassengers] = useState([]);
  const [driverPhone, setDriverPhone] = useState('');
  const [isUserAccepted, setIsUserAccepted] = useState(false);

  // Sync state with context updates (e.g. 5-second context polls)
  useEffect(() => {
    if (contextRide) {
      setRide(contextRide);
    }
  }, [contextRide]);

  // Real-time tracking coordinator sync
  useEffect(() => {
    const numericTripId = parseInt(rideId);
    if (isNaN(numericTripId)) return;

    console.log(`[REALTIME] Subscribing to postgres_changes for trip ID: ${numericTripId}`);
    
    // 1. Supabase Realtime channel subscription for instant coordinates
    const channelId = `trip-tracking-${numericTripId}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${numericTripId}`
        },
        (payload) => {
          console.log('[REALTIME] Received live trip update:', payload.new);
          const geom = payload.new.route_geometry || {};
          let currentC = null;
          if (geom.current_coords) {
            currentC = {
              lat: geom.current_coords[1].toString(),
              lon: geom.current_coords[0].toString()
            };
          }
          setRide(prev => {
            if (!prev || prev.id !== payload.new.id.toString()) return prev;
            return {
              ...prev,
              status: payload.new.status,
              isTrackingActive: geom.is_tracking_active === true,
              currentIndex: geom.current_index ? parseInt(geom.current_index) : 0,
              currentCoords: currentC
            };
          });
        }
      )
      .subscribe((status) => {
        console.log(`[REALTIME] Channel status for trip ${numericTripId}: ${status}`);
      });

    // 2. Direct Polling Fallback (every 3 seconds) for robust sync
    const fetchTripCoords = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('route_geometry, status')
          .eq('id', numericTripId)
          .single();
        
        if (error) {
          console.log('[POLLING] fetchTripCoords DB Error:', error.message);
          return;
        }

        if (data && data.route_geometry) {
          const geom = data.route_geometry;
          let currentC = null;
          if (geom.current_coords) {
            currentC = {
              lat: geom.current_coords[1].toString(),
              lon: geom.current_coords[0].toString()
            };
          }
          setRide(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status: data.status,
              isTrackingActive: geom.is_tracking_active === true,
              currentIndex: geom.current_index ? parseInt(geom.current_index) : 0,
              currentCoords: currentC
            };
          });
        }
      } catch (err) {
        console.log('[POLLING] fetchTripCoords Exception:', err);
      }
    };

    fetchTripCoords(); // run immediately
    const pollInterval = setInterval(fetchTripCoords, 3000);

    return () => {
      console.log(`[REALTIME] Cleaning up channel and polling for trip ID: ${numericTripId}`);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [rideId]);

  // Check if current user is matched as passenger to this trip
  const matchedTrip = history.find(h => h.type === 'rider' && h.rideId === ride.id && h.status === 'COMPLETED');
  const isMatched = !!matchedTrip || isUserAccepted;

  const pendingTrip = history.find(h => h.type === 'rider' && h.rideId === ride.id && (h.status === 'PENDING' || h.status === 'COUNTERED'));
  const isPending = !!pendingTrip;

  // Haversine formula to compute distance in km between two coords
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const totalDuration = parseInt(ride.duration) || 15;
  const currentIndex = ride.currentIndex || 0;
  const totalCount = ride.totalCoordinatesCount || 10;
  const remainingCount = Math.max(0, totalCount - currentIndex);
  const remainingPercent = totalCount > 0 ? remainingCount / totalCount : 0;
  
  const totalDistance = parseFloat(ride.distance) || 5.0;

  // Dynamically compute remaining distance using the Haversine formula on real-time coords
  const distanceRemaining = ride.currentCoords && ride.destCoords
    ? getDistanceKm(
        parseFloat(ride.currentCoords.lat),
        parseFloat(ride.currentCoords.lon),
        parseFloat(ride.destCoords.lat),
        parseFloat(ride.destCoords.lon)
      ).toFixed(1)
    : (totalDistance * remainingPercent).toFixed(1);

  // Dynamically compute remaining ETA based on remaining distance proportion
  const etaMinutes = ride.currentCoords && ride.destCoords && totalDistance > 0
    ? Math.max(1, Math.round((parseFloat(distanceRemaining) / totalDistance) * totalDuration))
    : Math.round(totalDuration * remainingPercent);

  const handleShareLocation = async () => {
    const isLive = ride.isTrackingActive && ride.currentCoords;
    const trackingUrl = isLive
      ? `http://maps.google.com/?q=${ride.currentCoords.lat},${ride.currentCoords.lon}`
      : `http://maps.google.com/?q=${ride.originCoords?.lat || '0'},${ride.originCoords?.lon || '0'}`;

    const message = isLive
      ? `UniRide Location Sharing: I'm currently on a live carpool ride with ${ride.driverName} from ${ride.origin.split(',')[0]} to ${ride.destination.split(',')[0]}. Live ETA: ${etaMinutes} mins (${distanceRemaining} km remaining). Track our location live: ${trackingUrl}`
      : `UniRide Location Sharing: I have booked a carpool ride with ${ride.driverName} from ${ride.origin.split(',')[0]} to ${ride.destination.split(',')[0]} departing at ${ride.departure}. You can track the route here: ${trackingUrl}`;

    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) {
        Alert.alert('Shared!', 'Trip status and coordinates shared successfully.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  useEffect(() => {
    const fetchAcceptedPassengers = async () => {
      const numericTripId = parseInt(ride?.id);
      if (isNaN(numericTripId)) {
        // Mock fallback
        const mockAccepted = requests.filter(r => r.rideId === ride?.id && r.status === 'accepted');
        const initialPool = ride?.currentPool || [];
        const mappedMock = mockAccepted.map(r => ({
          name: r.riderName.split(' ')[0],
          photo: r.riderPhoto
        }));
        setAcceptedPassengers([...initialPool, ...mappedMock]);

        const matchedTrip = history.find(h => h.type === 'rider' && h.rideId === ride?.id && h.status === 'COMPLETED');
        if (matchedTrip) {
          setIsUserAccepted(true);
          setDriverPhone(matchedTrip.phone || '+92 300 7654321');
        } else {
          setIsUserAccepted(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ride_requests')
          .select(`
            id,
            passenger_id,
            profiles:passenger_id (
              id,
              full_name,
              profile_picture_url
            ),
            trips:trip_id (
              driver_id,
              profiles:driver_id (
                phone_number
              )
            )
          `)
          .eq('trip_id', numericTripId)
          .eq('status', 'Accepted');
          
        if (error) {
          console.log('Error fetching accepted passengers:', error.message);
          return;
        }

        if (data) {
          const passengers = data.map(r => ({
            name: r.profiles?.full_name?.split(' ')[0] || 'Passenger',
            photo: r.profiles?.profile_picture_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
          }));
          setAcceptedPassengers(passengers);

          // Check if current user is one of the accepted passengers
          const userReq = data.find(r => r.passenger_id === currentUser?.id);
          if (userReq) {
            setIsUserAccepted(true);
            const phone = userReq.trips?.profiles?.phone_number;
            if (phone) {
              setDriverPhone(phone);
            }
          } else {
            setIsUserAccepted(false);
          }
        }
      } catch (err) {
        console.log('Exception fetching accepted passengers:', err);
      }
    };

    if (ride && ride.id) {
      fetchAcceptedPassengers();
      const interval = setInterval(fetchAcceptedPassengers, 5000);
      return () => clearInterval(interval);
    }
  }, [ride?.id, currentUser?.id, requests, history]);

  // Automatically trigger location tracking on driver's device if departure is near/passed and requests are accepted
  useEffect(() => {
    if (ride && ride.driverId === currentUser?.id && acceptedPassengers.length > 0 && !ride.isTrackingActive) {
      const startTrackingAutomatically = async () => {
        console.log('[AUTO-TRACKING] Initiating mandatory live location sharing for driver...');
        const success = await startTripTracking(ride.id);
        if (success) {
          Alert.alert(
            'Live Location Sharing Active',
            'Your trip has started! Your live device coordinates are now being shared automatically with your accepted passengers as required.',
            [{ text: 'OK' }]
          );
        }
      };
      
      const departureTimeStr = ride.departure; // e.g. "04:30 PM"
      const now = new Date();
      
      const parseTimeToToday = (timeStr) => {
        if (!timeStr) return null;
        const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const ampm = match[3].toUpperCase();
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          const today = new Date();
          today.setHours(hours, minutes, 0, 0);
          return today;
        }
        return null;
      };

      const departureTime = parseTimeToToday(departureTimeStr);
      if (departureTime) {
        const timeDiffMs = departureTime.getTime() - now.getTime();
        const fifteenMinsMs = 15 * 60 * 1000;
        
        // If departure time has already passed or is starting in less than 15 minutes
        if (timeDiffMs <= fifteenMinsMs) {
          startTrackingAutomatically();
        }
      } else {
        // Fallback: if time format is not PM/AM (e.g. ISO string), just check if it's today
        startTrackingAutomatically();
      }
    }
  }, [ride?.id, ride?.driverId, currentUser?.id, acceptedPassengers.length, ride?.isTrackingActive]);

  const notifiedReachRef = useRef(false);
  useEffect(() => {
    if (isMatched && ride && ride.isTrackingActive && etaMinutes > 0 && etaMinutes <= 2) {
      if (!notifiedReachRef.current) {
        notifiedReachRef.current = true;
        Alert.alert(
          "Destination Approaching",
          `You will reach your destination in less than 2 minutes! Please rate your driver now.`,
          [
            {
              text: "Rate Driver",
              onPress: () => {
                navigation.navigate('ReviewModal', { driverName: ride.driverName || 'Sarah Jenkins' });
              }
            },
            { text: "Dismiss", style: "cancel" }
          ]
        );
      }
    }
  }, [isMatched, ride?.isTrackingActive, etaMinutes]);

  const notifiedCompleteRef = useRef(false);
  useEffect(() => {
    if (isMatched && ride && ride.status === 'Completed') {
      if (!notifiedCompleteRef.current) {
        notifiedCompleteRef.current = true;
        Alert.alert(
          "Trip Completed",
          "You have reached your destination! Please rate your driver now.",
          [
            {
              text: "Rate Driver",
              onPress: () => {
                navigation.navigate('ReviewModal', { driverName: ride.driverName || 'Sarah Jenkins' });
              }
            }
          ],
          { cancelable: false }
        );
      }
    }
  }, [isMatched, ride?.status]);

  // Bottom Sheet animations
  const sheetHeight = useRef(new Animated.Value(MIN_SHEET_HEIGHT)).current;
  const isExpanded = useRef(false);

  const toggleSheet = () => {
    isExpanded.current = !isExpanded.current;
    Animated.spring(sheetHeight, {
      toValue: isExpanded.current ? MAX_SHEET_HEIGHT : MIN_SHEET_HEIGHT,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        // Drag sheet height upwards or downwards
        const newHeight = isExpanded.current 
          ? MAX_SHEET_HEIGHT - gestureState.dy
          : MIN_SHEET_HEIGHT - gestureState.dy;
        
        if (newHeight >= MIN_SHEET_HEIGHT && newHeight <= MAX_SHEET_HEIGHT) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy < -50) {
          // Swipe Up
          isExpanded.current = true;
          Animated.spring(sheetHeight, {
            toValue: MAX_SHEET_HEIGHT,
            friction: 8,
            useNativeDriver: false,
          }).start();
        } else if (gestureState.dy > 50) {
          // Swipe Down
          isExpanded.current = false;
          Animated.spring(sheetHeight, {
            toValue: MIN_SHEET_HEIGHT,
            friction: 8,
            useNativeDriver: false,
          }).start();
        } else {
          // Reset to current state
          Animated.spring(sheetHeight, {
            toValue: isExpanded.current ? MAX_SHEET_HEIGHT : MIN_SHEET_HEIGHT,
            friction: 8,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const handleAdjustFare = (amount) => {
    let current = parseFloat(proposedFare) || 0;
    let next = current + amount;
    if (next < 0) next = 0;
    setProposedFare(next.toFixed(2));
  };

  const handleRequestJoin = async () => {
    if (currentUser?.verificationStatus !== 'verified') {
      Alert.alert(
        'Verification Required',
        'You cannot request a ride until your account is verified by the admin. Please complete your profile verification under the Profile tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Block requesting other rides if rider already has an active match
    const hasActiveMatch = (history || []).some(h => h.type === 'rider' && h.status === 'COMPLETED');
    if (hasActiveMatch) {
      Alert.alert(
        'Request Blocked',
        'You already have a confirmed match for an active ride. You cannot request to join other rides.',
        [{ text: 'OK' }]
      );
      return;
    }

    const success = await requestToJoin(ride.id, parseFloat(proposedFare));
    if (success !== false) {
      setSuccessVisible(true);
    }
  };

  // Detect currency symbol
  const currencySymbol = ride.fare > 100 ? 'Rs.' : '$';

  return (
    <View style={styles.container}>
      {/* Map Section (Top Half) */}
      <View style={styles.mapContainer}>
        <MiniMap
          mapImage={ride.mapImage}
          origin={ride.origin}
          destination={ride.destination}
          originCoords={ride.originCoords}
          destCoords={ride.destCoords}
          routeCoordinates={ride.routeCoordinates}
          driverCoords={ride.currentCoords}
          height={SCREEN_HEIGHT * 0.6}
        />
        
        {/* Floating Back Button & Header Badge */}
        <View style={[styles.floatingHeader, { top: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.detailsBadge}>
            <Text style={styles.detailsBadgeText}>Ride Details</Text>
          </View>
          {isMatched ? (
            <TouchableOpacity onPress={handleShareLocation} style={styles.backBtn}>
              <Ionicons name="share-social-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      {/* Sliding Sheet Card (Bottom Half) Wrapped in KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200 }}
      >
        <Animated.View style={[styles.slidingSheet, { height: sheetHeight, position: 'relative' }]}>
        {/* Drag Handle */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={toggleSheet}
          {...panResponder.panHandlers}
          style={styles.dragHandleContainer}
        >
          <View style={styles.dragHandle} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {/* Header Info */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text numberOfLines={1} style={styles.rideTitle}>{ride.routeDescription || `Ride to ${ride.destination.split(',')[0]}`}</Text>
              <View style={styles.rowAlign}>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>On Time</Text>
                </View>
                <Text style={styles.detailsSubText}>
                  {ride.departure} • {ride.distance || '4.2 km'}
                </Text>
              </View>
              {ride.routeDescription ? (
                <View style={[styles.rowAlign, { marginTop: 4 }]}>
                  <Ionicons name="navigate-circle" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>
                    {ride.routeDescription} ({ride.duration || '12 mins'})
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.fareHighlight}>
                {currencySymbol} {ride.fare}
              </Text>
              <Text style={styles.fareSub}>Suggested Fare</Text>
            </View>
          </View>

          {/* Driver Profile card */}
          <View style={styles.driverProfileCard}>
            <Image source={{ uri: ride.driverPhoto }} style={styles.driverPhotoLarge} />
            <View style={{ flex: 1, marginLeft: SPACING.stackMd }}>
              <View style={styles.rowAlign}>
                <Text style={styles.driverNameLarge}>{ride.driverName}</Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color={COLORS.primary} />
                  <Text style={styles.ratingText}>{ride.driverStar}</Text>
                </View>
              </View>
              <Text style={styles.driverBio}>
                "{ride.bio || 'Stanford commuter. Always reliable and safe rides.'}"
              </Text>
            </View>
            <TouchableOpacity style={styles.chatBtn}>
              <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Current Pool */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>CURRENT POOL ({acceptedPassengers.length + 1}/{ride.totalSeats})</Text>
            <View style={styles.poolRow}>
              {/* Driver always in pool */}
              <View style={styles.poolerCol}>
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: ride.driverPhoto }} style={styles.poolerAvatar} />
                  <View style={[styles.avatarCheck, { backgroundColor: COLORS.primary }]}>
                    <Ionicons name="car" size={8} color={COLORS.white} />
                  </View>
                </View>
                <Text style={styles.poolerName}>{ride.driverName.split(' ')[0]} (D)</Text>
              </View>

              {acceptedPassengers.map((pooler, index) => (
                <View key={index} style={styles.poolerCol}>
                  <View style={styles.avatarWrapper}>
                    <Image source={{ uri: pooler.photo }} style={styles.poolerAvatar} />
                    <View style={styles.avatarCheck}>
                      <Ionicons name="checkmark" size={8} color={COLORS.white} />
                    </View>
                  </View>
                  <Text style={styles.poolerName}>{pooler.name}</Text>
                </View>
              ))}

              {/* Dynamic Empty slots based on remaining seat capacity */}
              {Array.from({ length: Math.max(0, ride.totalSeats - 1 - acceptedPassengers.length) }).map((_, idx) => (
                <View key={'empty_' + idx} style={styles.poolerCol}>
                  <View style={styles.avatarAdder}>
                    <Ionicons name="add" size={20} color={COLORS.outline} />
                  </View>
                  <Text style={[styles.poolerName, { color: COLORS.outline }]}>Open</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fare Negotiation / Matched Tracking Info */}
          {ride.driverId === currentUser?.id ? (
            <View style={{ gap: SPACING.stackMd }}>
              {/* Driver View Panel */}
              <View style={[styles.negotiationCard, { backgroundColor: 'rgba(27, 107, 81, 0.04)', borderColor: 'rgba(27, 107, 81, 0.2)', borderWidth: 1 }]}>
                <View style={styles.rowSpace}>
                  <Text style={[styles.negotiationTitle, { color: COLORS.primary }]}>Your Listed Ride 🚗</Text>
                  <Ionicons name="car-sport" size={20} color={COLORS.primary} />
                </View>
                <Text style={[styles.negotiationDesc, { color: COLORS.text, fontWeight: '500', marginTop: 8 }]}>
                  {ride.isTrackingActive 
                    ? "You are currently sharing your live location. Riders can track your movement in real-time."
                    : "When departure time approaches, tap below to share your live location with accepted riders."}
                </Text>
                
                {!ride.isTrackingActive ? (
                  <TouchableOpacity
                    onPress={async () => {
                      const success = await startTripTracking(ride.id);
                      if (success) {
                        Alert.alert('Tracking Enabled', 'Your live coordinates are now being shared with your passengers!');
                      }
                    }}
                    style={{ backgroundColor: COLORS.success, paddingVertical: 12, borderRadius: ROUNDED.md, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center' }}
                  >
                    <Ionicons name="location" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                    <Text style={{ color: COLORS.white, fontWeight: '750', fontSize: 14 }}>Start Trip & Share Location</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: 'rgba(27, 107, 81, 0.1)', paddingVertical: 12, borderRadius: ROUNDED.md, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.success }}>
                    <Ionicons name="radio-button-on" size={16} color={COLORS.success} style={{ marginRight: 6 }} />
                    <Text style={{ color: COLORS.success, fontWeight: '750', fontSize: 14 }}>Sharing Location Live</Text>
                  </View>
                )}
              </View>
            </View>
          ) : isMatched ? (
            <View style={{ gap: SPACING.stackMd }}>
              {/* Matched Info Card */}
              <View style={[styles.negotiationCard, { backgroundColor: 'rgba(27, 107, 81, 0.04)', borderColor: 'rgba(27, 107, 81, 0.2)', borderWidth: 1 }]}>
                <View style={styles.rowSpace}>
                  <Text style={[styles.negotiationTitle, { color: COLORS.success }]}>Match Confirmed! 🚗</Text>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                </View>
                <Text style={[styles.negotiationDesc, { color: COLORS.text, fontWeight: '500', marginTop: 8 }]}>
                  Your carpool match with {ride.driverName} is active.
                </Text>
                
                {ride.isTrackingActive ? (
                  <View style={{ marginTop: 8, backgroundColor: COLORS.white, padding: 12, borderRadius: ROUNDED.md, borderWidth: 1, borderColor: 'rgba(27, 107, 81, 0.15)' }}>
                    <View style={[styles.rowSpace, { marginBottom: 6 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="radio-button-on" size={16} color={COLORS.success} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 13, fontWeight: '750', color: COLORS.success }}>Driver is Live</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '750', color: COLORS.primary }}>
                        ETA: {etaMinutes} mins
                      </Text>
                    </View>
                    
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>
                      Remaining Distance: <Text style={{ fontWeight: '700', color: COLORS.text }}>{distanceRemaining} km</Text>
                    </Text>

                    {ride.currentCoords && (
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 8 }}>
                        Live Coordinates:{' '}
                        <Text style={{ fontWeight: '700', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                          {parseFloat(ride.currentCoords.lat).toFixed(5)}, {parseFloat(ride.currentCoords.lon).toFixed(5)}
                        </Text>
                      </Text>
                    )}

                    <TouchableOpacity
                      onPress={handleShareLocation}
                      style={{ backgroundColor: 'rgba(0,69,50,0.06)', paddingVertical: 8, borderRadius: ROUNDED.default, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,69,50,0.12)' }}
                    >
                      <Ionicons name="share-social-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '750' }}>Share Location with Family</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 8, backgroundColor: COLORS.surfaceContainer, padding: 12, borderRadius: ROUNDED.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="time-outline" size={16} color={COLORS.outline} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: '750', color: COLORS.outline }}>Awaiting Driver Location</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>
                      Driver has not started the trip yet. Live coordinates tracking will activate as soon as the driver shares location.
                    </Text>
                  </View>
                )}
                
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 8 }}>
                  Meet driver at: {ride.origin.split(',')[0]}
                </Text>
              </View>

              {/* Driver Contact details */}
              <View style={[styles.negotiationCard, { marginTop: 10 }]}>
                <Text style={styles.negotiationTitle}>Driver Contact Details</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
                  Feel free to contact your driver to coordinate pick up:
                </Text>
                <View style={[styles.rowSpace, { marginTop: 12, backgroundColor: COLORS.white, padding: 12, borderRadius: ROUNDED.md, borderWidth: 1, borderColor: COLORS.outlineVariant }]}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.outline }}>PHONE NUMBER</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 2 }}>
                      {driverPhone || matchedTrip?.phone || '+92 300 1234567'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Calling Driver', `Dialing ${driverPhone || matchedTrip?.phone || 'Driver phone'}...`)}
                    style={{ backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: ROUNDED.default, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Ionicons name="call" size={14} color={COLORS.white} style={{ marginRight: 4 }} />
                    <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '750' }}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.negotiationCard}>
              <View style={styles.rowSpace}>
                <Text style={styles.negotiationTitle}>Negotiate Fare</Text>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.outline} />
              </View>
              <Text style={styles.negotiationDesc}>
                The driver's suggested price is based on gas and convenience. You can offer a different amount.
              </Text>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                <TextInput
                  style={styles.fareInput}
                  value={proposedFare}
                  onChangeText={setProposedFare}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.quickAdjustRow}>
                <TouchableOpacity
                  onPress={() => handleAdjustFare(ride.fare > 100 ? 50 : 1.00)}
                  style={styles.adjustBtn}
                >
                  <Text style={styles.adjustText}>
                    +{ride.fare > 100 ? 'Rs. 50' : '$1.00'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAdjustFare(ride.fare > 100 ? -20 : -0.50)}
                  style={styles.adjustBtn}
                >
                  <Text style={styles.adjustText}>
                    -{ride.fare > 100 ? 'Rs. 20' : '$0.50'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setProposedFare(ride.fare.toFixed(2))}
                  style={styles.adjustBtn}
                >
                  <Text style={styles.adjustText}>Match</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, SPACING.margin) }]}>
          {ride.driverId === currentUser?.id ? (
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })} style={styles.requestBtn}>
              <Ionicons name="arrow-back-circle" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.requestBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          ) : isMatched ? (
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })} style={styles.requestBtn}>
              <Ionicons name="arrow-back-circle" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.requestBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          ) : isPending ? (
            <TouchableOpacity disabled={true} style={[styles.requestBtn, { backgroundColor: COLORS.outlineVariant }]}>
              <Ionicons name="time" size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.requestBtnText, { color: COLORS.textSecondary }]}>Pending Request</Text>
            </TouchableOpacity>
          ) : ride.seatsLeft === 0 ? (
            <TouchableOpacity disabled={true} style={[styles.requestBtn, { backgroundColor: COLORS.outlineVariant }]}>
              <Ionicons name="people" size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.requestBtnText, { color: COLORS.textSecondary }]}>Occupied</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleRequestJoin} style={styles.requestBtn}>
              <Ionicons name="person-add" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.requestBtnText}>Request to Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>

      {/* Success Modal Overlay */}
      <Modal visible={successVisible} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.white} />
            </View>
            <Text style={styles.successTitle}>Request Sent!</Text>
            <Text style={styles.successSubtitle}>
              {ride.driverName} will be notified of your join request and fare offer.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSuccessVisible(false);
                navigation.navigate('MainTabs', { screen: 'Feed' });
              }}
              style={styles.successActionBtn}
            >
              <Text style={styles.successActionText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapContainer: {
    height: '60%',
    width: '100%',
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: SPACING.margin,
    right: SPACING.margin,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  backBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  detailsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: ROUNDED.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  detailsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  slidingSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: ROUNDED.xl * 1.3,
    borderTopRightRadius: ROUNDED.xl * 1.3,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 200,
  },
  dragHandleContainer: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.sm,
  },
  sheetScroll: {
    paddingHorizontal: SPACING.margin,
    paddingBottom: 120, // Space for sticky footer button
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.stackLg,
  },
  rideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeTag: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDED.default,
    marginRight: 8,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryContainer,
  },
  detailsSubText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  fareHighlight: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  fareSub: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.outline,
    marginTop: 2,
  },
  driverProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: SPACING.gutter,
    marginBottom: SPACING.stackLg,
  },
  driverPhotoLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primaryFixed,
  },
  driverNameLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 2,
  },
  driverBio: {
    fontSize: 13,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  chatBtn: {
    backgroundColor: COLORS.surfaceContainer,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sectionContainer: {
    marginBottom: SPACING.stackLg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.outline,
    letterSpacing: 1.2,
    marginBottom: SPACING.stackMd,
  },
  poolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
  },
  poolerCol: {
    alignItems: 'center',
    width: 60,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  poolerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  avatarCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  poolerName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  avatarAdder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  negotiationCard: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: ROUNDED.lg,
    padding: SPACING.gutter,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  negotiationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  negotiationDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginVertical: SPACING.stackSm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    paddingHorizontal: SPACING.stackMd,
    height: 54,
    marginTop: 6,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 6,
  },
  fareInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    height: '100%',
  },
  quickAdjustRow: {
    flexDirection: 'row',
    gap: SPACING.stackSm,
    marginTop: SPACING.stackMd,
  },
  adjustBtn: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  sheetFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    padding: SPACING.margin,
    zIndex: 300,
  },
  requestBtn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDED.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  requestBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 69, 50, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.margin,
  },
  successCard: {
    alignItems: 'center',
    maxWidth: 320,
  },
  successIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.stackLg,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.stackSm,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.white,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.stackLg,
  },
  successActionBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: ROUNDED.full,
  },
  successActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
