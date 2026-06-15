import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';


export const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { 
    currentUser, 
    history, 
    addVehicle, 
    removeVehicle, 
    reviews, 
    setProfile, 
    respondToRiderCounter, 
    signOut, 
    cancelTrip, 
    cancelRequest, 
    startTripTracking,
    fetchHistory,
    fetchRides
  } = useAppContext();
  const [activeTab, setActiveTab] = useState('driver'); // 'driver' or 'rider'

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
      'Cancel Request',
      'Are you sure you want to cancel your ride request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelRequest(requestId);
            if (success) {
              Alert.alert('Request Cancelled', 'Your request has been successfully cancelled.');
            } else {
              Alert.alert('Error', 'Failed to cancel the request. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleStartTracking = async (tripId) => {
    const success = await startTripTracking(tripId);
    if (success) {
      Alert.alert('Tracking Started', 'Your live location is now being shared with your passengers.');
    } else {
      Alert.alert('Error', 'Failed to start location sharing. Please try again.');
    }
  };
  
  // Set profile modal states
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [fullName, setFullName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [profileImage, setProfileImage] = useState(currentUser.profileImage || '');
  const [cardImage, setCardImage] = useState(currentUser.universityCardImage || '');
  const [cardExpiry, setCardExpiry] = useState(currentUser.universityCardExpiry || '');
  const [profileUploading, setProfileUploading] = useState(false);

  // Add vehicle modal states
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('4');
  const [vehicleType, setVehicleType] = useState('ICE'); // 'ICE' or 'EV'

  const handlePickImage = async (type) => {
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libraryStatus !== 'granted') {
      Alert.alert('Permission Denied', 'We need media library permissions to upload cards or photos.');
      return;
    }

    Alert.alert(
      'Choose Image Source',
      'Would you like to take a new photo or select from library?',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus !== 'granted') {
              Alert.alert('Permission Denied', 'We need camera access to capture cards or photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: type === 'profile' ? [1, 1] : [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const uri = result.assets[0].uri;
              if (type === 'profile') setProfileImage(uri);
              else setCardImage(uri);
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: type === 'profile' ? [1, 1] : [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const uri = result.assets[0].uri;
              if (type === 'profile') setProfileImage(uri);
              else setCardImage(uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSetProfile = async () => {
    if (!profileImage.trim()) {
      Alert.alert('Required Field', 'Please take or choose a profile photo.');
      return;
    }
    if (!cardImage.trim()) {
      Alert.alert('Required Field', 'Please take or choose your university card image.');
      return;
    }
    if (!cardExpiry.trim()) {
      Alert.alert('Required Field', 'Please enter your university card expiration date.');
      return;
    }

    // Expiration date verification (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(cardExpiry.trim())) {
      Alert.alert('Invalid Date Format', 'Please enter date in YYYY-MM-DD format (e.g. 2027-12-31).');
      return;
    }

    const parsedDate = new Date(cardExpiry.trim());
    if (isNaN(parsedDate.getTime())) {
      Alert.alert('Invalid Date', 'The entered date is not valid.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedDate < today) {
      Alert.alert('Card Expired', 'The university card is expired! Please enter an active, non-expired card expiry date.');
      return;
    }

    setProfileUploading(true);
    // Call context to update profile
    const success = await setProfile({
      name: fullName,
      bio,
      profileImage: profileImage.trim(),
      universityCardImage: cardImage.trim(),
      universityCardExpiry: cardExpiry.trim(),
    });
    setProfileUploading(false);

    if (success) {
      setProfileModalVisible(false);
      Alert.alert('Profile Submitted', 'Your profile details have been sent to the admin portal for verification.');
    }
  };



  const handleAddVehicle = async () => {
    if (!make || !model || !plate || !color) {
      alert('Please fill out all fields.');
      return;
    }
    const success = await addVehicle({ make, model, year, color, plate, seats, type: vehicleType });
    if (success) {
      setVehicleModalVisible(false);
      
      // Clear form
      setMake('');
      setModel('');
      setYear('');
      setColor('');
      setPlate('');
      setSeats('4');
      setVehicleType('ICE');
    }
  };

  const handleRemoveVehicle = (id, makeModel) => {
    Alert.alert(
      'Remove Vehicle',
      `Are you sure you want to remove your ${makeModel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeVehicle(id) },
      ]
    );
  };

  const driverHistory = history.filter((item) => item.type === 'driver');
  const riderHistory = history.filter((item) => item.type === 'rider');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>UniRide</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out of UniRide?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut }
              ]
            );
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Alert Banner */}
        {currentUser.verificationStatus === 'unverified' && (
          <View style={[styles.bannerCard, styles.bannerCardWarning]}>
            <View style={styles.bannerIconWrapper}>
              <Ionicons name="warning-outline" size={20} color="#b45309" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Profile Incomplete</Text>
              <Text style={styles.bannerDesc}>
                Upload a profile picture and university card details for admin portal approval.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={styles.bannerActionBtn}>
                  <Text style={styles.bannerActionText}>Complete Setup</Text>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {currentUser.verificationStatus === 'pending' && (
          <View style={[styles.bannerCard, styles.bannerCardPending]}>
            <View style={styles.bannerIconWrapper}>
              <Ionicons name="time-outline" size={20} color="#2563eb" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Verification Pending</Text>
              <Text style={styles.bannerDesc}>
                Details sent to admin portal. Your profile is under review.
              </Text>
            </View>
          </View>
        )}

        {currentUser.verificationStatus === 'rejected' && (
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
                <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={[styles.bannerActionBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                  <Text style={[styles.bannerActionText, { color: '#dc2626' }]}>Re-upload Details</Text>
                  <Ionicons name="arrow-forward" size={12} color="#dc2626" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {currentUser.verificationStatus === 'verified' && (
          <View style={[styles.bannerCard, styles.bannerCardSuccess]}>
            <View style={styles.bannerIconWrapper}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Account Verified</Text>
              <Text style={styles.bannerDesc}>
                Your university card and profile are fully approved by the admin.
              </Text>
            </View>
          </View>
        )}

        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileMeta}>
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: currentUser.profileImage || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
                style={styles.photo}
              />
              <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={styles.photoEdit}>
                <Ionicons name="pencil" size={12} color={COLORS.white} />
              </TouchableOpacity>
            </View>
 
             <View style={styles.ratingBadge}>
               <Ionicons name="star" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
               <Text style={styles.ratingBadgeText}>{currentUser.rating} Rating</Text>
             </View>
           </View>
 
           <View style={styles.detailsContainer}>
             <Text style={styles.profileName}>{currentUser.name}</Text>
             {currentUser.email ? (
               <Text style={styles.profileEmail}>{currentUser.email}</Text>
             ) : null}
             
             <View style={styles.chipsRow}>
               <View style={styles.chip}>
                 <Text style={styles.chipText}>{currentUser.university}</Text>
               </View>
               <View style={styles.chip}>
                 <Text style={styles.chipText}>{currentUser.gender}</Text>
               </View>
               {currentUser.verificationStatus === 'verified' ? (
                 <View style={[styles.chip, styles.chipVerified]}>
                   <Ionicons name="checkmark-circle" size={12} color={COLORS.success} style={{ marginRight: 3 }} />
                   <Text style={[styles.chipText, { color: COLORS.success }]}>Verified Student</Text>
                 </View>
               ) : currentUser.verificationStatus === 'pending' ? (
                 <View style={[styles.chip, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
                   <Ionicons name="time" size={12} color="#2563eb" style={{ marginRight: 3 }} />
                   <Text style={[styles.chipText, { color: '#2563eb' }]}>Pending Approval</Text>
                 </View>
               ) : (
                 <View style={[styles.chip, { backgroundColor: 'rgba(186, 26, 26, 0.08)' }]}>
                   <Ionicons name="alert-circle" size={12} color={COLORS.error} style={{ marginRight: 3 }} />
                   <Text style={[styles.chipText, { color: COLORS.error }]}>Unverified Profile</Text>
                 </View>
               )}
             </View>
 
             <Text style={styles.bioText}>"{currentUser.bio}"</Text>
 
             <View style={styles.statsRow}>
               <View style={{ flex: 1 }}>
                 <Text style={styles.statLabel}>TOTAL RIDES</Text>
                 <Text style={styles.statNum}>{currentUser.totalRides}</Text>
               </View>
               <View style={styles.statDivider} />
               <View style={{ flex: 1 }}>
                 <Text style={styles.statLabel}>KM SHARED</Text>
                 <Text style={styles.statNum}>{currentUser.kmShared}</Text>
               </View>
             </View>

             <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={styles.editProfileCardBtn}>
               <Ionicons name="create-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
               <Text style={styles.editProfileCardBtnText}>Set Profile Details</Text>
             </TouchableOpacity>
           </View>
         </View>


        {/* Vehicles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>My Saved Vehicles</Text>
              <Text style={styles.sectionSubtitle}>Manage vehicles you use for driving.</Text>
            </View>
            <TouchableOpacity onPress={() => setVehicleModalVisible(true)} style={styles.addBtn}>
              <Ionicons name="add" size={16} color={COLORS.white} />
              <Text style={styles.addBtnText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.vehiclesList}>
            {currentUser.savedVehicles.map((vehicle) => (
              <View key={vehicle.id} style={[styles.vehicleCard, !vehicle.active && styles.vehicleCardInactive]}>
                <View style={styles.vehicleCardHeader}>
                  <View style={[styles.vehicleIconWrapper, vehicle.active && styles.vehicleIconActive]}>
                    <Ionicons
                      name={vehicle.type === 'EV' ? 'flash' : 'car'}
                      size={20}
                      color={vehicle.active ? COLORS.primaryContainer : COLORS.outline}
                    />
                  </View>
                  <View style={styles.vehicleActions}>
                    <TouchableOpacity style={styles.vehicleActionBtn}>
                      <Ionicons name="pencil" size={16} color={COLORS.outline} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveVehicle(vehicle.id, `${vehicle.make} ${vehicle.model}`)}
                      style={styles.vehicleActionBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.outline} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.vehicleName}>
                  {vehicle.make} {vehicle.model}
                </Text>
                <Text style={styles.vehiclePlate}>
                  {vehicle.color} • Plate: {vehicle.plate}
                </Text>

                <View style={styles.vehicleTags}>
                  <View style={styles.vehicleChip}>
                    <Text style={styles.vehicleChipText}>{vehicle.seats} Seats</Text>
                  </View>
                  <View style={styles.vehicleChip}>
                    <Text style={styles.vehicleChipText}>{vehicle.type}</Text>
                  </View>
                  {!vehicle.active ? (
                    <View style={styles.vehicleChip}>
                      <Text style={[styles.vehicleChipText, { color: COLORS.outline }]}>Inactive</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Ride History Section */}
        <View style={styles.section}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionTitle}>Ride History</Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => setActiveTab('driver')}
                style={[styles.tab, activeTab === 'driver' && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === 'driver' && styles.tabTextActive]}>As Driver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('rider')}
                style={[styles.tab, activeTab === 'rider' && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === 'rider' && styles.tabTextActive]}>As Rider</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* History List */}
          <View style={styles.historyList}>
            {activeTab === 'driver' ? (
              driverHistory.length === 0 ? (
                <View style={styles.emptyHistoryCard}>
                  <Ionicons name="car-outline" size={32} color={COLORS.outline} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyHistoryTitle}>No Driver History</Text>
                  <Text style={styles.emptyHistorySubtitle}>You haven't posted any rides yet. Share a ride to start your journey!</Text>
                </View>
              ) : (
                driverHistory.map((trip) => (
                  <View key={trip.id} style={styles.historyCardContainer}>
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyTimeline}>
                        <View style={styles.timelineIndicators}>
                          <View style={[styles.timelineDot, { backgroundColor: COLORS.primary }]} />
                          <View style={styles.timelineLine} />
                          <View style={[styles.timelineDot, { backgroundColor: COLORS.outline }]} />
                        </View>

                        <View style={styles.tripDetails}>
                          <View>
                            <Text style={styles.tripLabel}>PICKUP</Text>
                            <Text numberOfLines={1} style={styles.tripPoint}>{trip.pickup}</Text>
                            <Text style={styles.tripTime}>{trip.dateRaw}</Text>
                          </View>
                          <View style={{ marginTop: 14 }}>
                            <Text style={styles.tripLabel}>DROP-OFF</Text>
                            <Text numberOfLines={1} style={styles.tripPoint}>{trip.dropoff}</Text>
                            <Text style={styles.tripTime}>{trip.dropoffDateRaw}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.tripMeta}>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>{trip.status}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginVertical: 12 }}>
                          <Text style={styles.tripFare}>
                            {trip.fare > 100 ? `Rs. ${trip.fare}` : `$${trip.fare.toFixed(2)}`}
                          </Text>
                          <Text style={styles.tripRiders}>{trip.riders}</Text>
                        </View>
                        {!(trip.status === 'ACTIVE' || trip.status === 'FULL') && (
                          <TouchableOpacity style={styles.viewDetailsRow}>
                            <Text style={styles.viewDetailsText}>View Details</Text>
                            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {(trip.status === 'ACTIVE' || trip.status === 'FULL') && (
                      <View style={styles.historyCardActions}>
                        {trip.isTrackingActive ? (
                          <View style={{ flex: 1, backgroundColor: 'rgba(27, 107, 81, 0.08)', borderColor: COLORS.success, borderWidth: 1, height: 38, borderRadius: ROUNDED.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="radio-button-on" size={14} color={COLORS.success} style={{ marginRight: 6 }} />
                            <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '700' }}>Sharing Location Live</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleStartTracking(trip.rideId)}
                            style={[styles.historyAcceptBtn, { backgroundColor: COLORS.success }]}
                          >
                            <Ionicons name="location-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                            <Text style={styles.historyAcceptBtnText}>Start Trip & Share Location</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                          onPress={() => handleCancelTrip(trip.rideId)}
                          style={styles.historyDeclineBtn}
                        >
                          <Ionicons name="close-circle-outline" size={14} color={COLORS.error} style={{ marginRight: 6 }} />
                          <Text style={styles.historyDeclineBtnText}>Cancel Ride</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )
            ) : (
              riderHistory.length === 0 ? (
                <View style={styles.emptyHistoryCard}>
                  <Ionicons name="people-outline" size={32} color={COLORS.outline} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyHistoryTitle}>No Rider History</Text>
                  <Text style={styles.emptyHistorySubtitle}>No ride requests sent yet. Search active pools in the Ride Feed!</Text>
                </View>
              ) : (
                riderHistory.map((trip) => (
                  <View key={trip.id} style={styles.historyCardContainer}>
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyTimeline}>
                        <View style={styles.timelineIndicators}>
                          <View style={[styles.timelineDot, { backgroundColor: COLORS.primary }]} />
                          <View style={styles.timelineLine} />
                          <View style={[styles.timelineDot, { backgroundColor: COLORS.outline }]} />
                        </View>

                        <View style={styles.tripDetails}>
                          <View>
                            <Text style={styles.tripLabel}>DRIVER: {trip.driverName || 'Sarah Jenkins'}</Text>
                            <Text numberOfLines={1} style={styles.tripPoint}>{trip.pickup}</Text>
                            <Text style={styles.tripTime}>{trip.dateRaw}</Text>
                          </View>
                          <View style={{ marginTop: 14 }}>
                            <Text style={styles.tripLabel}>DROP-OFF</Text>
                            <Text numberOfLines={1} style={styles.tripPoint}>{trip.dropoff}</Text>
                            <Text style={styles.tripTime}>{trip.dropoffDateRaw}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.tripMeta}>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>{trip.status === 'COMPLETED' ? 'ACTIVE' : trip.status}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginVertical: 12 }}>
                          <Text style={styles.tripFare}>
                            {trip.fare > 100 ? `Rs. ${trip.fare}` : `$${trip.fare.toFixed(2)}`}
                          </Text>
                          <Text style={styles.tripRiders}>{trip.riders}</Text>
                        </View>
                      </View>
                    </View>

                    {trip.status === 'COMPLETED' && (
                      <View style={styles.historyCardActions}>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('RideDetails', { rideId: parseInt(trip.rideId) })}
                          style={[styles.historyAcceptBtn, { backgroundColor: COLORS.success }]}
                        >
                          <Ionicons name="map-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                          <Text style={styles.historyAcceptBtnText}>Track Live Ride</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCancelRequest(trip.requestId)}
                          style={styles.historyDeclineBtn}
                        >
                          <Ionicons name="close-circle-outline" size={14} color={COLORS.error} style={{ marginRight: 6 }} />
                          <Text style={styles.historyDeclineBtnText}>Cancel Request</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {trip.status === 'PAST_COMPLETED' && (
                      <View style={styles.historyCardActions}>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('ReviewModal', { driverName: trip.driverName || 'Sarah Jenkins' })}
                          style={styles.historyAcceptBtn}
                        >
                          <Ionicons name="star-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                          <Text style={styles.historyAcceptBtnText}>Rate Driver</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {trip.status === 'COUNTERED' && (
                      <View style={styles.historyCardActions}>
                        <TouchableOpacity
                          onPress={() => respondToRiderCounter(trip.id, 'accept')}
                          style={styles.historyAcceptBtn}
                        >
                          <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.white} style={{ marginRight: 4 }} />
                          <Text style={styles.historyAcceptBtnText}>Accept Counter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => respondToRiderCounter(trip.id, 'decline')}
                          style={styles.historyDeclineBtn}
                        >
                          <Ionicons name="close-circle-outline" size={14} color={COLORS.error} style={{ marginRight: 4 }} />
                          <Text style={styles.historyDeclineBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {trip.status === 'PENDING' && (
                      <View style={styles.historyCardActions}>
                        <TouchableOpacity
                          onPress={() => handleCancelRequest(trip.requestId)}
                          style={styles.historyDeclineBtn}
                        >
                          <Ionicons name="close-circle-outline" size={14} color={COLORS.error} style={{ marginRight: 6 }} />
                          <Text style={styles.historyDeclineBtnText}>Cancel Request</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )
            )}
          </View>
        </View>

        {/* Achieved Reviews Section */}
        <View style={[styles.section, { marginBottom: 12 }]}>
          <Text style={styles.sectionTitle}>Achieved Reviews & Ratings</Text>
          <Text style={styles.sectionSubtitle}>Feedback left by students who pooled with you.</Text>
          
          {reviews.length === 0 ? (
            <View style={styles.emptyReviewsCard}>
              <View style={styles.emptyReviewsIconCircle}>
                <Ionicons name="chatbox-ellipses-outline" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyReviewsTitle}>No Achieved Reviews Yet</Text>
              <Text style={styles.emptyReviewsSubtitle}>
                Share rides to collect ratings and feedback!
              </Text>
            </View>
          ) : (
            <>
              {/* Reviews Aggregate Header */}
              <View style={styles.reviewsAggregate}>
                <View style={styles.ratingScoreBox}>
                  <Text style={styles.scoreBig}>{currentUser.rating > 0 ? currentUser.rating.toFixed(1) : '0.0'}</Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name="star"
                        size={14}
                        color={i < Math.round(currentUser.rating) ? '#fbbf24' : '#e5e7eb'}
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                  <Text style={styles.totalReviewsText}>{reviews.length} reviews</Text>
                </View>
                
                <View style={styles.starsDistribution}>
                  {[
                    { label: '5 ★', pct: reviews.length > 0 ? `${Math.round((reviews.filter(r => r.rating >= 4.5).length / reviews.length) * 100)}%` : '0%' },
                    { label: '4 ★', pct: reviews.length > 0 ? `${Math.round((reviews.filter(r => r.rating >= 3.5 && r.rating < 4.5).length / reviews.length) * 100)}%` : '0%' },
                    { label: '3 ★', pct: reviews.length > 0 ? `${Math.round((reviews.filter(r => r.rating >= 2.5 && r.rating < 3.5).length / reviews.length) * 100)}%` : '0%' },
                    { label: '2 ★', pct: reviews.length > 0 ? `${Math.round((reviews.filter(r => r.rating >= 1.5 && r.rating < 2.5).length / reviews.length) * 100)}%` : '0%' },
                    { label: '1 ★', pct: reviews.length > 0 ? `${Math.round((reviews.filter(r => r.rating < 1.5).length / reviews.length) * 100)}%` : '0%' },
                  ].map((row, idx) => (
                    <View key={idx} style={styles.distRow}>
                      <Text style={styles.distLabel}>{row.label}</Text>
                      <View style={styles.distBarBg}>
                        <View style={[styles.distBarFill, { width: row.pct }]} />
                      </View>
                      <Text style={styles.distPct}>{row.pct}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Reviews List */}
              <View style={styles.reviewsList}>
                {reviews.map((rev) => (
                  <View key={rev.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Image source={{ uri: rev.authorPhoto }} style={styles.reviewAvatar} />
                      <View style={styles.reviewAuthorMeta}>
                        <Text style={styles.reviewAuthor}>{rev.authorName}</Text>
                        <View style={styles.reviewRatingStars}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons
                              key={i}
                              name="star"
                              size={12}
                              color={i < Math.floor(rev.rating) ? '#fbbf24' : '#e5e7eb'}
                              style={{ marginRight: 2 }}
                            />
                          ))}
                          <Text style={styles.reviewDate}>{rev.date}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>"{rev.comment}"</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Debug Utilities Section */}
        <View style={[styles.section, { marginBottom: 80 }]}>
          <Text style={styles.sectionTitle}>Debug Utilities</Text>
          <Text style={styles.sectionSubtitle}>Developer helper actions for testing.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  'Reset Active Rides',
                  'Are you sure you want to cancel all active rides for your account in the database?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Yes, Clear All',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { error } = await supabase
                            .from('trips')
                            .update({ status: 'Cancelled' })
                            .eq('driver_id', currentUser.id)
                            .in('status', ['Open', 'Full']);
                          
                          if (error) {
                            Alert.alert('Error', `Failed to reset trips: ${error.message}`);
                          } else {
                            Alert.alert('Success', 'All your active rides have been marked as Cancelled.');
                            await fetchHistory();
                            await fetchRides();
                          }
                        } catch (err) {
                          Alert.alert('Error', `System exception: ${err.message}`);
                        }
                      }
                    }
                  ]
                );
              }}
              style={[styles.bannerActionBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5', marginTop: 4 }]}
            >
              <Ionicons name="trash-outline" size={14} color="#dc2626" style={{ marginRight: 4 }} />
              <Text style={[styles.bannerActionText, { color: '#dc2626' }]}>Clear All Active Rides</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Set Profile Modal */}
      <Modal visible={profileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, SPACING.margin), maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Profile Verification</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: SPACING.stackMd }}>
                <Text style={styles.modalLabel}>FULL NAME (MANDATORY)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                />
              </View>

              <View style={{ marginBottom: SPACING.stackMd }}>
                <Text style={styles.modalLabel}>PROFILE BIO</Text>
                <TextInput
                  style={[styles.modalInput, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell students about yourself"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={{ marginBottom: SPACING.stackMd }}>
                <Text style={styles.modalLabel}>PROFILE PHOTO (MANDATORY)</Text>
                <View style={styles.imagePickerContainer}>
                  {profileImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: profileImage }} style={styles.pickerPreviewImageProfile} />
                      <TouchableOpacity onPress={() => setProfileImage('')} style={styles.removePickerImageBtn}>
                        <Ionicons name="close-circle" size={22} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => handlePickImage('profile')} style={styles.imagePlaceholderBtn}>
                      <Ionicons name="camera" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.imagePlaceholderText}>Capture or Pick Profile Picture</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={{ marginBottom: SPACING.stackMd }}>
                <Text style={styles.modalLabel}>UNIVERSITY CARD PHOTO (MANDATORY)</Text>
                <View style={styles.imagePickerContainer}>
                  {cardImage ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: cardImage }} style={styles.pickerPreviewImageCard} />
                      <TouchableOpacity onPress={() => setCardImage('')} style={styles.removePickerImageBtn}>
                        <Ionicons name="close-circle" size={22} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => handlePickImage('card')} style={styles.imagePlaceholderBtn}>
                      <Ionicons name="card" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.imagePlaceholderText}>Capture or Pick Student Card Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={{ marginBottom: SPACING.stackMd }}>
                <Text style={styles.modalLabel}>UNIVERSITY CARD EXPIRATION DATE (MANDATORY)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
                <Text style={styles.inputHelper}>Format: YYYY-MM-DD (Must be a future date).</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {profileUploading ? (
                <View style={[styles.submitBtn, { backgroundColor: COLORS.outlineVariant, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={[styles.submitBtnText, { color: COLORS.textSecondary }]}>Uploading images...</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleSetProfile} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>Submit to Admin Portal</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>


      {/* Add Vehicle Modal */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, SPACING.margin) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Registered Vehicle</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: SPACING.stackSm }}>
                  <Text style={styles.modalLabel}>MAKE</Text>
                  <TextInput style={styles.modalInput} value={make} onChangeText={setMake} placeholder="Toyota" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>MODEL</Text>
                  <TextInput style={styles.modalInput} value={model} onChangeText={setModel} placeholder="Camry" />
                </View>
              </View>

              <View style={[styles.formRow, { marginTop: SPACING.stackMd }]}>
                <View style={{ flex: 1, marginRight: SPACING.stackSm }}>
                  <Text style={styles.modalLabel}>YEAR</Text>
                  <TextInput style={styles.modalInput} value={year} onChangeText={setYear} placeholder="2021" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>COLOR</Text>
                  <TextInput style={styles.modalInput} value={color} onChangeText={setColor} placeholder="White" />
                </View>
              </View>

              <View style={[styles.formRow, { marginTop: SPACING.stackMd }]}>
                <View style={{ flex: 1, marginRight: SPACING.stackSm }}>
                  <Text style={styles.modalLabel}>PLATE NO</Text>
                  <TextInput style={styles.modalInput} value={plate} onChangeText={setPlate} placeholder="ABC-1234" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>SEATS</Text>
                  <TextInput style={styles.modalInput} value={seats} onChangeText={setSeats} placeholder="4" keyboardType="numeric" />
                </View>
              </View>

              <View style={{ marginTop: SPACING.stackMd }}>
                <Text style={styles.modalLabel}>ENGINE TYPE</Text>
                <View style={styles.typeSelector}>
                  {['ICE', 'EV'].map((type) => {
                    const isSelected = vehicleType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setVehicleType(type)}
                        style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                      >
                        <Text style={[styles.typeBtnText, isSelected && styles.typeBtnTextActive]}>
                          {type === 'EV' ? 'Electric Vehicle (EV)' : 'Gasoline/Hybrid (ICE)'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={handleAddVehicle} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Save Vehicle</Text>
              </TouchableOpacity>
            </View>
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
  headerBtn: {
    padding: 6,
    borderRadius: ROUNDED.full,
  },
  scrollContent: {
    padding: SPACING.margin,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: SPACING.padding,
    flexDirection: 'row',
  },
  profileMeta: {
    alignItems: 'center',
    width: 90,
    marginRight: SPACING.gutter,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: SPACING.stackSm,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
  },
  photoEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDED.full,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailsContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 8,
  },
  chip: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDED.default,
  },
  chipVerified: {
    backgroundColor: 'rgba(27, 107, 81, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bioText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.stackMd,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerLow,
    paddingTop: 10,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.outline,
    letterSpacing: 0.8,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.outlineVariant,
    marginHorizontal: 16,
    alignSelf: 'center',
  },
  section: {
    marginTop: SPACING.stackLg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.stackMd,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: ROUNDED.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  vehiclesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.gutter,
  },
  vehicleCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: 16,
  },
  vehicleCardInactive: {
    opacity: 0.65,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleIconWrapper: {
    width: 38,
    height: 38,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: ROUNDED.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleIconActive: {
    backgroundColor: COLORS.primaryFixed,
  },
  vehicleActions: {
    flexDirection: 'row',
  },
  vehicleActionBtn: {
    padding: 4,
    marginLeft: 6,
  },
  vehiclePlate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  vehicleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  vehicleChip: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ROUNDED.default,
  },
  vehicleChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.stackMd,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: ROUNDED.default,
    padding: 3,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDED.sm,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  historyList: {
    gap: SPACING.stackSm,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: SPACING.padding,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTimeline: {
    flexDirection: 'row',
    flex: 1,
  },
  timelineIndicators: {
    alignItems: 'center',
    width: 16,
    marginRight: 8,
    paddingVertical: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    elevation: 1.5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: 4,
  },
  tripDetails: {
    marginLeft: 10,
    flex: 1,
  },
  tripLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.outline,
    letterSpacing: 0.8,
  },
  tripPoint: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  tripTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tripMeta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: 90,
  },
  completedBadge: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDED.default,
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  tripFare: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  tripRiders: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 2,
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
  formRow: {
    flexDirection: 'row',
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.stackSm,
  },
  typeBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  typeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 69, 50, 0.05)',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: SPACING.stackMd,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: ROUNDED.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
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
  bannerCardSuccess: {
    backgroundColor: 'rgba(27, 107, 81, 0.05)',
    borderColor: 'rgba(27, 107, 81, 0.2)',
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
  editProfileCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: ROUNDED.default,
    borderWidth: 1,
    borderColor: COLORS.primaryFixed,
    backgroundColor: 'rgba(27, 107, 81, 0.04)',
  },
  editProfileCardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inputHelper: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  reviewsAggregate: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: 16,
    marginTop: SPACING.stackMd,
    alignItems: 'center',
  },
  ratingScoreBox: {
    alignItems: 'center',
    width: 100,
    borderRightWidth: 1,
    borderRightColor: COLORS.outlineVariant,
    paddingRight: 12,
  },
  scoreBig: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  totalReviewsText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  starsDistribution: {
    flex: 1,
    paddingLeft: 16,
    gap: 4,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distLabel: {
    fontSize: 10,
    width: 24,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  distBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  distPct: {
    fontSize: 10,
    width: 28,
    textAlign: 'right',
    color: COLORS.textSecondary,
  },
  reviewsList: {
    marginTop: SPACING.stackMd,
    gap: SPACING.stackSm,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: SPACING.padding,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  reviewAuthorMeta: {
    flex: 1,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  reviewRatingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  imagePickerContainer: {
    marginTop: 4,
    width: '100%',
  },
  imagePlaceholderBtn: {
    height: 90,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    padding: 8,
    backgroundColor: COLORS.background,
  },
  pickerPreviewImageProfile: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  pickerPreviewImageCard: {
    width: '100%',
    height: 150,
    borderRadius: ROUNDED.sm,
    resizeMode: 'cover',
  },
  removePickerImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  historyCardContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    overflow: 'hidden',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.padding,
  },
  historyCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    gap: 8,
  },
  historyAcceptBtn: {
    flex: 1,
    height: 38,
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDED.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyAcceptBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  historyDeclineBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDED.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDeclineBtnText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyReviewsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.stackMd,
  },
  emptyReviewsIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 69, 50, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyReviewsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyReviewsSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyHistoryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyHistorySubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
});


