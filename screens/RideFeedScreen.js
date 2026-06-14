import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';

export const RideFeedScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { rides, requestToJoin, currentUser, verifyProfileMock, cancelTrip, history, cancelRequest } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filter Modal States
  const [filterVisible, setFilterVisible] = useState(false);
  const [genderPref, setGenderPref] = useState('Any'); // 'Any', 'Male', 'Female'
  const [maxFare, setMaxFare] = useState(500);
  const [customFareInput, setCustomFareInput] = useState('');
  const [vehicleTypePref, setVehicleTypePref] = useState('All'); // 'All', 'EV', 'ICE'
  const [sortBy, setSortBy] = useState('none'); // 'none', 'price', 'time', 'distance'
  
  // Request Sent Overlay
  const [requestSentVisible, setRequestSentVisible] = useState(false);
  const [lastRequestedDriver, setLastRequestedDriver] = useState('');

  // Negotiation Modal States
  const [negotiateVisible, setNegotiateVisible] = useState(false);
  const [selectedRideForNegotiation, setSelectedRideForNegotiation] = useState(null);
  const [proposedFareText, setProposedFareText] = useState('');

  // Filter rides based on search query, advanced filters, and same-university matching
  const filteredRides = rides.filter((ride) => {
    // Enforce university level visibility
    const matchesUniversity = 
      ride.university && 
      currentUser.university && 
      ride.university.toLowerCase().trim() === currentUser.university.toLowerCase().trim();

    if (!matchesUniversity) return false;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ride.origin.toLowerCase().includes(query) ||
      ride.destination.toLowerCase().includes(query) ||
      ride.driverName.toLowerCase().includes(query) ||
      ride.carDetails.toLowerCase().includes(query);

    const matchesGender =
      genderPref === 'Any' ||
      (genderPref === 'Male' && ride.genderBreakdown.includes('M')) ||
      (genderPref === 'Female' && ride.genderBreakdown.includes('F'));

    // Determine target max fare budget: custom input overrides quick selections
    const activeMaxFare = customFareInput.trim() !== '' ? parseFloat(customFareInput) : maxFare;
    const matchesFare = isNaN(activeMaxFare) ? true : ride.fare <= activeMaxFare;

    // Filter by vehicle type (ICE vs EV)
    const matchesVehicleType =
      vehicleTypePref === 'All' ||
      (ride.vehicleType && ride.vehicleType.toUpperCase() === vehicleTypePref.toUpperCase()) ||
      (!ride.vehicleType && vehicleTypePref === 'ICE'); // Default to ICE if unspecified

    return matchesSearch && matchesGender && matchesFare && matchesVehicleType;
  });

  // Sort filtered rides
  const sortedRides = [...filteredRides].sort((a, b) => {
    if (sortBy === 'price') {
      return a.fare - b.fare;
    }
    if (sortBy === 'time') {
      const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return parseTime(a.departure) - parseTime(b.departure);
    }
    if (sortBy === 'distance') {
      const parseDistance = (distStr) => {
        if (!distStr) return 0;
        const num = parseFloat(distStr);
        if (isNaN(num)) return 0;
        if (distStr.toLowerCase().includes('mile')) {
          return num * 1.60934;
        }
        return num;
      };
      return parseDistance(a.distance) - parseDistance(b.distance);
    }
    return 0;
  });

  const handleQuickRequest = (ride) => {
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

    setSelectedRideForNegotiation(ride);
    setProposedFareText(ride.fare.toString());
    setNegotiateVisible(true);
  };

  const submitNegotiatedRequest = async () => {
    if (!selectedRideForNegotiation) return;
    const finalFare = parseFloat(proposedFareText);
    if (isNaN(finalFare) || finalFare <= 0) {
      Alert.alert('Invalid Fare', 'Please enter a valid fare amount.');
      return;
    }
    const success = await requestToJoin(selectedRideForNegotiation.id, finalFare);
    if (success !== false) {
      setLastRequestedDriver(selectedRideForNegotiation.driverName);
      setNegotiateVisible(false);
      setRequestSentVisible(true);
    }
  };
  
  const handleCancelTrip = (tripId) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? This will reject all pending requests for this ride.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelTrip(tripId);
            if (success) {
              Alert.alert('Ride Cancelled', 'Your ride has been successfully cancelled.');
            } else {
              Alert.alert('Error', 'Failed to cancel the ride. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  const handleCancelRequest = (requestId) => {
    Alert.alert(
      'Cancel Journey',
      'Are you sure you want to cancel your journey request for this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelRequest(requestId);
            if (success) {
              Alert.alert('Journey Cancelled', 'Your journey has been successfully cancelled.');
            } else {
              Alert.alert('Error', 'Failed to cancel the journey. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRefresh = () => {
    setSearchQuery('');
    setGenderPref('Any');
    setMaxFare(500);
    setCustomFareInput('');
    setVehicleTypePref('All');
    setSortBy('none');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLogo}>UniRide</Text>
          <Text style={styles.headerSubTitle}>{currentUser.university || 'Campus Network'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional verification screens */}
      {currentUser?.verificationStatus !== 'verified' ? (
        <ScrollView contentContainerStyle={styles.lockScrollContent} showsVerticalScrollIndicator={false}>
          {/* Verification Alert Banner */}
          {currentUser?.verificationStatus === 'unverified' && (
            <View style={{ paddingHorizontal: SPACING.padding, marginBottom: SPACING.stackSm, marginTop: SPACING.stackMd }}>
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
                    <TouchableOpacity onPress={() => { verifyProfileMock(); Alert.alert('Verified', 'Mock approved successfully!'); }} style={[styles.bannerActionBtn, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                      <Text style={[styles.bannerActionText, { color: '#b45309' }]}>Debug: Instantly Verify</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {currentUser?.verificationStatus === 'pending' && (
            <View style={{ paddingHorizontal: SPACING.padding, marginBottom: SPACING.stackSm, marginTop: SPACING.stackMd }}>
              <View style={[styles.bannerCard, styles.bannerCardPending]}>
                <View style={styles.bannerIconWrapper}>
                  <Ionicons name="time-outline" size={20} color="#2563eb" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>Verification Pending</Text>
                  <Text style={styles.bannerDesc}>
                    Your details are currently under review. Only verified students can join or post rides.
                  </Text>
                  <TouchableOpacity onPress={() => { verifyProfileMock(); Alert.alert('Verified', 'Mock approved successfully!'); }} style={[styles.bannerActionBtn, { backgroundColor: '#dbeafe', borderColor: '#bfdbfe', marginTop: 8 }]}>
                    <Text style={[styles.bannerActionText, { color: '#2563eb' }]}>Debug: Approve Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.lockContainer}>
            <Ionicons 
              name={currentUser?.verificationStatus === 'pending' ? "time-outline" : "lock-closed-outline"} 
              size={80} 
              color={COLORS.primary} 
              style={{ marginBottom: 20 }}
            />
            <Text style={styles.lockTitle}>
              {currentUser?.verificationStatus === 'pending' ? "Verification Pending" : "Verification Required"}
            </Text>
            <Text style={styles.lockSubtitle}>
              {currentUser?.verificationStatus === 'pending' 
                ? `Your student card has been uploaded. A staff member from ${currentUser.university || 'your campus'} is verifying your details. You will be able to view and request rides once approved.`
                : `To ensure the safety of our peer network, only verified students and staff from ${currentUser.university || 'your campus'} can access active rides. Please upload your student ID card in the Profile tab.`}
            </Text>
            
            <TouchableOpacity 
              style={styles.lockBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.lockBtnText}>
                {currentUser?.verificationStatus === 'pending' ? "Check Verification Status" : "Verify Profile Now"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Search Bar & Filter Button */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={COLORS.outline} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search University, Area, or Date"
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
              />
            </View>
            <TouchableOpacity
              onPress={() => setFilterVisible(true)}
              style={[
                styles.filterBtn,
                (genderPref !== 'Any' || maxFare < 500 || customFareInput.trim() !== '' || vehicleTypePref !== 'All' || sortBy !== 'none') && styles.filterBtnActive,
              ]}
            >
              <Ionicons
                name="funnel"
                size={18}
                color={
                  (genderPref !== 'Any' || maxFare < 500 || customFareInput.trim() !== '' || vehicleTypePref !== 'All' || sortBy !== 'none')
                    ? COLORS.white
                    : COLORS.primaryContainer
                }
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Rides List */}
          <ScrollView contentContainerStyle={styles.feedScrollContent} showsVerticalScrollIndicator={false}>
            {sortedRides.length > 0 ? (
              sortedRides.map((ride) => {
                const acceptedRequest = (history || []).find(
                  (h) => h.type === 'rider' && h.rideId === ride.id && h.status === 'COMPLETED'
                );
                const pendingRequest = (history || []).find(
                  (h) => h.type === 'rider' && h.rideId === ride.id && (h.status === 'PENDING' || h.status === 'COUNTERED')
                );

                return (
                  <TouchableOpacity
                    key={ride.id}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('RideDetails', { rideId: ride.id })}
                    style={styles.rideItemCard}
                  >
                    {/* Card Top: Driver Profile & Fare */}
                    <View style={styles.rideCardTop}>
                      <View style={styles.driverRowMini}>
                        <Image source={{ uri: ride.driverPhoto }} style={styles.driverPhotoMini} />
                        <View style={styles.driverMetaMini}>
                          <Text style={styles.driverNameMini}>{ride.driverName}</Text>
                          <View style={styles.badgeMini}>
                            <Ionicons name="star" size={10} color={COLORS.primary} style={{ marginRight: 2 }} />
                            <Text style={styles.badgeTextMini}>{ride.driverStar}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.fareTagMini}>
                        <Text style={styles.fareTextMini}>Rs. {ride.fare}</Text>
                      </View>
                    </View>

                    {/* Card Middle: Route & Times */}
                    <View style={styles.rideCardMiddle}>
                      <View style={styles.routeContainerMini}>
                        <View style={styles.routeIndicatorsMini}>
                          <View style={styles.dotMini} />
                          <View style={styles.lineMini} />
                          <View style={[styles.dotMini, { backgroundColor: COLORS.primaryContainer }]} />
                        </View>
                        <View style={styles.routeTextColMini}>
                          <Text numberOfLines={1} style={styles.routeTextMini}>{ride.origin.split(',')[0]}</Text>
                          <Text numberOfLines={1} style={[styles.routeTextMini, { marginTop: 6 }]}>{ride.destination.split(',')[0]}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Card Bottom: Meta info and request CTA */}
                    <View style={styles.rideCardBottom}>
                      <View style={styles.metaRowMini}>
                        <View style={styles.genderChipMini}>
                          <Text style={styles.genderTextMini}>{ride.genderBreakdown}</Text>
                        </View>
                        {ride.vehicleType === 'EV' && (
                          <View style={[styles.genderChipMini, { backgroundColor: 'rgba(0, 150, 100, 0.08)' }]}>
                            <Text style={[styles.genderTextMini, { color: '#0f766e' }]}>⚡ EV</Text>
                          </View>
                        )}
                        <Text style={styles.seatsTextMini}>{ride.seatsLeft} / {ride.totalSeats} seats left</Text>
                      </View>
                      
                      <View style={styles.dividerMini} />

                      <View style={styles.actionRowMini}>
                        <View>
                          <Text style={styles.departureLabelMini}>DEPARTURE</Text>
                          <Text style={styles.departureValMini}>{ride.departure}</Text>
                        </View>
                        
                        {ride.driverId === currentUser?.id ? (
                          <TouchableOpacity
                            style={[styles.quickRequestBtn, { backgroundColor: COLORS.error }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCancelTrip(ride.id);
                            }}
                          >
                            <Text style={styles.quickRequestBtnText}>Cancel Ride</Text>
                            <Ionicons name="close-circle-outline" size={16} color={COLORS.white} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        ) : acceptedRequest ? (
                          <TouchableOpacity
                            style={[styles.quickRequestBtn, { backgroundColor: COLORS.error }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCancelRequest(acceptedRequest.requestId);
                            }}
                          >
                            <Text style={styles.quickRequestBtnText}>Cancel Ride</Text>
                            <Ionicons name="close-circle-outline" size={16} color={COLORS.white} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        ) : pendingRequest ? (
                          <TouchableOpacity
                            style={[styles.quickRequestBtn, { backgroundColor: COLORS.outlineVariant }]}
                            disabled={true}
                          >
                            <Text style={[styles.quickRequestBtnText, { color: COLORS.textSecondary }]}>Pending Request</Text>
                            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        ) : ride.seatsLeft === 0 ? (
                          <TouchableOpacity
                            style={[styles.quickRequestBtn, { backgroundColor: COLORS.outlineVariant }]}
                            disabled={true}
                          >
                            <Text style={[styles.quickRequestBtnText, { color: COLORS.textSecondary }]}>Occupied</Text>
                            <Ionicons name="people" size={16} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.quickRequestBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleQuickRequest(ride);
                            }}
                          >
                            <Text style={styles.quickRequestBtnText}>Request Ride</Text>
                            <Ionicons name="arrow-forward-circle" size={16} color={COLORS.white} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              /* Empty State */
              <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={80} color={COLORS.primary} />
                <Text style={styles.emptyTitle}>No matching rides today</Text>
                <Text style={styles.emptySubtitle}>
                  Check back later or try changing your search parameters.
                </Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                  <Text style={styles.refreshBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Advanced Filter Modal */}
      <Modal visible={filterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, SPACING.margin) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Sort Preferences */}
              <Text style={styles.sectionLabel}>Sort Results</Text>
              <View style={styles.filterChipRow}>
                {[
                  { key: 'none', label: 'Recommended' },
                  { key: 'price', label: 'Cheapest Price' },
                  { key: 'time', label: 'Earliest Time' },
                  { key: 'distance', label: 'Shortest Distance' }
                ].map((option) => {
                  const isSelected = sortBy === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setSortBy(option.key)}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Gender Preference */}
              <Text style={[styles.sectionLabel, { marginTop: SPACING.stackLg }]}>Gender Restriction</Text>
              <View style={styles.filterChipRow}>
                {['Any', 'Male', 'Female'].map((gender) => {
                  const isSelected = genderPref === gender;
                  return (
                    <TouchableOpacity
                      key={gender}
                      onPress={() => setGenderPref(gender)}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Vehicle Type preference */}
              <Text style={[styles.sectionLabel, { marginTop: SPACING.stackLg }]}>Vehicle Engine Type</Text>
              <View style={styles.filterChipRow}>
                {[
                  { key: 'All', label: 'All Vehicles' },
                  { key: 'EV', label: 'Electric Only (EV)' },
                  { key: 'ICE', label: 'Gasoline Only' }
                ].map((type) => {
                  const isSelected = vehicleTypePref === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      onPress={() => setVehicleTypePref(type.key)}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Max Fare */}
              <Text style={[styles.sectionLabel, { marginTop: SPACING.stackLg }]}>
                Max Fare Budget (Rs.)
              </Text>
              
              {/* Custom budget entry */}
              <View style={styles.customFareInputContainer}>
                <Ionicons name="card-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.customFareTextInput}
                  placeholder="Enter custom budget (e.g. 130)"
                  placeholderTextColor={COLORS.outline}
                  value={customFareInput}
                  onChangeText={(text) => {
                    setCustomFareInput(text);
                    if (text.trim() !== '') {
                      setMaxFare(0);
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>

              <Text style={[styles.inputHelperText, { marginBottom: 8 }]}>Or select a quick budget limit:</Text>
              
              <View style={styles.fareInputRow}>
                {[100, 150, 200, 300, 500].map((fare) => {
                  const isSelected = maxFare === fare && customFareInput.trim() === '';
                  return (
                    <TouchableOpacity
                      key={fare}
                      onPress={() => {
                        setMaxFare(fare);
                        setCustomFareInput('');
                      }}
                      style={[styles.fareSelectBtn, isSelected && styles.fareSelectBtnActive]}
                    >
                      <Text style={[styles.fareSelectText, isSelected && styles.fareSelectTextActive]}>
                        Rs. {fare}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setFilterVisible(false);
                }}
                style={styles.applyBtn}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Sent Success Modal */}
      <Modal visible={requestSentVisible} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successCheck}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.white} />
            </View>
            <Text style={styles.successTitle}>Request Sent!</Text>
            <Text style={styles.successSubtitle}>
              {lastRequestedDriver} will be notified of your join request and fare offer.
            </Text>
            <TouchableOpacity
              onPress={() => setRequestSentVisible(false)}
              style={styles.successBtn}
            >
              <Text style={styles.successBtnText}>Back to Feed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick Request Negotiation Modal */}
      <Modal visible={negotiateVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Negotiate Fare</Text>
              <TouchableOpacity onPress={() => setNegotiateVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedRideForNegotiation && (
              <View style={styles.modalBody}>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 }}>
                  Suggest a fare for your ride with <Text style={{ fontWeight: '700', color: COLORS.text }}>{selectedRideForNegotiation.driverName}</Text>. The suggested price is Rs. {selectedRideForNegotiation.fare}.
                </Text>

                {/* Input with Prefix */}
                <View style={styles.negotiationInputWrapper}>
                  <Text style={styles.negotiationCurrencyPrefix}>Rs.</Text>
                  <TextInput
                    style={styles.negotiationFareInput}
                    value={proposedFareText}
                    onChangeText={setProposedFareText}
                    keyboardType="numeric"
                  />
                </View>

                {/* Quick adjustment buttons */}
                <View style={styles.quickAdjustRow}>
                  <TouchableOpacity
                    onPress={() => {
                      let current = parseFloat(proposedFareText) || 0;
                      setProposedFareText((current + 50).toFixed(0));
                    }}
                    style={styles.adjustBtn}
                  >
                    <Text style={styles.adjustText}>+Rs. 50</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      let current = parseFloat(proposedFareText) || 0;
                      let next = current - 20;
                      if (next < 0) next = 0;
                      setProposedFareText(next.toFixed(0));
                    }}
                    style={styles.adjustBtn}
                  >
                    <Text style={styles.adjustText}>-Rs. 20</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setProposedFareText(selectedRideForNegotiation.fare.toString());
                    }}
                    style={styles.adjustBtn}
                  >
                    <Text style={styles.adjustText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  onPress={submitNegotiatedRequest}
                  style={[styles.submitNegotiationBtn, { marginTop: 24 }]}
                >
                  <Text style={styles.submitNegotiationBtnText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            )}
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
    paddingVertical: SPACING.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerBtn: {
    padding: 6,
    borderRadius: ROUNDED.full,
    marginLeft: SPACING.stackSm,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.margin,
    paddingVertical: SPACING.stackMd,
    gap: SPACING.gutter,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    paddingHorizontal: 10,
    height: 48,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'System',
    height: '100%',
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: ROUNDED.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  feedScrollContent: {
    paddingHorizontal: SPACING.margin,
    paddingBottom: 24,
  },
  rideItemCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDED.lg,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  rideCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverRowMini: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhotoMini: {
    width: 40,
    height: 40,
    borderRadius: ROUNDED.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  driverMetaMini: {
    marginLeft: 10,
  },
  driverNameMini: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  badgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: ROUNDED.full,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  badgeTextMini: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fareTagMini: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ROUNDED.default,
  },
  fareTextMini: {
    fontSize: 14,
    fontWeight: '850',
    color: COLORS.white,
  },
  rideCardMiddle: {
    marginVertical: 4,
  },
  routeContainerMini: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIndicatorsMini: {
    alignItems: 'center',
    marginRight: 10,
    width: 12,
  },
  dotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  lineMini: {
    width: 1.5,
    height: 14,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: 2,
  },
  routeTextColMini: {
    flex: 1,
  },
  routeTextMini: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  rideCardBottom: {
    marginTop: 12,
  },
  metaRowMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  genderChipMini: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDED.sm,
  },
  genderTextMini: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  seatsTextMini: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 'auto',
  },
  dividerMini: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: 10,
    opacity: 0.6,
  },
  actionRowMini: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departureLabelMini: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  departureValMini: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 1,
  },
  quickRequestBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ROUNDED.default,
  },
  quickRequestBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.margin,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.stackMd,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.stackSm,
    paddingHorizontal: SPACING.stackLg,
  },
  refreshBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: ROUNDED.default,
    marginTop: SPACING.stackMd,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 27, 43, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: ROUNDED.xl,
    borderTopRightRadius: ROUNDED.xl,
    padding: SPACING.margin,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.stackLg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalBody: {
    paddingBottom: SPACING.stackLg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.stackSm,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.stackSm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  fareInputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.stackSm,
  },
  fareSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    backgroundColor: COLORS.white,
  },
  fareSelectBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  fareSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  fareSelectTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: SPACING.stackMd,
  },
  applyBtn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDED.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 69, 50, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.margin,
  },
  successCard: {
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: 340,
  },
  successCheck: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  successBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: ROUNDED.full,
  },
  successBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customFareInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
  },
  customFareTextInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  inputHelperText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
  negotiationInputWrapper: {
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
  negotiationCurrencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 6,
  },
  negotiationFareInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    height: '100%',
  },
  quickAdjustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  adjustBtn: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.surfaceContainerLow,
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
  submitNegotiationBtn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDED.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  submitNegotiationBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  lockScrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: ROUNDED.md,
  },
  lockBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
