import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';

export const AdminScreen = () => {
  const { currentUser, fetchPendingStudents, verifyStudent, signOut } = useAppContext();
  const [pendingStudents, setPendingStudents] = useState([]);
  const [verifiedStudents, setVerifiedStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'verified'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states for full screen card image
  const [selectedCardImage, setSelectedCardImage] = useState(null);
  const [cardModalVisible, setCardModalVisible] = useState(false);

  // Modal states for rejection reason
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectStudentId, setRejectStudentId] = useState(null);
  const [rejectStudentName, setRejectStudentName] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async (showLoading = true) => {
    if (!currentUser || !currentUser.university) return;
    if (showLoading) setLoading(true);
    try {
      const data = await fetchPendingStudents(currentUser.university);
      // Filter based on verification status
      const pending = data.filter(s => s.verification_status === 'pending' || (!s.verification_status && !s.is_verified));
      const verified = data.filter(s => s.verification_status === 'verified' || (!s.verification_status && s.is_verified));
      
      setPendingStudents(pending);
      setVerifiedStudents(verified);
    } catch (error) {
      console.log('Error loading admin verification data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData(true);
    
    // Background polling every 5 seconds for real-time multi-device sync
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentUser?.university]);

  const handleVerifyAction = async (studentId, approve) => {
    if (approve) {
      Alert.alert(
        `Approve Student Verification`,
        `Are you sure you want to approve this student's university card? They will be allowed to post and request rides.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: async () => {
              const success = await verifyStudent(studentId, true);
              if (success) {
                Alert.alert('Success', 'Student registration approved successfully.');
                loadData();
              }
            }
          }
        ]
      );
    } else {
      setRejectStudentId(studentId);
      const student = (pendingStudents.find(s => s.id === studentId) || verifiedStudents.find(s => s.id === studentId));
      setRejectStudentName(student ? student.full_name : 'Student');
      setRejectReason('Student card details are invalid.');
      setRejectModalVisible(true);
    }
  };

  const filteredStudents = (activeTab === 'pending' ? pendingStudents : verifiedStudents).filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStudentCard = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: item.profile_picture_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
            style={styles.profilePic}
          />
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.full_name}</Text>
            <Text style={styles.studentEmail}>{item.student_email}</Text>
            <Text style={styles.studentPhone}>{item.phone_number}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardLabel}>Student ID Card:</Text>
          <TouchableOpacity
            style={styles.cardImageContainer}
            onPress={() => {
              setSelectedCardImage(item.university_card_url);
              setCardModalVisible(true);
            }}
          >
            <Image
              source={{ uri: item.university_card_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand-outline" size={24} color={COLORS.white} />
              <Text style={styles.imageOverlayText}>Tap to zoom</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>
              Expires: <Text style={{ fontWeight: '600', color: COLORS.text }}>{item.bio || 'Not specified'}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {activeTab === 'pending' ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleVerifyAction(item.id, false)}
              >
                <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleVerifyAction(item.id, true)}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Approve</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.revokeBtn]}
              onPress={() => handleVerifyAction(item.id, false)}
            >
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Revoke Verification</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Admin Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>Uni Safar Admin</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Staff</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {currentUser?.university || 'Campus Verification Portal'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out from the Admin Portal?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut }
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingStudents.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'verified' && styles.activeTab]}
          onPress={() => setActiveTab('verified')}
        >
          <Text style={[styles.tabText, activeTab === 'verified' && styles.activeTabText]}>
            Verified ({verifiedStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name or email..."
          placeholderTextColor={COLORS.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Body / List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching campus applications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => item.id}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={64} color={COLORS.outline} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                No student verification requests found for {currentUser?.university || 'this campus'}.
              </Text>
            </View>
          }
        />
      )}

      {/* Image Zoom Modal */}
      <Modal visible={cardModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setCardModalVisible(false)} />
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCardModalVisible(false)}>
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            {selectedCardImage && (
              <Image
                source={{ uri: selectedCardImage }}
                style={styles.modalZoomImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.rejectModalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.rejectModalKeyboardAvoid}
            >
              <View style={styles.rejectModalContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.rejectModalTitle}>Reject Verification</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setRejectModalVisible(false);
                      setRejectStudentId(null);
                      Keyboard.dismiss();
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.rejectModalSub}>
                  Select or type a reason for rejecting <Text style={{fontWeight: '700'}}>{rejectStudentName}</Text>'s request:
                </Text>

                {/* Quick Reason Chips */}
                <View style={styles.reasonChipsContainer}>
                  {[
                    'Blurry Student ID Image',
                    'Student ID Card Expired',
                    'Incorrect University Name',
                    'Profile Photo is Invalid',
                  ].map((reason, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.reasonChip,
                        rejectReason === reason && styles.reasonChipActive
                      ]}
                      onPress={() => setRejectReason(reason)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          rejectReason === reason && styles.reasonChipTextActive
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Reason Input */}
                <Text style={styles.inputLabel}>Custom Reason:</Text>
                <TextInput
                  style={styles.reasonInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Type a custom rejection reason here..."
                  placeholderTextColor={COLORS.outline}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                />

                {/* Actions */}
                <View style={styles.rejectActionsRow}>
                  <TouchableOpacity
                    style={[styles.rejectModalBtn, styles.cancelRejectBtn]}
                    onPress={() => {
                      setRejectModalVisible(false);
                      setRejectStudentId(null);
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.cancelRejectBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rejectModalBtn, styles.confirmRejectBtn]}
                    onPress={async () => {
                      if (!rejectReason.trim()) {
                        Alert.alert('Error', 'Please provide a rejection reason.');
                        return;
                      }
                      const success = await verifyStudent(rejectStudentId, false, rejectReason.trim());
                      if (success) {
                        Alert.alert('Success', 'Student verification request rejected.');
                        setRejectModalVisible(false);
                        setRejectStudentId(null);
                        Keyboard.dismiss();
                        loadData();
                      }
                    }}
                  >
                    <Text style={styles.confirmRejectBtnText}>Confirm Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: ROUNDED.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ROUNDED.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  listContent: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: ROUNDED.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    // Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.outlineVariant,
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  studentPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cardBody: {
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardImageContainer: {
    height: 160,
    borderRadius: ROUNDED.md,
    overflow: 'hidden',
    backgroundColor: COLORS.outlineVariant,
    position: 'relative',
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: ROUNDED.md,
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginRight: 8,
  },
  approveBtn: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
    marginLeft: 8,
  },
  revokeBtn: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    padding: 10,
  },
  modalZoomImage: {
    width: '100%',
    height: '100%',
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalKeyboardAvoid: {
    width: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: ROUNDED.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.error,
    marginBottom: 8,
  },
  rejectModalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  reasonChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ROUNDED.default,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.background,
  },
  reasonChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  reasonChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  reasonChipTextActive: {
    color: COLORS.error,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: COLORS.background,
    marginBottom: 20,
  },
  rejectActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectModalBtn: {
    flex: 1,
    height: 44,
    borderRadius: ROUNDED.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelRejectBtn: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.white,
  },
  cancelRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  confirmRejectBtn: {
    backgroundColor: COLORS.error,
  },
  confirmRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
