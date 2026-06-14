import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';

const pakistaniUniversities = [
  'DHA Suffa University (DSU)',
  'Lahore University of Management Sciences (LUMS)',
  'Institute of Business Administration (IBA) Karachi',
  'National University of Sciences and Technology (NUST)',
  'FAST National University (FAST-NUCES)',
  'NED University of Engineering and Technology',
  'University of Karachi (UoK)',
  'Habib University',
  'Ghulam Ishaq Khan Institute (GIKI)',
  'SZABIST',
  'Iqra University',
  'COMSATS University Islamabad (CUI)',
  'University of the Punjab (PU)',
  'University of Engineering and Technology (UET) Lahore',
  'University of Engineering and Technology (UET) Peshawar',
  'University of Engineering and Technology (UET) Taxila',
  'Bahria University',
  'Air University',
  'Lahore School of Economics (LSE)',
  'Quaid-i-Azam University (QAU)',
  'Pakistan Institute of Engineering and Applied Sciences (PIEAS)',
  'University of Agriculture, Faisalabad (UAF)',
  'Bahauddin Zakariya University (BZU)',
  'Government College University (GCU) Lahore',
  'Government College University (GCU) Faisalabad',
  'King Edward Medical University (KEMU)',
  'Dow University of Health Sciences (DUHS)',
  'Jinnah Sindh Medical University (JSMU)',
  'Jinnah University for Women',
  'Sir Syed University of Engineering and Technology (SSUET)',
  'Dawood University of Engineering and Technology (DUET)',
  'National Textile University (NTU)',
  'University of Balochistan',
  'BUITEMS',
  'Karakoram International University',
  'University of Peshawar',
  'Islamia College Peshawar',
  'University of Malakand',
  'Abdul Wali Khan University Mardan',
  'Gomal University',
  'Hazara University',
  'Kohat University of Science and Technology (KUST)',
  'University of Gujrat',
  'University of Sargodha',
  'Arid Agriculture University',
  'Virtual University of Pakistan (VU)',
  'Allama Iqbal Open University (AIOU)',
  'National Defence University (NDU)',
  'Riphah International University',
  'Foundation University Islamabad',
  'Shifa Tameer-e-Millat University (STMU)',
  'Hamdard University',
  'Ziauddin University',
  'Aga Khan University (AKU)',
  'Karachi School of Business and Leadership (KSBL)',
  'Greenwich University',
  'Preston University',
  'Salim Habib University (SHU)',
  'Forman Christian College (FCCU)',
  'Beaconhouse National University (BNU)',
  'University of Central Punjab (UCP)',
  'University of Management and Technology (UMT)',
  'University of Lahore (UOL)',
  'Minhaj University Lahore',
  'Lahore Garrison University (LGU)',
  'Kinnaird College for Women',
  'Lahore College for Women University (LCWU)',
  'Fatima Jinnah Women University (FJWU)',
  'University of Wah',
  'Mirpur University of Science and Technology (MUST)',
  'University of Azad Jammu and Kashmir',
  'Lasbela University (LUAWMS)'
];

