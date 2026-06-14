import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStaticMapUrl } from '../constants/MapConfig';
import { supabase } from '../lib/supabaseClient';
import * as Location from 'expo-location';

// Paste your Brevo API key here to send real emails
const BREVO_API_KEY = '';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const locationSubscriptionRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  // 1. Current Logged-in User
  const [currentUser, setCurrentUser] = useState({
    name: 'Marcus Chen',
    university: 'Stanford University',
    gender: 'Male',
    rating: 0.0,
    bio: 'Computer Science Senior at Stanford. I commute between Palo Alto and San Francisco 3 times a week. Always on time, love a quiet ride or a good tech podcast. Non-smoker.',
    totalRides: 0,
    kmShared: '0',
    email: 'marcus.chen@stanford.edu',
    phone: '+1 (555) 728-1934',
    password: 'password123',
    savedVehicles: [],
    profileImage: '',
    universityCardImage: '',
    universityCardExpiry: '',
    isProfileCompleted: false,
    verificationStatus: 'unverified', // 'unverified', 'pending', 'verified'
  });

  const [registeredUsers, setRegisteredUsers] = useState([]);


  // 2. Active Rides Feed (Tinder Card Stack)
  const [rides, setRides] = useState([
    {
      id: 'r1',
      driverName: 'Ahmed R.',
      driverStar: '4.9',
      driverPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC88doMv9OAZTseaXVCTDc92DVlbFeYBalE1p0RnElbTeO6bwI2SIXPCsJvCFSLs7YfXTBCjzEoCGm58L2IfdLudC55uc_Eo7a2cIDI2nDEgCpUsdBorgt5CGs2UmnEPGwYxmwJn0dxdvpd1kWVCDkitPBX_VqrJW8nGk3CU208uW9X_ND3L3V-4WwkKhVjLtWwKuiUIDIuKeaSHfNkigvhqBocLHnIdJvEsHeeQDG2bYgn-lX593ZFSDh1JCFqeEAGCKOt7_k89yNa',
      fare: 150,
      departure: '08:30 AM',
      seatsLeft: 3,
      totalSeats: 4,
      genderBreakdown: '🧑‍🤝‍🧑 2 M / 1 F',
      carDetails: 'White Honda Civic',
      vehicleType: 'ICE',
      origin: 'Gulberg III, Lahore',
      destination: 'LUMS Campus, Lahore',
      bio: 'Engineering Sophomore. Listening to tech podcasts, early bird.',
      university: 'LUMS',
      currentPool: [
        { name: 'Sarah L.', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyr4JnvjuMJ0KvaaZKMBuH3pZKCXWkVel-PJ6rlP1E3bi93MgzvsiockjzaNyj7hHotWqycJ7UhNlkDMsOXl-nXSyLHgPt_xh2XagfLBDIetFAmJTYMTYHuGJ4BFAIKFbS-tQhaSfXYR0ia3koCsJS-2nMj_X-Vk0oaq8Y70NpfG3KAMJYh1szjSPxyYkOjvyITaaM0M3tS3eEOYiyI5qlJJocHeL6cw5LZ4wKanQpM3KRcqjG_RrRTOxYCoJ4IUCGoeSDITXimayh' },
        { name: 'Kevin D.', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrgWQYGgO58m9FA9TBdfoLoFphgSpIAqKPxQX5GWQGKOOf8RwImBZ40l8-itGlcUIkAGBt2HVRcbC9JP24JB2vSnx9l7RfpX7_FZMRzt7uMTGWd263DrlIqrrrS-LV5F_HDaHuu-RkbJd2Do8PMIccCDnns3x94WzVhETJDysKXgy1T-XchraUw2D8sz1WCPX8_JoehzdcDWWx1uVGnTY4Gc5eQNeciaRMZH4-bk19eA1ckwQHKEDvheeTe7OkSDavzYqJYfyv1wKr' },
      ],
      mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpoaLR14XoirbyHclyzgPeWFPXxUL2JKZhA7OmNe-yR5mWVE3aX9-h5omqd7Oe6DA8oQoOFfX1au-IFAtMn-Sd1CM42h60aqzNd4iLoHPYurwMf_L5I1FH24GaPB7b6VFEJJQSTInunASDqhQ3BYQicDiAavAkeK4JAQVdviIa2mQCMCO736z6stxFkxMmFiDUBSMjRP36aljwd6pIEX7GuWQTZZEMNfWhduM4rn6IQdjcNSkc9ZDNdkg9yvxRZwCfXZ5Nh2E6QH6i',
      distance: '6.5 km',
      duration: '15 mins',
      routeDescription: 'via Canal Road',
    },
    {
      id: 'r2',
      driverName: 'Sarah K.',
      driverStar: '5.0',
      driverPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrxGCkU2ZZ9Dg5vbgZEv04OT9PNE_nSzxo81PXFJmj1n2wUkdNHr-fgtWmiPsTr1X9O-Rgl_Q9gbhsecGBIbVZcR9qGscTGchW3Ro17N-Sp6-xHZGVBSv-HmcSo-fsFVmbX51aoDsENjMFHcj_kIFstWQnxGkXT80mh4OaJuCIxSbdyfPDle3Uep2PB_0pPmqSUTs0bNuAGjJlw54q1iwgNuxqWUetWQQ-b7J9LNUIPtTkc8l3bAAL76FKqhHjMNWMU2-jg0yU1r5L',
      fare: 120,
      departure: '09:15 AM',
      seatsLeft: 1,
      totalSeats: 3,
      genderBreakdown: '🧑‍🤝‍🧑 0 M / 2 F',
      carDetails: 'Silver Toyota Vitz',
      vehicleType: 'ICE',
      origin: 'North Nazimabad, Karachi',
      destination: 'IBA Main Campus, Karachi',
      bio: 'Med Student. Punctual, quiet ride, usually studying.',
      university: 'IBA',
      currentPool: [
        { name: 'Aisha M.', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyr4JnvjuMJ0KvaaZKMBuH3pZKCXWkVel-PJ6rlP1E3bi93MgzvsiockjzaNyj7hHotWqycJ7UhNlkDMsOXl-nXSyLHgPt_xh2XagfLBDIetFAmJTYMTYHuGJ4BFAIKFbS-tQhaSfXYR0ia3koCsJS-2nMj_X-Vk0oaq8Y70NpfG3KAMJYh1szjSPxyYkOjvyITaaM0M3tS3eEOYiyI5qlJJocHeL6cw5LZ4wKanQpM3KRcqjG_RrRTOxYCoJ4IUCGoeSDITXimayh' },
      ],
      mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMUP7cWtmqdloD8cisc8UspfmLrd7cdDb2-xk6gR18E3qz4LUlBEPgcLIqBGFN-TOdKD6AprLsLibAk6KGpS07yQCPi1U266zKxrQZv-4ehs43ribrYs_DeClqbowDHsD9C32B5m1vL8v4cLBc4f0yF4c5hbODAIivtcgbmQVPynvhVvnhkCfW9Jnxg0qo3TFCTSbuBrqlZ9WvzoNQDYSnUxEmJdpT5xyxAMBfi72AQ_X-93b6azS9_FB-HACiFUOdxH0Frw3aOuBZ',
      distance: '12.8 km',
      duration: '22 mins',
      routeDescription: 'via University Road',
    },
    {
      id: 'r3',
      driverName: 'Marcus J.',
      driverStar: '4.9',
      driverPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfdhM0rX-kwNJ0Fi9W5uNQ7KVDfT2hlhqFvMdQk3a6FsLUupzrkK_1Z088QBrg1dv9cN39tDOrYULQltmCEdwpfMCB02u0AvSVVVAlu11D6ZxWoaQ3AkahEmSFUifrJLDJevT1bCBb8L8b4JCTsQRM0zXqY32q08u6pivhiDSbzpuiWyKHgfja67equk_5WbIrnnKj-A438aRqThH6dAqCq-X92ghzLl657pe21ekP-a9QM-PSb_tZ0VQrzGIffbGv5yN4T7CinHlu',
      fare: 300,
      departure: '08:45 AM',
      seatsLeft: 2,
      totalSeats: 4,
      genderBreakdown: '🧑‍🤝‍🧑 1 M / 1 F',
      carDetails: 'Black Toyota Corolla',
      vehicleType: 'ICE',
      origin: 'Palo Alto Downtown',
      destination: 'Stanford University Campus',
      bio: 'Engineering Junior. Usually listening to lo-fi. Always on time for 9AMs.',
      university: 'Stanford University',
      currentPool: [
        { name: 'Sarah L.', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyr4JnvjuMJ0KvaaZKMBuH3pZKCXWkVel-PJ6rlP1E3bi93MgzvsiockjzaNyj7hHotWqycJ7UhNlkDMsOXl-nXSyLHgPt_xh2XagfLBDIetFAmJTYMTYHuGJ4BFAIKFbS-tQhaSfXYR0ia3koCsJS-2nMj_X-Vk0oaq8Y70NpfG3KAMJYh1szjSPxyYkOjvyITaaM0M3tS3eEOYiyI5qlJJocHeL6cw5LZ4wKanQpM3KRcqjG_RrRTOxYCoJ4IUCGoeSDITXimayh' },
        { name: 'Kevin D.', photo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrgWQYGgO58m9FA9TBdfoLoFphgSpIAqKPxQX5GWQGKOOf8RwImBZ40l8-itGlcUIkAGBt2HVRcbC9JP24JB2vSnx9l7RfpX7_FZMRzt7uMTGWd263DrlIqrrrS-LV5F_HDaHuu-RkbJd2Do8PMIccCDnns3x94WzVhETJDysKXgy1T-XchraUw2D8sz1WCPX8_JoehzdcDWWx1uVGnTY4Gc5eQNeciaRMZH4-bk19eA1ckwQHKEDvheeTe7OkSDavzYqJYfyv1wKr' },
      ],
      mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbmf1g8rI6O5bgR5U5JbwRbqZbdRDFPEBMgKwfHQT4ea0q_GHVVqJeZD1CRKgcsPaViQovox4i1pT-kl7pH6E6f9mS9s4-kyJ0xaWnma0VOHZmi_W4fnn9usSAq6pc2mRoBe6Yntq9jn2kEHFwGD1CaPOjvaKB9QHmiPz_LJYHjDIqL9CBrzUPFo_SMGTFt3Oxycn1S2hrw0q3vn9cb-Ue61gQfA5r3LgQSPuv-8rFClNE-9bR5Zd-GG31pLgNrxDQu9BWEjOAAAdo',
      distance: '4.2 miles',
      duration: '12 mins',
      routeDescription: 'via Palm Drive',
    },
    {
      id: 'r4',
      driverName: 'Zainab M.',
      driverStar: '4.9',
      driverPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyr4JnvjuMJ0KvaaZKMBuH3pZKCXWkVel-PJ6rlP1E3bi93MgzvsiockjzaNyj7hHotWqycJ7UhNlkDMsOXl-nXSyLHgPt_xh2XagfLBDIetFAmJTYMTYHuGJ4BFAIKFbS-tQhaSfXYR0ia3koCsJS-2nMj_X-Vk0oaq8Y70NpfG3KAMJYh1szjSPxyYkOjvyITaaM0M3tS3eEOYiyI5qlJJocHeL6cw5LZ4wKanQpM3KRcqjG_RrRTOxYCoJ4IUCGoeSDITXimayh',
      fare: 180,
      departure: '08:00 AM',
      seatsLeft: 3,
      totalSeats: 4,
      genderBreakdown: '🧑‍🤝‍🧑 0 M / 1 F',
      carDetails: 'Red Honda City',
      vehicleType: 'ICE',
      origin: 'Clifton Block 5, Karachi',
      destination: 'DHA Suffa University, Karachi',
      bio: 'BBA Senior. Eco-friendly commuter. Always on time, loves a good chat.',
      university: 'DHA Suffa University',
      currentPool: [],
      mapImage: getStaticMapUrl({ lat: '24.8164', lon: '67.0312' }, { lat: '24.8146', lon: '67.0800' }, [[67.0312, 24.8164], [67.0450, 24.8180], [67.0600, 24.8150], [67.0800, 24.8146]]),
      distance: '9.1 km',
      duration: '11 mins',
      routeDescription: 'via Beach Avenue & Korangi Road',
      originCoords: { lat: '24.8164', lon: '67.0312' },
      destCoords: { lat: '24.8146', lon: '67.0800' },
      routeCoordinates: [[67.0312, 24.8164], [67.0450, 24.8180], [67.0600, 24.8150], [67.0800, 24.8146]],
    },
    {
      id: 'r5',
      driverName: 'Bilal K.',
      driverStar: '4.8',
      driverPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrgWQYGgO58m9FA9TBdfoLoFphgSpIAqKPxQX5GWQGKOOf8RwImBZ40l8-itGlcUIkAGBt2HVRcbC9JP24JB2vSnx9l7RfpX7_FZMRzt7uMTGWd263DrlIqrrrS-LV5F_HDaHuu-RkbJd2Do8PMIccCDnns3x94WzVhETJDysKXgy1T-XchraUw2D8sz1WCPX8_JoehzdcDWWx1uVGnTY4Gc5eQNeciaRMZH4-bk19eA1ckwQHKEDvheeTe7OkSDavzYqJYfyv1wKr',
      fare: 220,
      departure: '08:15 AM',
      seatsLeft: 2,
      totalSeats: 3,
      genderBreakdown: '🧑‍🤝‍🧑 1 M / 0 F',
      carDetails: 'White Nissan Leaf (EV)',
      vehicleType: 'EV',
      origin: 'Gulshan-e-Iqbal, Karachi',
      destination: 'DHA Suffa University, Karachi',
      bio: 'CS Sophomore. Eco-friendly EV commuter. Driving a Nissan Leaf EV!',
      university: 'DHA Suffa University',
      currentPool: [],
      mapImage: getStaticMapUrl({ lat: '24.9140', lon: '67.0911' }, { lat: '24.8146', lon: '67.0800' }, [[67.0911, 24.9140], [67.0900, 24.8800], [67.0850, 24.8500], [67.0800, 24.8146]]),
      distance: '15.4 km',
      duration: '25 mins',
      routeDescription: 'via Korangi Road / Expressway',
      originCoords: { lat: '24.9140', lon: '67.0911' },
      destCoords: { lat: '24.8146', lon: '67.0800' },
      routeCoordinates: [[67.0911, 24.9140], [67.0900, 24.8800], [67.0850, 24.8500], [67.0800, 24.8146]],
    },
  ]);

  // 3. Driver Requests Negotiation Dashboard
  const [requests, setRequests] = useState([]);

  // 3b. Achieved Reviews and Ratings for Current User
  const [reviews, setReviews] = useState([]);

  // 4. Trip History
  const [history, setHistory] = useState([]);


  // Auth helper state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isRecoveringRef = React.useRef(false);

  // Load state on mount
  useEffect(() => {
    // 1. Subscribe to auth status changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        isRecoveringRef.current = true;
      }

      if (isRecoveringRef.current) {
        console.log('PASSWORD_RECOVERY active, suppressing session autologin');
        return;
      }

      if (session && session.user) {
        setIsAuthenticated(true);
        await saveToStorage('@isAuthenticated', true);

        // Fetch user profiles from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let statusVal = 'unverified';
        if (profile) {
          if (profile.is_verified) {
            statusVal = 'verified';
          } else if (profile.university_card_url && profile.university_card_url.trim() !== '') {
            statusVal = 'pending';
          }
        }

        // Check local mock verification override
        const mockVer = await AsyncStorage.getItem('@isMockVerified');
        if (mockVer === 'true') {
          statusVal = 'verified';
        }

        // Fetch vehicles
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', session.user.id);

        const savedVehiclesMapped = (vehicles || []).map(v => ({
          id: v.id.toString(),
          make: v.make,
          model: v.model,
          color: v.color,
          plate: v.license_plate,
          type: v.engine_type === 'Electric' ? 'EV' : 'ICE',
          active: true
        }));

        let userObj = null;
        if (profile) {
          userObj = {
            id: profile.id,
            name: profile.full_name,
            university: profile.university,
            gender: profile.gender,
            rating: parseFloat(profile.avg_rating || 5.00),
            bio: profile.bio || '',
            totalRides: parseInt(profile.total_rides_count || 0),
            kmShared: parseFloat(profile.km_shared || 0.00).toFixed(1),
            email: profile.student_email,
            phone: profile.phone_number,
            profileImage: profile.profile_picture_url || '',
            universityCardImage: profile.university_card_url || '',
            verificationStatus: statusVal,
            savedVehicles: savedVehiclesMapped,
          };
        } else {
          // Fallback if public.profiles trigger hasn't run or table is empty
          console.log('Profile missing from database. Falling back to local metadata.');
          const metadata = session.user.user_metadata || {};
          userObj = {
            id: session.user.id,
            name: metadata.full_name || 'Student User',
            university: metadata.university || 'DHA Suffa University (DSU)',
            gender: metadata.gender || 'Other',
            rating: 5.0,
            bio: 'Student Commuter.',
            totalRides: 0,
            kmShared: '0.0',
            email: session.user.email,
            phone: metadata.phone_number || '',
            profileImage: '',
            universityCardImage: '',
            verificationStatus: statusVal,
            savedVehicles: savedVehiclesMapped,
          };
        }
        setCurrentUser(userObj);
        await saveToStorage('@currentUser', userObj);
      } else {
        setIsAuthenticated(false);
        await saveToStorage('@isAuthenticated', false);
      }
    });

    // 2. Load other persisted data like rides feed, history, etc.
    const loadPersistedData = async () => {
      try {
        const storedRides = await AsyncStorage.getItem('@rides');
        const storedRequests = await AsyncStorage.getItem('@requests');
        const storedReviews = await AsyncStorage.getItem('@reviews');
        const storedHistory = await AsyncStorage.getItem('@history');

        if (storedRides) setRides(JSON.parse(storedRides));
        if (storedRequests) setRequests(JSON.parse(storedRequests));
        if (storedReviews) setReviews(JSON.parse(storedReviews));
        if (storedHistory) setHistory(JSON.parse(storedHistory));
      } catch (error) {
        console.log('Error loading AsyncStorage data:', error);
      }
    };
    loadPersistedData();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const saveToStorage = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.log(`Error saving ${key}:`, err);
    }
  };

  // Sync Database Methods for Multi-Device synchronization
  const fetchRides = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          profiles:driver_id (
            full_name,
            avg_rating,
            profile_picture_url,
            bio,
            university,
            gender
          ),
          vehicles:vehicle_id (
            make,
            model,
            color
          )
        `)
        .in('status', ['Open', 'Full'])
        .order('created_at', { ascending: false });

      if (error) {
        console.log('fetchRides DB Error:', error.message);
        Alert.alert('Database Error', `Failed to load rides from database: ${error.message}`);
        return;
      }

      if (data) {
        const mappedRides = data.map(t => {
          const driver = t.profiles || {};
          const vehicle = t.vehicles || {};
          const carDetailsStr = vehicle.make ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : 'Toyota Corolla';
          
          let genderBreakdownStr = '🧑‍🤝‍🧑 ' + (driver.gender === 'Male' ? '1 M' : driver.gender === 'Female' ? '1 F' : '1 Other');
          
          let routeCoords = [];
          if (t.route_geometry && Array.isArray(t.route_geometry.coordinates)) {
            routeCoords = t.route_geometry.coordinates;
          }

          let originC = { lat: '24.8164', lon: '67.0312' };
          let destC = { lat: '24.8146', lon: '67.0800' };
          if (routeCoords.length > 0) {
            originC = { lat: routeCoords[0][1].toString(), lon: routeCoords[0][0].toString() };
            destC = { lat: routeCoords[routeCoords.length - 1][1].toString(), lon: routeCoords[routeCoords.length - 1][0].toString() };
          }

          return {
            id: t.id.toString(),
            driverId: t.driver_id,
            driverName: driver.full_name || 'Driver',
            driverStar: parseFloat(driver.avg_rating || 5.0).toFixed(1),
            driverPhoto: driver.profile_picture_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            fare: parseFloat(t.base_fare),
            departure: new Date(t.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            seatsLeft: parseInt(t.available_seats),
            totalSeats: parseInt(t.total_seats),
            genderBreakdown: genderBreakdownStr,
            carDetails: carDetailsStr,
            vehicleType: 'ICE',
            origin: t.origin_name,
            destination: t.destination_name,
            bio: driver.bio || '',
            currentPool: [],
            university: driver.university || 'DHA Suffa University',
            mapImage: getStaticMapUrl(
              originC,
              destC,
              routeCoords
            ),
            distance: `${parseFloat(t.distance_km || 0).toFixed(1)} km`,
            duration: `${parseInt(t.duration_mins || 0)} mins`,
            routeDescription: t.selected_route_option || 'via Main Route',
            originCoords: originC,
            destCoords: destC,
            routeCoordinates: routeCoords,
            isTrackingActive: t.route_geometry && t.route_geometry.is_tracking_active === true,
            currentIndex: t.route_geometry ? parseInt(t.route_geometry.current_index || 0) : 0,
            totalCoordinatesCount: routeCoords.length,
            currentCoords: t.route_geometry && t.route_geometry.current_coords ? {
              lat: t.route_geometry.current_coords[1].toString(),
              lon: t.route_geometry.current_coords[0].toString()
            } : null
          };
        });

        setRides(mappedRides);
        await saveToStorage('@rides', mappedRides);
      }
    } catch (err) {
      console.log('fetchRides exception:', err);
      Alert.alert('System Error', `Failed to parse rides data: ${err.message}`);
    }
  };

  const fetchRequests = async () => {
    if (!currentUser || !currentUser.id) return;
    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          profiles:passenger_id (
            id,
            full_name,
            avg_rating,
            profile_picture_url,
            phone_number
          ),
          trips:trip_id (
            id,
            driver_id,
            origin_name,
            destination_name,
            base_fare,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('fetchRequests DB Error:', error.message);
        Alert.alert('Database Error', `Failed to load requests from database: ${error.message}`);
        return;
      }

      if (data) {
        // Filter those where trip driver is currentUser.id
        const filtered = data.filter(req => req.trips && req.trips.driver_id === currentUser.id);
        const mappedRequests = filtered.map(req => {
          const passenger = req.profiles || {};
          const trip = req.trips || {};
          let statusVal = 'pending';
          if (req.status === 'Accepted') statusVal = 'accepted';
          else if (req.status === 'Rejected') statusVal = 'rejected';
          else if (req.status === 'Counter_Offered') statusVal = 'countered';

          return {
            id: req.id.toString(),
            riderName: passenger.full_name || 'Rider',
            riderStar: parseFloat(passenger.avg_rating || 5.0).toFixed(1),
            riderPhoto: passenger.profile_picture_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            riderDetails: 'Student',
            timeAgo: new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            origin: trip.origin_name || '',
            destination: trip.destination_name || '',
            originalFare: parseFloat(req.original_fare || trip.base_fare || 0),
            proposedFare: parseFloat(req.proposed_fare || 0),
            status: statusVal,
            phone: passenger.phone_number || 'N/A',
            rideId: trip.id.toString(),
            createdAt: req.created_at,
            tripStatus: trip.status || 'Open'
          };
        });

        setRequests(mappedRequests);
        await saveToStorage('@requests', mappedRequests);
      }
    } catch (err) {
      console.log('fetchRequests Exception:', err);
      Alert.alert('System Error', `Failed to parse requests data: ${err.message}`);
    }
  };

  const fetchHistory = async () => {
    if (!currentUser || !currentUser.id) return;
    try {
      // 1. Fetch trips posted by currentUser
      const { data: driverTrips, error: dtError } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', currentUser.id)
        .order('created_at', { ascending: false });

      // 2. Fetch requests sent by currentUser
      const { data: passengerRequests, error: prError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          trips:trip_id (
            *,
            profiles:driver_id (
              full_name,
              avg_rating,
              profile_picture_url,
              phone_number
            )
          )
        `)
        .eq('passenger_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (dtError) {
        console.log('fetchHistory driverTrips Error:', dtError.message);
        Alert.alert('Database Error', `Failed to load driver history: ${dtError.message}`);
      }
      if (prError) {
        console.log('fetchHistory passengerRequests Error:', prError.message);
        Alert.alert('Database Error', `Failed to load passenger history: ${prError.message}`);
      }

      const historyList = [];

      if (driverTrips) {
        driverTrips.forEach(t => {
          let statusText = 'ACTIVE';
          if (t.status === 'Completed') statusText = 'COMPLETED';
          else if (t.status === 'Cancelled') statusText = 'CANCELLED';
          else if (t.status === 'Full') statusText = 'FULL';

          historyList.push({
            id: 'dt_' + t.id,
            pickup: t.origin_name,
            dropoff: t.destination_name,
            dateRaw: 'Departure: ' + new Date(t.departure_time).toLocaleString(),
            dropoffDateRaw: 'Departure: ' + new Date(t.departure_time).toLocaleString(),
            status: statusText,
            fare: parseFloat(t.base_fare),
            riders: `${t.total_seats - t.available_seats} / ${t.total_seats} Seats Booked`,
            type: 'driver',
            rideId: t.id.toString(),
            isTrackingActive: t.route_geometry && t.route_geometry.is_tracking_active === true,
          });
        });
      }

      if (passengerRequests) {
        passengerRequests.forEach(req => {
          const trip = req.trips || {};
          const driver = trip.profiles || {};
          let statusText = 'PENDING';
          if (req.status === 'Accepted') {
            if (trip.status === 'Cancelled') {
              statusText = 'CANCELLED';
            } else if (trip.status === 'Completed') {
              statusText = 'PAST_COMPLETED';
            } else {
              statusText = 'COMPLETED'; // Active matched ride
            }
          } else if (req.status === 'Rejected') {
            statusText = 'DECLINED';
          } else if (req.status === 'Counter_Offered') {
            statusText = 'COUNTERED';
          }

          historyList.push({
            id: 'pr_' + req.id,
            driverName: driver.full_name || 'Driver',
            pickup: trip.origin_name || '',
            dropoff: trip.destination_name || '',
            dateRaw: 'Departure: ' + (trip.departure_time ? new Date(trip.departure_time).toLocaleString() : 'N/A'),
            dropoffDateRaw: 'Departure: ' + (trip.departure_time ? new Date(trip.departure_time).toLocaleString() : 'N/A'),
            status: statusText,
            fare: parseFloat(req.proposed_fare || req.original_fare || 0),
            riders: req.status === 'Accepted' ? '1 Rider (Matched)' : req.status === 'Counter_Offered' ? `Counter from ${driver.full_name || 'Driver'}` : 'Request Sent',
            type: 'rider',
            rideId: trip.id ? trip.id.toString() : '',
            requestId: req.id.toString(),
            phone: driver.phone_number || '',
            isTrackingActive: trip.route_geometry && trip.route_geometry.is_tracking_active === true,
          });
        });
      }

      setHistory(historyList);
      await saveToStorage('@history', historyList);
    } catch (err) {
      console.log('fetchHistory Exception:', err);
      Alert.alert('System Error', `Failed to parse history data: ${err.message}`);
    }
  };

  // Polling for multi-device sync
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    fetchRides();
    fetchRequests();
    fetchHistory();

    const interval = setInterval(() => {
      fetchRides();
      fetchRequests();
      fetchHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id]);

  // Live Driver Location Simulator Loop
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    const simulateDriverMovement = async () => {
      if (locationSubscriptionRef.current) {
        console.log('[SIMULATOR] Real GPS tracking is active, skipping simulation.');
        return;
      }
      try {
        // Find active trip where current user is the driver
        const { data: trips, error } = await supabase
          .from('trips')
          .select('id, route_geometry')
          .eq('driver_id', currentUser.id)
          .in('status', ['Open', 'Full'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.log('Location Simulator fetch error:', error.message);
          return;
        }

        if (trips && trips.length > 0) {
          const trip = trips[0];
          const routeGeom = trip.route_geometry || {};
          if (routeGeom.is_tracking_active) {
            const coords = routeGeom.coordinates || [];
            if (coords.length > 0) {
              let nextIndex = parseInt(routeGeom.current_index || 0) + 2;
              if (nextIndex >= coords.length) {
                // Trip reached destination! Set status to Completed.
                const { error: completeError } = await supabase
                  .from('trips')
                  .update({
                    status: 'Completed',
                    route_geometry: {
                      ...routeGeom,
                      current_coords: coords[coords.length - 1],
                      current_index: coords.length - 1,
                      is_tracking_active: false
                    }
                  })
                  .eq('id', trip.id);

                if (completeError) {
                  console.log('Location Simulator completion error:', completeError.message);
                } else {
                  console.log(`[SIMULATOR] Trip ${trip.id} reached destination and is COMPLETED!`);
                  await fetchHistory();
                  await fetchRides();
                }
                return;
              }

              const nextCoords = coords[nextIndex];

              // Update in database
              const { error: updateError } = await supabase
                .from('trips')
                .update({
                  route_geometry: {
                    ...routeGeom,
                    current_coords: nextCoords,
                    current_index: nextIndex
                  }
                })
                .eq('id', trip.id);

              if (updateError) {
                console.log('Location Simulator update error:', updateError.message);
              } else {
                console.log(`[SIMULATOR] Driver moved to index ${nextIndex}/${coords.length} coordinates: ${nextCoords}`);
              }
            }
          }
        }
      } catch (err) {
        console.log('Location Simulator exception:', err);
      }
    };

    // Run every 5 seconds to simulate movement
    const simInterval = setInterval(simulateDriverMovement, 5000);

    return () => clearInterval(simInterval);
  }, [isAuthenticated, currentUser?.id]);

  // Local simulated coordinates movement loop for mock rides
  useEffect(() => {
    const interval = setInterval(() => {
      setRides(prev => {
        let changed = false;
        const next = prev.map(r => {
          if (r.isTrackingActive) {
            changed = true;
            const coords = r.routeCoordinates || [];
            if (coords.length > 0) {
              let nextIndex = (r.currentIndex || 0) + 2;
              if (nextIndex >= coords.length) {
                // Trip completed locally
                return {
                  ...r,
                  isTrackingActive: false,
                  status: 'Completed',
                  seatsLeft: 0,
                };
              }
              const nextCoords = coords[nextIndex];
              return {
                ...r,
                currentIndex: nextIndex,
                totalCoordinatesCount: coords.length,
                currentCoords: { lat: nextCoords[1].toString(), lon: nextCoords[0].toString() }
              };
            }
          }
          return r;
        });
        if (changed) saveToStorage('@rides', next);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 15-Minute upcoming trip checker notification loop
  const notifiedTripsRef = React.useRef(new Set());
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    const checkUpcomingTrips = () => {
      const now = Date.now();
      const fifteenMinutesMs = 15 * 60 * 1000;

      history.forEach(item => {
        // Skip cancelled or declined requests/trips
        if (item.status === 'CANCELLED' || item.status === 'DECLINED') return;

        let departureTimeStr = item.dateRaw || '';
        if (departureTimeStr.startsWith('Departure: ')) {
          departureTimeStr = departureTimeStr.replace('Departure: ', '');
        }

        const departureTime = new Date(departureTimeStr).getTime();
        if (isNaN(departureTime)) return;

        const timeDiff = departureTime - now;

        if (timeDiff <= fifteenMinutesMs) {
          if (item.type === 'driver' && !item.isTrackingActive && !notifiedTripsRef.current.has(item.id)) {
            notifiedTripsRef.current.add(item.id);
            const autoStart = async () => {
              console.log('[AUTO-SHARING] Departure approaches. Starting driver location sharing automatically...');
              const success = await startTripTracking(item.rideId);
              if (success) {
                Alert.alert(
                  "Mandatory Location Sharing Active",
                  "Your departure is in less than 15 minutes (or has passed). Your live location sharing has been started automatically to allow passengers to track your vehicle as required.",
                  [{ text: "OK" }]
                );
              }
            };
            autoStart();
          } else if (item.type === 'rider' && timeDiff > 0 && !notifiedTripsRef.current.has(item.id)) {
            notifiedTripsRef.current.add(item.id);
            Alert.alert(
              "Upcoming Carpool Journey",
              `Your journey with ${item.driverName || 'your driver'} will start in 15 minutes! Get ready for pickup.`,
              [{ text: "OK" }]
            );
          }
        }
      });
    };

    const interval = setInterval(checkUpcomingTrips, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id, history]);


  // 5. Actions / Handlers
  const verifySignUpOtp = async (email, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: token.trim(),
        type: 'signup'
      });
      if (error) {
        console.log('verifySignUpOtp Error:', error.message);
        throw error;
      }
      return !!(data && data.user);
    } catch (err) {
      console.log('verifySignUpOtp Exception:', err);
      throw err;
    }
  };

  const sendPasswordResetOtp = async (email) => {
    try {
      isRecoveringRef.current = true;
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());
      if (error) {
        console.log('sendPasswordResetOtp Error:', error.message);
        isRecoveringRef.current = false;
        return false;
      }
      return true;
    } catch (err) {
      console.log('sendPasswordResetOtp Exception:', err);
      isRecoveringRef.current = false;
      return false;
    }
  };

  const verifyRecoveryOtp = async (email, token) => {
    try {
      isRecoveringRef.current = true;
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: token.trim(),
        type: 'recovery'
      });
      if (error) {
        console.log('verifyRecoveryOtp Error:', error.message);
        isRecoveringRef.current = false;
        return false;
      }
      return !!(data && data.user);
    } catch (err) {
      console.log('verifyRecoveryOtp Exception:', err);
      isRecoveringRef.current = false;
      return false;
    }
  };

  const updateSessionPassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        console.log('updateSessionPassword Error:', error.message);
        return false;
      }
      return !!(data && data.user);
    } catch (err) {
      console.log('updateSessionPassword Exception:', err);
      return false;
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('student_email', email.toLowerCase().trim());
      if (error) {
        console.log('checkEmailExists DB Error:', error.message);
        return false;
      }
      return data && data.length > 0;
    } catch (err) {
      console.log('checkEmailExists exception:', err);
      return false;
    }
  };

  const sendVerificationEmail = async (email, code, subjectLine = 'UniRide Verification Code') => {
    console.log('\n======================================');
    console.log(`[VERIFICATION CODE] Email: ${email} | Code: ${code}`);
    console.log('======================================\n');

    if (!BREVO_API_KEY) {
      console.log('[BREVO] No API key configured. Operating in simulation mode.');
      return false;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'UniRide Support', email: 'no-reply@uniride-app.com' },
          to: [{ email: email }],
          subject: subjectLine,
          htmlContent: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px; background-color: #ffffff;">
              <h2 style="color: #004532; margin-top: 0; font-size: 22px;">UniRide Security</h2>
              <p style="font-size: 16px; color: #334155; line-height: 1.5;">Hello,</p>
              <p style="font-size: 16px; color: #334155; line-height: 1.5;">Your verification code is:</p>
              <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #0f172a; margin: 20px 0; border: 1px dashed #cbd5e1;">
                ${code}
              </div>
              <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This code is valid for a limited time. Please do not share it with anyone.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 UniRide Transit Systems. All rights reserved.</p>
            </div>
          `,
        }),
      });

      if (response.ok) {
        console.log(`[BREVO] Real verification email sent successfully to ${email}`);
        return true;
      } else {
        const errText = await response.text();
        console.log(`[BREVO ERROR] Brevo status ${response.status}: ${errText}`);
        return false;
      }
    } catch (error) {
      console.log('[BREVO ERROR] Exception during email send:', error);
      return false;
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      if (error) {
        console.log('SignIn error:', error.message);
        return false;
      }
      if (data && data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        let statusVal = 'unverified';
        if (profile) {
          if (profile.is_verified) {
            statusVal = 'verified';
          } else if (profile.university_card_url && profile.university_card_url.trim() !== '') {
            statusVal = 'pending';
          }
        }

        // Check local mock verification override
        const mockVer = await AsyncStorage.getItem('@isMockVerified');
        if (mockVer === 'true') {
          statusVal = 'verified';
        }

        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', data.user.id);

        const savedVehiclesMapped = (vehicles || []).map(v => ({
          id: v.id.toString(),
          make: v.make,
          model: v.model,
          color: v.color,
          plate: v.license_plate,
          type: v.engine_type === 'Electric' ? 'EV' : 'ICE',
          active: true
        }));

        let userObj = null;
        if (profile) {
          userObj = {
            id: profile.id,
            name: profile.full_name,
            university: profile.university,
            gender: profile.gender,
            rating: parseFloat(profile.avg_rating || 5.00),
            bio: profile.bio || '',
            totalRides: parseInt(profile.total_rides_count || 0),
            kmShared: parseFloat(profile.km_shared || 0.00).toFixed(1),
            email: profile.student_email,
            phone: profile.phone_number,
            profileImage: profile.profile_picture_url || '',
            universityCardImage: profile.university_card_url || '',
            verificationStatus: statusVal,
            savedVehicles: savedVehiclesMapped,
          };
        } else {
          console.log('SignIn profile fetch failed. Using local fallback.');
          const metadata = data.user.user_metadata || {};
          userObj = {
            id: data.user.id,
            name: metadata.full_name || 'Student User',
            university: metadata.university || 'DHA Suffa University (DSU)',
            gender: metadata.gender || 'Other',
            rating: 5.0,
            bio: 'Student Commuter.',
            totalRides: 0,
            kmShared: '0.0',
            email: data.user.email,
            phone: metadata.phone_number || '',
            profileImage: '',
            universityCardImage: '',
            verificationStatus: statusVal,
            savedVehicles: savedVehiclesMapped,
          };
        }

        setCurrentUser(userObj);
        setIsAuthenticated(true);
        await saveToStorage('@currentUser', userObj);
        await saveToStorage('@isAuthenticated', true);
        
        await fetchRides();
        await fetchRequests();
        await fetchHistory();
        return true;
      }
      return false;
    } catch (err) {
      console.log('SignIn exception:', err);
      return false;
    }
  };

  const signOut = async () => {
    try {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.log('SignOut Supabase error:', err);
    }
    setIsAuthenticated(false);
    isRecoveringRef.current = false;
    await saveToStorage('@isAuthenticated', false);
    await AsyncStorage.removeItem('@currentUser');
    await AsyncStorage.removeItem('@isMockVerified');
    
    setCurrentUser({
      name: '',
      university: '',
      gender: '',
      rating: 0.0,
      bio: '',
      totalRides: 0,
      kmShared: '0',
      email: '',
      phone: '',
      password: '',
      savedVehicles: [],
      profileImage: '',
      universityCardImage: '',
      universityCardExpiry: '',
      isProfileCompleted: false,
      verificationStatus: 'unverified',
    });
    setHistory([]);
    setReviews([]);
    setRequests([]);
  };

  const signUp = async (userData, autoLogin = false) => {
    try {
      let genderVal = 'Other';
      if (userData.gender === 'Male') genderVal = 'Male';
      else if (userData.gender === 'Female') genderVal = 'Female';

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            university: userData.university,
            gender: genderVal,
            phone_number: userData.phone,
          }
        }
      });

      if (error) {
        console.log('SignUp error:', error.message);
        throw error;
      }

      setHistory([]);
      setReviews([]);
      setRequests([]);
      await saveToStorage('@history', []);
      await saveToStorage('@reviews', []);
      await saveToStorage('@requests', []);

      if (autoLogin && data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
          const userObj = {
            id: profile.id,
            name: profile.full_name,
            university: profile.university,
            gender: profile.gender,
            rating: parseFloat(profile.avg_rating || 5.00),
            bio: profile.bio || '',
            totalRides: parseInt(profile.total_rides_count || 0),
            kmShared: parseFloat(profile.km_shared || 0.00).toFixed(1),
            email: profile.student_email,
            phone: profile.phone_number,
            profileImage: profile.profile_picture_url || '',
            universityCardImage: profile.university_card_url || '',
            verificationStatus: 'unverified',
            savedVehicles: [],
          };
          setCurrentUser(userObj);
          setIsAuthenticated(true);
          await saveToStorage('@currentUser', userObj);
          await saveToStorage('@isAuthenticated', true);
        }
      }
      return true;
    } catch (err) {
      console.log('SignUp exception:', err);
      throw err;
    }
  };

  const postRide = async (rideData) => {
    if (!currentUser || !currentUser.id) return false;
    let newRideId = 'r' + Date.now();
    let dbSuccess = true;
    try {
      const vehicleId = currentUser.savedVehicles && currentUser.savedVehicles.length > 0 ? parseInt(currentUser.savedVehicles[0].id) : null;
      let engineVal = 'Gasoline';
      if (rideData.vehicleType === 'EV') engineVal = 'Electric';
      else if (rideData.vehicleType === 'Hybrid') engineVal = 'Hybrid';

      const parseDepartureTimeToISO = (timeStr) => {
        try {
          const now = new Date();
          if (!timeStr) return now.toISOString();

          const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (match) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const ampm = match[3].toUpperCase();

            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            now.setHours(hours, minutes, 0, 0);
            return now.toISOString();
          }

          const parsed = new Date(timeStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }

          return now.toISOString();
        } catch (err) {
          console.log('Error parsing departure time:', err);
          return new Date().toISOString();
        }
      };

      const { data, error } = await supabase
        .from('trips')
        .insert({
          driver_id: currentUser.id,
          vehicle_id: isNaN(vehicleId) ? null : vehicleId,
          origin_name: rideData.origin,
          destination_name: rideData.destination,
          selected_route_option: (rideData.routeDescription || 'Option A via Expressway').substring(0, 50),
          distance_km: parseFloat(rideData.distance || '5.0'),
          duration_mins: parseInt(rideData.duration || '15'),
          route_geometry: {
            coordinates: rideData.routeCoordinates || [],
            current_coords: rideData.routeCoordinates && rideData.routeCoordinates.length > 0 ? rideData.routeCoordinates[0] : null,
            current_index: 0,
            is_tracking_active: false
          },
          departure_time: parseDepartureTimeToISO(rideData.departureTime),
          total_seats: parseInt(rideData.seats || 3),
          available_seats: parseInt(rideData.seats || 3),
          base_fare: parseFloat(rideData.baseFare || 150),
          status: 'Open'
        })
        .select()
        .single();

      if (error) {
        console.log('postRide DB Error:', error.message);
        Alert.alert('Database Error', `Failed to publish ride: ${error.message}`);
        dbSuccess = false;
      } else if (data) {
        newRideId = data.id.toString();
      }
    } catch (err) {
      console.log('postRide DB Exception:', err);
      Alert.alert('Database Error', `Failed to publish ride: ${err.message}`);
      dbSuccess = false;
    }

    if (!dbSuccess) return false;

    let calculatedGenderBreakdown = '🧑‍🤝‍🧑 ' + (currentUser.gender === 'Male' ? '1 M' : '1 F');
    if (rideData.genderPreference === 'Male Only') {
      calculatedGenderBreakdown = '🧑‍🤝‍🧑 Male Only (M)';
    } else if (rideData.genderPreference === 'Female Only') {
      calculatedGenderBreakdown = '🧑‍🤝‍🧑 Female Only (F)';
    } else if (rideData.genderPreference === 'Any Gender') {
      calculatedGenderBreakdown = '🧑‍🤝‍🧑 Co-Ed (M / F)';
    }

    const newRide = {
      id: newRideId,
      driverName: currentUser.name,
      driverStar: currentUser.rating > 0 ? currentUser.rating.toString() : '5.0',
      driverPhoto: currentUser.profileImage || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
      fare: parseFloat(rideData.baseFare || 150),
      departure: rideData.departureTime || '04:30 PM',
      seatsLeft: parseInt(rideData.seats || 1),
      totalSeats: parseInt(rideData.seats || 1),
      genderBreakdown: calculatedGenderBreakdown,
      carDetails: rideData.vehicleName || 'Toyota Corolla',
      vehicleType: rideData.vehicleType || 'ICE',
      origin: rideData.origin,
      destination: rideData.destination,
      bio: currentUser.bio,
      currentPool: [],
      university: currentUser.university || 'DHA Suffa University',
      mapImage: rideData.mapImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ7kOYSCC0necgjJJsUlD_r-1GSfx9mems9CegvCHO3fuGecOXIY5NwVbJwTIC0iZNYvSvGa1fuTdgLJfSJ4wQ9ajuVOjjGU92Qz9qNdEN-jYHK8wQGc5VaKgAAYFnaD92evR575z9heSchmELmNpa1EzxMyldUIJOSuAwNNMgMga9OvjxbkLSXfCc7Wa-jwVRgIT8cgTXIdD0LktzhKp86zhmxGRunu1dbpuOWFUns6zlA2rynZTrXGv_I7ivT3I7NaPBHIlIU0jt',
      distance: rideData.distance || '4.2 km',
      duration: rideData.duration || '12 mins',
      routeDescription: rideData.routeDescription || 'via Main Expressway',
      originCoords: rideData.originCoords,
      destCoords: rideData.destCoords,
      routeCoordinates: rideData.routeCoordinates,
    };

    setRides(prev => {
      const next = [newRide, ...prev];
      saveToStorage('@rides', next);
      return next;
    });

    const newHistory = {
      id: 'h' + Date.now(),
      pickup: rideData.origin,
      dropoff: rideData.destination,
      dateRaw: 'Today • ' + rideData.departureTime,
      dropoffDateRaw: 'Today • ' + rideData.departureTime,
      status: 'ACTIVE',
      fare: parseFloat(rideData.baseFare || 150),
      riders: '0 Riders',
      type: 'driver',
    };

    setHistory(prev => {
      const next = [newHistory, ...prev];
      saveToStorage('@history', next);
      return next;
    });

    const isMock = isNaN(parseInt(newRideId));
    if (isMock) {
      setTimeout(() => {
        Alert.alert(
          "New Ride Request",
          `A student (Liam Henderson) is requesting to join your ride from ${rideData.origin.split(',')[0]} to ${rideData.destination.split(',')[0]}!`,
          [{ text: "OK" }]
        );

        const newReq = {
          id: 'req_sim_1_' + Date.now(),
          riderName: 'Liam Henderson',
          riderStar: '4.8',
          riderPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmQt2iSE_w3nJZ0iTB2ECDmQgrpSwY8vsBFe9m-fDggMsfhmD2EBenwNulwIN-tH0-f_VGjPF2OsMSLIzR08CUCa86vQNW5W4tm81DGwFNHgBltqyYI8DvH4uqEICNHQ-acxwifj-j6g0XVIumAdiQUDcCmj-yackP9I8p9THdxFLR54-eNIMDWFFoRtkzuGaU64SxqtFQgWoOAEZf3Wb_TaIdyFrM5PNk2rI1mad6GqSTTfr-6SMucuQOCtseCpZMcDTiXTHaXX8j',
          riderDetails: '12 rides verified',
          timeAgo: 'Just now',
          origin: rideData.origin,
          destination: rideData.destination,
          originalFare: parseFloat(rideData.baseFare || 150),
          proposedFare: Math.round(parseFloat(rideData.baseFare || 150) * 0.85),
          status: 'pending',
          phone: '+92 300 7654321',
          rideId: newRideId,
          createdAt: new Date().toISOString(),
          tripStatus: 'Open'
        };

        setRequests(prev => {
          const next = [newReq, ...prev];
          saveToStorage('@requests', next);
          return next;
        });
      }, 8000);
    } else {
      await fetchHistory();
      await fetchRides();
    }
    return true;
  };

  const requestToJoin = async (rideId, proposedFare) => {
    if (!currentUser || !currentUser.id) return false;
    let isRealDb = false;
    let dbSuccess = true;
    try {
      const numericRideId = parseInt(rideId);
      if (isNaN(numericRideId)) {
        console.log('Skipping real DB write for simulation ride ID:', rideId);
      } else {
        isRealDb = true;
        const { error } = await supabase
          .from('ride_requests')
          .insert({
            trip_id: numericRideId,
            passenger_id: currentUser.id,
            original_fare: proposedFare,
            proposed_fare: proposedFare,
            status: 'Pending'
          });
        if (error) {
          console.log('requestToJoin DB Error:', error.message);
          Alert.alert('Database Error', `Failed to request ride: ${error.message}`);
          dbSuccess = false;
        }
      }
    } catch (err) {
      console.log('requestToJoin exception:', err);
      Alert.alert('Database Error', `Failed to request ride: ${err.message}`);
      dbSuccess = false;
    }

    if (isRealDb && !dbSuccess) return false;

    const ride = rides.find(r => r.id === rideId);
    if (!ride) return false;

    const newHistoryId = 'hr' + Date.now();
    const newHistory = {
      id: newHistoryId,
      driverName: ride.driverName,
      pickup: ride.origin,
      dropoff: ride.destination,
      dateRaw: 'Today • ' + ride.departure,
      dropoffDateRaw: 'Today • ' + ride.departure,
      status: 'PENDING',
      fare: parseFloat(proposedFare),
      riders: 'Request Sent',
      type: 'rider',
      rideId: ride.id
    };

    setHistory(prev => {
      const next = [newHistory, ...prev];
      saveToStorage('@history', next);
      return next;
    });

    if (!isRealDb) {
      setTimeout(() => {
        const isAccept = Math.random() > 0.5;
        if (isAccept) {
          Alert.alert(
            "Ride Request Accepted!",
            `Driver ${ride.driverName} has accepted your request to join!`,
            [{ text: "OK" }]
          );

          setHistory(prev => {
            const next = prev.map(h => {
              if (h.id === newHistoryId) {
                return { ...h, status: 'COMPLETED', riders: '1 Rider (Matched)' };
              }
              return h;
            });
            saveToStorage('@history', next);
            return next;
          });

          setCurrentUser(u => {
            const updated = {
              ...u,
              totalRides: u.totalRides + 1,
              kmShared: (parseFloat(u.kmShared) + parseFloat(ride.distance || '5')).toFixed(1)
            };
            saveToStorage('@currentUser', updated);
            return updated;
          });
        } else {
          const counterFare = Math.round(parseFloat(proposedFare) * 1.15);
          Alert.alert(
            "New Counter Offer",
            `Driver ${ride.driverName} has countered your offer with Rs. ${counterFare}!`,
            [{ text: "OK" }]
          );

          setHistory(prev => {
            const next = prev.map(h => {
              if (h.id === newHistoryId) {
                return { 
                  ...h, 
                  status: 'COUNTERED', 
                  fare: counterFare,
                  riders: `Counter from ${ride.driverName}`
                };
              }
              return h;
            });
            saveToStorage('@history', next);
            return next;
          });
        }
      }, 8000);
    } else {
      await fetchHistory();
    }
    return true;
  };

  const respondToRequest = async (requestId, action, counterFare = null) => {
    const numericRequestId = parseInt(requestId);
    if (!isNaN(numericRequestId)) {
      try {
        let dbStatus = 'Pending';
        if (action === 'accept') {
          dbStatus = 'Accepted';
          
          const { data: requestDetails } = await supabase
            .from('ride_requests')
            .select('trip_id')
            .eq('id', numericRequestId)
            .single();

          if (requestDetails) {
            const { data: tripData } = await supabase
              .from('trips')
              .select('available_seats')
              .eq('id', requestDetails.trip_id)
              .single();

            if (tripData && tripData.available_seats > 0) {
              const nextSeats = tripData.available_seats - 1;
              const updatePayload = { available_seats: nextSeats };
              if (nextSeats === 0) {
                updatePayload.status = 'Full';
              }
              await supabase
                .from('trips')
                .update(updatePayload)
                .eq('id', requestDetails.trip_id);
            }
          }
        } else if (action === 'reject') {
          dbStatus = 'Rejected';
        } else if (action === 'counter') {
          dbStatus = 'Counter_Offered';
        }

        const updateData = { status: dbStatus };
        if (counterFare !== null) {
          updateData.proposed_fare = parseFloat(counterFare);
        }

        const { error } = await supabase
          .from('ride_requests')
          .update(updateData)
          .eq('id', numericRequestId);

        if (error) {
          console.log('respondToRequest DB Error:', error.message);
        } else {
          await fetchRequests();
          await fetchHistory();
          await fetchRides();
        }
      } catch (err) {
        console.log('respondToRequest DB Exception:', err);
      }
      return;
    }

    setRequests(prev => {
      const next = prev.map(req => {
        if (req.id === requestId) {
          if (action === 'accept') {
            setCurrentUser(u => {
              const updated = {
                ...u,
                totalRides: u.totalRides + 1,
                kmShared: (parseFloat(u.kmShared) + 8.5).toFixed(1)
              };
              saveToStorage('@currentUser', updated);
              return updated;
            });

            // Decrement seatsLeft of the simulated ride
            setRides(prevRides => {
              const updatedRides = prevRides.map(r => {
                if (r.id === req.rideId) {
                  const nextSeats = Math.max(0, r.seatsLeft - 1);
                  return {
                    ...r,
                    seatsLeft: nextSeats
                  };
                }
                return r;
              });
              saveToStorage('@rides', updatedRides);
              return updatedRides;
            });

            setTimeout(() => {
              Alert.alert(
                "Feedback Received",
                `${req.riderName} left you a 5-star rating review for your ride!`,
                [{ text: "OK" }]
              );
              submitReviewMock(5, 'Excellent driver! Ontime and safe driving.', req.riderName, req.riderPhoto);
            }, 10000);

            return { ...req, status: 'accepted' };
          } else if (action === 'reject') {
            return { ...req, status: 'rejected' };
          } else if (action === 'counter') {
            setTimeout(() => {
              Alert.alert(
                "Counter Offer Accepted!",
                `${req.riderName} has accepted your counter offer of Rs. ${counterFare}!`,
                [{ text: "OK" }]
              );
              
              setRequests(rPrev => {
                const rNext = rPrev.map(r => {
                  if (r.id === requestId) {
                    return { ...r, status: 'accepted', proposedFare: parseFloat(counterFare) };
                  }
                  return r;
                });
                saveToStorage('@requests', rNext);
                return rNext;
              });

              setCurrentUser(u => {
                const updated = {
                  ...u,
                  totalRides: u.totalRides + 1,
                  kmShared: (parseFloat(u.kmShared) + 8.5).toFixed(1)
                };
                saveToStorage('@currentUser', updated);
                return updated;
              });

              // Decrement seatsLeft of the simulated ride
              setRides(prevRides => {
                const updatedRides = prevRides.map(r => {
                  if (r.id === req.rideId) {
                    const nextSeats = Math.max(0, r.seatsLeft - 1);
                    return {
                      ...r,
                      seatsLeft: nextSeats
                    };
                  }
                  return r;
                });
                saveToStorage('@rides', updatedRides);
                return updatedRides;
              });

              setTimeout(() => {
                Alert.alert(
                  "Feedback Received",
                  `${req.riderName} left you a 5-star rating review!`,
                  [{ text: "OK" }]
                );
                submitReviewMock(5, 'Really helpful with coordinates, friendly commuter.', req.riderName, req.riderPhoto);
              }, 8000);

            }, 5000);

            return { ...req, status: 'countered', proposedFare: parseFloat(counterFare) };
          }
        }
        return req;
      });
      saveToStorage('@requests', next);
      return next;
    });
  };

  const respondToRiderCounter = async (historyId, action) => {
    if (typeof historyId === 'string' && historyId.startsWith('pr_')) {
      const requestId = parseInt(historyId.replace('pr_', ''));
      if (!isNaN(requestId)) {
        try {
          let dbStatus = 'Pending';
          if (action === 'accept') {
            dbStatus = 'Accepted';
            
            const { data: requestDetails } = await supabase
              .from('ride_requests')
              .select('trip_id')
              .eq('id', requestId)
              .single();

            if (requestDetails) {
              const { data: tripData } = await supabase
                .from('trips')
                .select('available_seats, status')
                .eq('id', requestDetails.trip_id)
                .single();

              if (tripData && tripData.available_seats > 0) {
                const nextSeats = tripData.available_seats - 1;
                const updatePayload = { available_seats: nextSeats };
                if (nextSeats === 0) {
                  updatePayload.status = 'Full';
                }
                await supabase
                  .from('trips')
                  .update(updatePayload)
                  .eq('id', requestDetails.trip_id);
              }
            }
          } else {
            dbStatus = 'Rejected';
          }

          const { error } = await supabase
            .from('ride_requests')
            .update({ status: dbStatus })
            .eq('id', requestId);

          if (error) {
            console.log('respondToRiderCounter DB Error:', error.message);
          } else {
            await fetchHistory();
            await fetchRequests();
            await fetchRides();
          }
        } catch (err) {
          console.log('respondToRiderCounter DB Exception:', err);
        }
        return;
      }
    }

    setHistory(prev => {
      const next = prev.map(h => {
        if (h.id === historyId) {
          if (action === 'accept') {
            setCurrentUser(u => {
              const updated = {
                ...u,
                totalRides: u.totalRides + 1,
                kmShared: (parseFloat(u.kmShared) + 4.5).toFixed(1)
              };
              saveToStorage('@currentUser', updated);
              return updated;
            });
            // Decrement seatsLeft of the simulated ride
            setRides(prevRides => {
              const updatedRides = prevRides.map(r => {
                if (r.id === h.rideId) {
                  const nextSeats = Math.max(0, r.seatsLeft - 1);
                  return {
                    ...r,
                    seatsLeft: nextSeats
                  };
                }
                return r;
              });
              saveToStorage('@rides', updatedRides);
              return updatedRides;
            });
            return { ...h, status: 'COMPLETED', riders: '1 Rider (Matched)' };
          } else {
            return { ...h, status: 'DECLINED', riders: 'Declined' };
          }
        }
        return h;
      });
      saveToStorage('@history', next);
      return next;
    });
  };

  const addVehicle = async (vehicleData) => {
    if (!currentUser || !currentUser.id) return false;
    let newVehicleId = 'v' + Date.now();
    let dbSuccess = true;
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          user_id: currentUser.id,
          make: vehicleData.make || 'Toyota',
          model: vehicleData.model || 'Camry',
          color: vehicleData.color || 'White',
          license_plate: vehicleData.plate || 'ABC-1234',
          engine_type: vehicleData.type === 'EV' ? 'Electric' : 'Gasoline'
        })
        .select()
        .single();

      if (error) {
        console.log('addVehicle DB Error:', error.message);
        Alert.alert('Database Error', `Failed to register vehicle: ${error.message}`);
        dbSuccess = false;
      } else if (data) {
        newVehicleId = data.id.toString();
      }
    } catch (err) {
      console.log('addVehicle DB Exception:', err);
      Alert.alert('Database Error', `Failed to register vehicle: ${err.message}`);
      dbSuccess = false;
    }

    if (!dbSuccess) return false;

    const newVehicle = {
      id: newVehicleId,
      make: vehicleData.make || 'Toyota',
      model: vehicleData.model || 'Camry',
      year: vehicleData.year || '2021',
      color: vehicleData.color || 'White',
      plate: vehicleData.plate || 'ABC-1234',
      seats: parseInt(vehicleData.seats || 4),
      type: vehicleData.type || 'ICE',
      active: true,
    };

    setCurrentUser(prev => {
      const updated = {
        ...prev,
        savedVehicles: [...prev.savedVehicles, newVehicle],
      };
      saveToStorage('@currentUser', updated);
      return updated;
    });
    return true;
  };

  const removeVehicle = async (vehicleId) => {
    try {
      const numericId = parseInt(vehicleId);
      if (!isNaN(numericId)) {
        const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', numericId);
        if (error) {
          console.log('removeVehicle DB Error:', error.message);
        }
      }
    } catch (err) {
      console.log('removeVehicle DB Exception:', err);
    }

    setCurrentUser(prev => {
      const updated = {
        ...prev,
        savedVehicles: prev.savedVehicles.filter(v => v.id !== vehicleId),
      };
      saveToStorage('@currentUser', updated);
      return updated;
    });
  };

  const setProfile = async (profileData) => {
    if (!currentUser || !currentUser.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.name || currentUser.name,
          bio: profileData.bio || currentUser.bio,
          profile_picture_url: profileData.profileImage,
          university_card_url: profileData.universityCardImage,
          is_verified: false
        })
        .eq('id', currentUser.id);

      if (error) {
        console.log('setProfile DB Error:', error.message);
      }
    } catch (err) {
      console.log('setProfile DB Exception:', err);
    }

    setCurrentUser(prev => {
      const updated = {
        ...prev,
        name: profileData.name || prev.name,
        bio: profileData.bio || prev.bio,
        profileImage: profileData.profileImage,
        universityCardImage: profileData.universityCardImage,
        universityCardExpiry: profileData.universityCardExpiry,
        isProfileCompleted: true,
        verificationStatus: 'pending',
      };
      saveToStorage('@currentUser', updated);
      
      console.log('SEND TO ADMIN PORTAL:', JSON.stringify({
        action: 'VERIFY_PROFILE',
        userId: prev.email,
        fullName: updated.name,
        university: updated.university,
        profileImage: updated.profileImage,
        universityCardImage: updated.universityCardImage,
        universityCardExpiry: updated.universityCardExpiry,
        submittedAt: new Date().toISOString()
      }, null, 2));

      return updated;
    });
  };

  const verifyProfileMock = async () => {
    await AsyncStorage.setItem('@isMockVerified', 'true');
    if (!currentUser || !currentUser.id) {
      // Local fallback if no auth user is active yet
      setCurrentUser(prev => {
        const updated = {
          ...prev,
          verificationStatus: 'verified'
        };
        saveToStorage('@currentUser', updated);
        return updated;
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', currentUser.id);
      if (error) {
        console.log('verifyProfileMock DB Error:', error.message);
      }
    } catch (err) {
      console.log('verifyProfileMock DB Exception:', err);
    }

    setCurrentUser(prev => {
      const updated = {
        ...prev,
        verificationStatus: 'verified'
      };
      saveToStorage('@currentUser', updated);
      return updated;
    });
  };

  const simulateIncomingRequest = () => {
    const mockGuestRequests = [
      {
        id: 'req_sim_1_' + Date.now(),
        riderName: 'Sarah Jenkins',
        riderStar: '5.0',
        riderPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6GD8dKBKmxANpb8ymXFb5W0ZSnqYF1QxIHSYilqZNPFbnycUXQrEUEUge7BAHYrPAv8UnLrSbGvtZcDXDPJYJv0ZHJZ8qQsu29k64_6VyNQc5H-apvNk6uvHR9Tmk-BtvBRmbggNMM2kCswTNP8HFWSaxrmE_c91BVpJabA94aui0My36ia8vWYqQz09fTQhI7nIecMffRiA-NUdNqNxG6O2PZ590R04IXDsyQtmLmuWFS1uYWX30ZvVQt0-p8QMUWNNB3vxMhSGF',
        riderDetails: 'Verified Student',
        timeAgo: 'Just now',
        origin: 'DHA Phase 6 Block C, Karachi',
        destination: 'DHA Suffa University, Karachi',
        originalFare: 180,
        proposedFare: 150,
        status: 'pending',
        phone: '+92 300 1234567',
        createdAt: new Date().toISOString(),
        tripStatus: 'Open'
      },
      {
        id: 'req_sim_2_' + Date.now(),
        riderName: 'Liam Henderson',
        riderStar: '4.8',
        riderPhoto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmQt2iSE_w3nJZ0iTB2ECDmQgrpSwY8vsBFe9m-fDggMsfhmD2EBenwNulwIN-tH0-f_VGjPF2OsMSLIzR08CUCa86vQNW5W4tm81DGwFNHgBltqyYI8DvH4uqEICNHQ-acxwifj-j6g0XVIumAdiQUDcCmj-yackP9I8p9THdxFLR54-eNIMDWFFoRtkzuGaU64SxqtFQgWoOAEZf3Wb_TaIdyFrM5PNk2rI1mad6GqSTTfr-6SMucuQOCtseCpZMcDTiXTHaXX8j',
        riderDetails: '12 rides verified',
        timeAgo: '1 min ago',
        origin: 'Engineering North Gate, Karachi',
        destination: 'DHA Suffa University, Karachi',
        originalFare: 200,
        proposedFare: 180,
        status: 'pending',
        phone: '+92 321 9876543',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        tripStatus: 'Open'
      }
    ];
    const randomReq = mockGuestRequests[Math.floor(Math.random() * mockGuestRequests.length)];
    setRequests(prev => {
      const next = [randomReq, ...prev];
      saveToStorage('@requests', next);
      return next;
    });
  };

  const submitReviewMock = (rating, comment, authorName, authorPhoto) => {
    const newRev = {
      id: 'rev_' + Date.now(),
      authorName,
      authorPhoto,
      rating: parseFloat(rating),
      comment,
      date: 'Just now'
    };

    setReviews(prev => {
      const next = [newRev, ...prev];
      saveToStorage('@reviews', next);

      setCurrentUser(u => {
        const total = next.reduce((sum, r) => sum + r.rating, 0);
        const avg = parseFloat((total / next.length).toFixed(1));
        const updated = {
          ...u,
          rating: avg
        };
        saveToStorage('@currentUser', updated);
        return updated;
      });

      return next;
    });
  };

  const submitReview = (rating, comment, driverName) => {
    console.log(`Submitted review for ${driverName}: ${rating} stars. Comment: "${comment}"`);
    
    const mockRiderImages = [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB6GD8dKBKmxANpb8ymXFb5W0ZSnqYF1QxIHSYilqZNPFbnycUXQrEUEUge7BAHYrPAv8UnLrSbGvtZcDXDPJYJv0ZHJZ8qQsu29k64_6VyNQc5H-apvNk6uvHR9Tmk-BtvBRmbggNMM2kCswTNP8HFWSaxrmE_c91BVpJabA94aui0My36ia8vWYqQz09fTQhI7nIecMffRiA-NUdNqNxG6O2PZ590R04IXDsyQtmLmuWFS1uYWX30ZvVQt0-p8QMUWNNB3vxMhSGF',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAmQt2iSE_w3nJZ0iTB2ECDmQgrpSwY8vsBFe9m-fDggMsfhmD2EBenwNulwIN-tH0-f_VGjPF2OsMSLIzR08CUCa86vQNW5W4tm81DGwFNHgBltqyYI8DvH4uqEICNHQ-acxwifj-j6g0XVIumAdiQUDcCmj-yackP9I8p9THdxFLR54-eNIMDWFFoRtkzuGaU64SxqtFQgWoOAEZf3Wb_TaIdyFrM5PNk2rI1mad6GqSTTfr-6SMucuQOCtseCpZMcDTiXTHaXX8j'
    ];
    submitReviewMock(rating, comment, `Rider rating for ${driverName}`, mockRiderImages[0]);
  };

  const cancelTrip = async (tripId) => {
    try {
      const numericTripId = parseInt(tripId);
      if (!isNaN(numericTripId)) {
        const { error } = await supabase
          .from('trips')
          .update({ status: 'Cancelled' })
          .eq('id', numericTripId);

        if (error) {
          console.log('cancelTrip DB Error:', error.message);
          return false;
        }

        await supabase
          .from('ride_requests')
          .update({ status: 'Rejected' })
          .eq('trip_id', numericTripId)
          .eq('status', 'Pending');

        await fetchHistory();
        await fetchRequests();
        await fetchRides();
        return true;
      }
    } catch (err) {
      console.log('cancelTrip Exception:', err);
    }
    return false;
  };

  const cancelRequest = async (requestId) => {
    try {
      const numericRequestId = parseInt(requestId);
      if (!isNaN(numericRequestId)) {
        // Query current request status before updating
        const { data: requestDetails } = await supabase
          .from('ride_requests')
          .select('trip_id, status')
          .eq('id', numericRequestId)
          .single();

        const { error } = await supabase
          .from('ride_requests')
          .update({ status: 'Rejected' })
          .eq('id', numericRequestId);

        if (error) {
          console.log('cancelRequest DB Error:', error.message);
          return false;
        }

        // If request was Accepted, restore the vacant seat
        if (requestDetails && requestDetails.status === 'Accepted') {
          const { data: tripData } = await supabase
            .from('trips')
            .select('available_seats, status')
            .eq('id', requestDetails.trip_id)
            .single();

          if (tripData) {
            const nextSeats = tripData.available_seats + 1;
            const updatePayload = { available_seats: nextSeats };
            if (tripData.status === 'Full') {
              updatePayload.status = 'Open';
            }
            await supabase
              .from('trips')
              .update(updatePayload)
              .eq('id', requestDetails.trip_id);
          }
        }

        await fetchHistory();
        await fetchRequests();
        await fetchRides();
        return true;
      } else {
        // Mock fallback for cancelRequest
        let rideId = null;
        let isMockAccepted = false;
        
        // Check requests
        const req = requests.find(r => r.id === requestId);
        if (req) {
          rideId = req.rideId;
          isMockAccepted = req.status === 'accepted';
        }
        
        // Check history
        const histItem = history.find(h => h.requestId === requestId || h.id === requestId);
        if (histItem) {
          rideId = histItem.rideId;
          isMockAccepted = histItem.status === 'COMPLETED';
        }

        // Mark request as rejected/cancelled locally
        setRequests(prev => {
          const updated = prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r);
          saveToStorage('@requests', updated);
          return updated;
        });

        setHistory(prev => {
          const updated = prev.filter(h => h.requestId !== requestId && h.id !== requestId);
          saveToStorage('@history', updated);
          return updated;
        });

        // Restore seat if accepted
        if (isMockAccepted && rideId) {
          setRides(prev => {
            const updated = prev.map(r => {
              if (r.id === rideId) {
                return { ...r, seatsLeft: Math.min(r.totalSeats, r.seatsLeft + 1) };
              }
              return r;
            });
            saveToStorage('@rides', updated);
            return updated;
          });
        }
        return true;
      }
    } catch (err) {
      console.log('cancelRequest Exception:', err);
    }
    return false;
  };

  const startTripTracking = async (tripId) => {
    try {
      const numericTripId = parseInt(tripId);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need location access to share your live location with passengers.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Start location updates watch
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }

      let cachedGeom = {};
      if (!isNaN(numericTripId)) {
        const { data: tripData } = await supabase
          .from('trips')
          .select('route_geometry')
          .eq('id', numericTripId)
          .single();
        if (tripData && tripData.route_geometry) {
          cachedGeom = tripData.route_geometry;
        }
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000, // Update every 2 seconds for instant updates
          distanceInterval: 2, // Update every 2 meters for instant updates
        },
        async (location) => {
          const { latitude, longitude } = location.coords;
          console.log(`[REAL GPS] Latitude: ${latitude}, Longitude: ${longitude}`);

          if (!isNaN(numericTripId)) {
            cachedGeom = {
              ...cachedGeom,
              current_coords: [longitude, latitude], // GeoJSON format: [longitude, latitude]
              is_tracking_active: true
            };

            const { error } = await supabase
              .from('trips')
              .update({ route_geometry: cachedGeom })
              .eq('id', numericTripId);

            if (error) {
              console.log('Error updating real location in DB:', error.message);
            }
          } else {
            // Mock fallback: update in local rides state
            setRides(prev => {
              const updated = prev.map(r => {
                if (r.id === tripId) {
                  return {
                    ...r,
                    isTrackingActive: true,
                    currentCoords: { lat: latitude.toString(), lon: longitude.toString() }
                  };
                }
                return r;
              });
              saveToStorage('@rides', updated);
              return updated;
            });
          }
        }
      );

      // Initially enable location tracking flag in DB / state
      if (!isNaN(numericTripId)) {
        cachedGeom = {
          ...cachedGeom,
          is_tracking_active: true
        };

        await supabase
          .from('trips')
          .update({ route_geometry: cachedGeom })
          .eq('id', numericTripId);
      } else {
        setRides(prev => {
          const updated = prev.map(r => {
            if (r.id === tripId) {
              return {
                ...r,
                isTrackingActive: true
              };
            }
            return r;
          });
          saveToStorage('@rides', updated);
          return updated;
        });

        setHistory(prev => {
          const updated = prev.map(h => {
            if (h.rideId === tripId && h.type === 'driver') {
              return {
                ...h,
                isTrackingActive: true
              };
            }
            return h;
          });
          saveToStorage('@history', updated);
          return updated;
        });
      }

      await fetchHistory();
      await fetchRides();
      return true;
    } catch (err) {
      console.log('startTripTracking Exception:', err);
    }
    return false;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        rides,
        setRides,
        requests,
        setRequests,
        reviews,
        history,
        isAuthenticated,
        setIsAuthenticated,
        signIn,
        signUp,
        signOut,
        verifySignUpOtp,
        sendPasswordResetOtp,
        verifyRecoveryOtp,
        updateSessionPassword,
        checkEmailExists,
        sendVerificationEmail,
        postRide,
        requestToJoin,
        respondToRequest,
        respondToRiderCounter,
        addVehicle,
        removeVehicle,
        submitReview,
        setProfile,
        verifyProfileMock,
        simulateIncomingRequest,
        fetchRides,
        fetchRequests,
        fetchHistory,
        cancelTrip,
        cancelRequest,
        startTripTracking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