export const AuthScreen = () => {
  const { signIn, signUp, signOut, verifySignUpOtp, sendPasswordResetOtp, verifyRecoveryOtp, updateSessionPassword, checkEmailExists } = useAppContext();
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'signup'
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [isAdminSignup, setIsAdminSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Email verification modal states
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [pendingUserData, setPendingUserData] = useState(null);

  // Forgot password modal states
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter code, 2 = set new password & confirm
  const [forgotGeneratedCode, setForgotGeneratedCode] = useState('');
  const [forgotEnteredCode, setForgotEnteredCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [timerId, setTimerId] = useState(null);

  React.useEffect(() => {
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [timerId]);

  const [genderOpen, setGenderOpen] = useState(false);
  const [universityOpen, setUniversityOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

  const filteredUniversities = pakistaniUniversities.filter((uni) =>
    uni.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please fill out email and password.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'signin') {
        const success = await signIn(email, password);
        setLoading(false);
        if (!success) {
          Alert.alert('Auth Failed', 'Invalid credentials.');
        }
      } else {
        if (!fullName || !university || !gender || !phone) {
          setLoading(false);
          Alert.alert('Missing Fields', 'Please fill out all registration fields.');
          return;
        }

        setPendingUserData({ fullName, university, gender, email, password, phone });
        
        // Call Supabase signUp which automatically registers the user
        // and sends the native verification OTP email.
        const success = await signUp({
          fullName,
          university,
          gender,
          email,
          password,
          phone,
          role: isAdminSignup ? 'admin' : 'student'
        }, false);
        setLoading(false);
        if (success) {
          setVerificationModalVisible(true);
          Alert.alert(
            'Verification Code Sent',
            'A verification code has been sent to your email. Please enter it below to complete registration.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'An error occurred during authentication. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    if (!enteredCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const success = await verifySignUpOtp(email, enteredCode.trim());
      setLoading(false);
      if (success) {
        // Sign out to clear the automatic session created by verifyOtp,
        // forcing the user to sign in manually.
        await signOut();

        setVerificationModalVisible(false);
        setEnteredCode('');
        setFullName('');
        setUniversity('');
        setGender('');
        setPhone('');
        setEmail('');
        setPassword('');
        Alert.alert(
          'Verification Successful!',
          'Your account has been successfully verified. Please sign in now with your credentials.',
          [{ text: 'OK', onPress: () => setActiveTab('signin') }]
        );
      } else {
        Alert.alert('Verification Failed', 'Verification failed. Please check the code and try again.');
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Verification Failed', err.message || 'Incorrect verification code. Please check and try again.');
    }
  };

  const startForgotTimer = () => {
    if (timerId) {
      clearInterval(timerId);
    }
    setTimeLeft(120);
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerId(id);
  };

  const closeForgotModal = async () => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    // Clean up any temporary session if they close mid-way
    await signOut();

    setForgotModalVisible(false);
    setForgotEmail('');
    setForgotEnteredCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotStep(1);
    setTimeLeft(120);
  };

  const handleForgotPasswordInitiate = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your registered student email address in the field first.');
      return;
    }

    const exists = await checkEmailExists(email);
    if (!exists) {
      Alert.alert('Not Found', 'This email is not registered in our system.');
      return;
    }

    setLoading(true);
    setForgotEmail(email);
    setForgotStep(1);
    setForgotEnteredCode('');

    // Trigger password reset email via Supabase Auth
    const success = await sendPasswordResetOtp(email);
    setLoading(false);
    
    if (success) {
      setForgotModalVisible(true);
      // Start 120 second countdown
      startForgotTimer();
      Alert.alert(
        'Reset Code Sent',
        `A password reset code has been sent by Supabase to ${email}!\n\nEnter the code within 120 seconds to set a new password.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  const handleResendResetCode = async () => {
    setLoading(true);
    setForgotEnteredCode('');
    
    // Resend email code via Supabase Auth
    const success = await sendPasswordResetOtp(forgotEmail);
    setLoading(false);
    
    if (success) {
      // Restart timer
      startForgotTimer();
      Alert.alert(
        'New Code Sent',
        `A new code has been sent to ${forgotEmail}.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  };

  const handleVerifyResetCode = async () => {
    if (timeLeft === 0) {
      Alert.alert('Code Expired', 'The time limit has expired. Please request a new code.');
      return;
    }

    if (!forgotEnteredCode) {
      Alert.alert('Missing Field', 'Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const success = await verifyRecoveryOtp(forgotEmail, forgotEnteredCode.trim());
      setLoading(false);
      if (success) {
        if (timerId) {
          clearInterval(timerId);
          setTimerId(null);
        }
        setForgotStep(2);
      } else {
        Alert.alert('Incorrect Code', 'The verification code you entered is incorrect. Please check and try again.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'An error occurred during verification.');
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!forgotNewPassword || !forgotConfirmPassword) {
      Alert.alert('Missing Fields', 'Please fill out both password fields.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please ensure both passwords are identical.');
      return;
    }

    // Password validation rules:
    // 1. At least 6 characters long
    if (forgotNewPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }

    // 2. Contains a number
    if (!/\d/.test(forgotNewPassword)) {
      Alert.alert('Invalid Password', 'Password must contain at least one number.');
      return;
    }

    // 3. Contains at least one capital (uppercase) letter
    if (!/[A-Z]/.test(forgotNewPassword)) {
      Alert.alert('Invalid Password', 'Password must contain at least one capital letter.');
      return;
    }

    // 4. Contains at least one special character/symbol
    if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(forgotNewPassword)) {
      Alert.alert('Invalid Password', 'Password must contain at least one special character or symbol (e.g., !, @, #, $, %, etc.).');
      return;
    }

    setLoading(true);
    try {
      const success = await updateSessionPassword(forgotNewPassword);
      setLoading(false);
      if (success) {
        // Sign out to clear the temporary recovery session so the user must log in manually
        await signOut();
        
        setForgotModalVisible(false);
        setForgotEmail('');
        setForgotEnteredCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotStep(1);
        setActiveTab('signin'); // Explicitly redirect back to Login/Sign In page
        Alert.alert(
          'Password Updated',
          'Your password has been successfully updated. Please log in with your new password.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to update password. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'An error occurred during password update.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Left/Top Hero Header Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDztaYqVAlRZnOTTsBNat2Gvycb9A5dhI3YL8sEE1eqwgv7e_pRHpNg6LadJHrTjBC45t56_FraUsjjtK3Uxa2TokqJUZmqO3ulWzhE7vm-fFjjK_ZgWdWSswQfy74yuLi5BooPQiBY2XVC7NSD4M5oshXKvXt1rwthbfb-2SpzuIpBuJULnMyt-kFvZadQJCWkxNehtcesvDV8o27RDul4dq8AXpSPosOVQnfJ_ifOO9WsPJXhcI6o7surAB0vM6_5M8FKuQN-3OTq' }}
            style={styles.heroBg}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>UniRide</Text>
            <Text style={styles.heroSubtitle}>
              Empowering the academic community with reliable, safe, and efficient transit solutions.
            </Text>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statNum}>15k+</Text>
                <Text style={styles.statLabel}>Active Students</Text>
              </View>
              <View style={styles.statDivider} />
              <View>
                <Text style={styles.statNum}>200+</Text>
                <Text style={styles.statLabel}>Universities</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Canvas Form Section */}
        <View style={styles.formSection}>
          {/* Header row (logo in mobile) */}
          <View style={styles.mobileHeader}>
            <Text style={styles.logoText}>UniRide</Text>
            <Ionicons name="school" size={24} color={COLORS.primary} />
          </View>

          {/* Toggle switcher */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab('signin')}
              style={[styles.toggleBtn, activeTab === 'signin' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, activeTab === 'signin' && styles.toggleTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('signup')}
              style={[styles.toggleBtn, activeTab === 'signup' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, activeTab === 'signup' && styles.toggleTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.formSubtitle}>
              {activeTab === 'signin' 
                ? 'Access your dashboard and active rides.' 
                : 'Join your campus transit network.'}
            </Text>
          </View>

          {/* Registration Fields */}
          {activeTab === 'signup' ? (
            <View style={styles.signupFields}>
              <CustomInput
                label="Full Name"
                placeholder="Antigravity"
                value={fullName}
                onChangeText={setFullName}
              />
              {/* University selection dropdown */}
              <View style={{ marginBottom: SPACING.stackMd }}>
                <Text style={styles.dropdownLabel}>University</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    setUniversityOpen(!universityOpen);
                    setGenderOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownText, !university && { color: COLORS.textSecondary }]}>
                    {university || 'Select University'}
                  </Text>
                  <Ionicons name={universityOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {universityOpen ? (
                <View style={[styles.dropdownMenu, { maxHeight: 250 }]}>
                  <View style={styles.searchInputContainer}>
                    <TextInput
                      style={styles.dropdownSearchInput}
                      placeholder="Search university..."
                      placeholderTextColor={COLORS.outline}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <ScrollView nestedScrollEnabled={true} style={styles.universityListScroll}>
                    {filteredUniversities.map((uni) => (
                      <TouchableOpacity
                        key={uni}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setUniversity(uni);
                          setUniversityOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{uni}</Text>
                      </TouchableOpacity>
                    ))}
                    {filteredUniversities.length === 0 && (
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>No universities found</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              ) : null}

              {/* Gender and Phone in a Row */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: SPACING.stackSm }}>
                  <Text style={styles.dropdownLabel}>Gender</Text>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => {
                      setGenderOpen(!genderOpen);
                      setUniversityOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, !gender && { color: COLORS.textSecondary }]}>
                      {gender || 'Select'}
                    </Text>
                    <Ionicons name={genderOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="Phone Number"
                    placeholder="92 ---------"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Gender dropdown options */}
              {genderOpen ? (
                <View style={styles.dropdownMenu}>
                  {genders.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setGender(g);
                        setGenderOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {/* Admin toggle checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsAdminSignup(!isAdminSignup)}
              >
                <Ionicons
                  name={isAdminSignup ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={COLORS.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.checkboxText}>Sign up as University Administrator (Staff)</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Shared Fields */}
          <CustomInput
            label="Student Email"
            placeholder="student@university.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <CustomInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          {activeTab === 'signin' ? (
            <TouchableOpacity 
              style={styles.forgotBtn}
              onPress={handleForgotPasswordInitiate}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          ) : null}

          {/* Action Button */}
          <View style={{ marginTop: SPACING.stackMd }}>
            <CustomButton
              title={activeTab === 'signin' ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={loading}
              icon={
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={COLORS.white}
                  style={{ marginRight: 6 }}
                />
              }
            />
          </View>

          {/* OR Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Row */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-google" size={20} color={COLORS.text} />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-apple" size={20} color={COLORS.text} />
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Legals */}
          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>

          <Text style={styles.footerCopyright}>
            © 2024 UniRide Transit Systems. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Email Verification Modal */}
      <Modal visible={verificationModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.vModalOverlay}>
            <View style={styles.vModalContent}>
              <View style={styles.vModalHeader}>
                <Text style={styles.vModalTitle}>Verify Email Address</Text>
                <TouchableOpacity onPress={() => setVerificationModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.vModalBody}>
                <Text style={styles.vModalSubtitle}>
                  A verification code was sent to {pendingUserData?.email}. Enter it below to complete registration.
                </Text>
                
                <View style={styles.vCodeInputContainer}>
                  <TextInput
                    style={styles.vCodeTextInput}
                    value={enteredCode}
                    onChangeText={setEnteredCode}
                    keyboardType="numeric"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    placeholderTextColor={COLORS.outline}
                    autoFocus
                  />
                </View>
                
                <Text style={styles.vDebugText}>Verification code sent to your email. (Check terminal logs in development)</Text>
              </View>

              <View style={styles.vModalFooter}>
                <TouchableOpacity onPress={handleVerifyCode} style={styles.vVerifyBtn}>
                  <Text style={styles.vVerifyBtnText}>Verify & Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal visible={forgotModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.vModalOverlay}>
            <View style={styles.vModalContent}>
              <View style={styles.vModalHeader}>
                <Text style={styles.vModalTitle}>Reset Password</Text>
                <TouchableOpacity onPress={closeForgotModal}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.vModalBody}>
                {forgotStep === 1 ? (
                  // Step 1: Verify Code in 40s
                  <View>
                    <Text style={styles.vModalSubtitle}>
                      A verification code was sent to your registered email: <Text style={{fontWeight: '700'}}>{forgotEmail}</Text>. Enter it below within the 120-second time limit.
                    </Text>

                    <View style={{ alignItems: 'center', marginBottom: 12 }}>
                      <Text style={[
                        styles.timerText, 
                        timeLeft === 0 ? { color: COLORS.error } : (timeLeft < 15 ? { color: '#d97706' } : { color: COLORS.primary })
                      ]}>
                        {timeLeft === 0 ? 'Code Expired' : `Time Remaining: ${timeLeft}s`}
                      </Text>
                    </View>

                    <View style={styles.vCodeInputContainer}>
                      <TextInput
                        style={[styles.vCodeTextInput, timeLeft === 0 && { borderBottomColor: COLORS.outlineVariant }]}
                        value={forgotEnteredCode}
                        onChangeText={setForgotEnteredCode}
                        keyboardType="numeric"
                        maxLength={6}
                        placeholder="0 0 0 0 0 0"
                        placeholderTextColor={COLORS.outline}
                        editable={timeLeft > 0}
                        autoFocus
                      />
                      {timeLeft > 0 ? (
                        <Text style={styles.vDebugText}>Verification code sent to your email. (Check terminal logs in development)</Text>
                      ) : null}
                    </View>

                    {timeLeft > 0 ? (
                      <TouchableOpacity onPress={handleVerifyResetCode} style={styles.vVerifyBtn}>
                        <Text style={styles.vVerifyBtnText}>Verify Code</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={handleResendResetCode} style={[styles.vVerifyBtn, { backgroundColor: COLORS.textSecondary }]}>
                        <Text style={styles.vVerifyBtnText}>Resend Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  // Step 2: Set New Password & Confirm Password
                  <View>
                    <Text style={styles.vModalSubtitle}>
                      Code verified successfully! Choose a secure new password for your account.
                    </Text>

                    <View style={{ marginBottom: 16 }}>
                      <CustomInput
                        label="New Password"
                        placeholder="••••••••"
                        value={forgotNewPassword}
                        onChangeText={setForgotNewPassword}
                        secureTextEntry={!forgotShowPassword}
                        autoCapitalize="none"
                        rightElement={
                          <TouchableOpacity onPress={() => setForgotShowPassword(!forgotShowPassword)}>
                            <Ionicons
                              name={forgotShowPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={20}
                              color={COLORS.textSecondary}
                            />
                          </TouchableOpacity>
                        }
                      />
                    </View>

                    <View style={{ marginBottom: 20 }}>
                      <CustomInput
                        label="Confirm Password"
                        placeholder="••••••••"
                        value={forgotConfirmPassword}
                        onChangeText={setForgotConfirmPassword}
                        secureTextEntry={!forgotShowConfirmPassword}
                        autoCapitalize="none"
                        rightElement={
                          <TouchableOpacity onPress={() => setForgotShowConfirmPassword(!forgotShowConfirmPassword)}>
                            <Ionicons
                              name={forgotShowConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                              size={20}
                              color={COLORS.textSecondary}
                            />
                          </TouchableOpacity>
                        }
                      />
                    </View>

                    <TouchableOpacity onPress={handleResetPasswordConfirm} style={styles.vVerifyBtn}>
                      <Text style={styles.vVerifyBtnText}>Set New Password</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    height: 200,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: SPACING.padding,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 69, 50, 0.75)',
  },
  heroInfo: {
    zIndex: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 4,
    maxWidth: '90%',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.stackSm,
  },
  statNum: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.white,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
    alignSelf: 'center',
  },
  formSection: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: ROUNDED.xl,
    borderTopRightRadius: ROUNDED.xl,
    marginTop: -ROUNDED.xl,
    padding: SPACING.margin,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.stackMd,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: ROUNDED.md,
    padding: 3,
    marginBottom: SPACING.stackLg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ROUNDED.default,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  formHeader: {
    marginBottom: SPACING.stackMd,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  signupFields: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: SPACING.stackMd,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.stackMd,
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.text,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    marginTop: -SPACING.stackSm,
    marginBottom: SPACING.stackMd,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerLow,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.stackMd,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.stackLg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.outline,
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.gutter,
    marginBottom: SPACING.stackLg,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    backgroundColor: COLORS.white,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  legalText: {
    fontSize: 11,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.stackMd,
  },
  legalLink: {
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  footerCopyright: {
    fontSize: 11,
    color: COLORS.outlineVariant,
    textAlign: 'center',
    marginTop: SPACING.stackLg,
  },
  vModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 27, 43, 0.5)',
    justifyContent: 'flex-end',
  },
  vModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: ROUNDED.xl,
    borderTopRightRadius: ROUNDED.xl,
    padding: SPACING.margin,
  },
  vModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.stackLg,
  },
  vModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  vModalBody: {
    paddingBottom: SPACING.stackLg,
  },
  vModalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  vCodeInputContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  vCodeTextInput: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    width: 220,
    textAlign: 'center',
    letterSpacing: 6,
    paddingVertical: 8,
  },
  vDebugText: {
    fontSize: 11,
    color: COLORS.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  vModalFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: SPACING.stackMd,
  },
  vVerifyBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: ROUNDED.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vVerifyBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchInputContainer: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerLow,
  },
  dropdownSearchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    paddingHorizontal: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  universityListScroll: {
    maxHeight: 200,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.stackSm,
    marginBottom: SPACING.stackSm,
    paddingHorizontal: 4,
  },
  checkboxText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
});
