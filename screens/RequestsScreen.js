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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';

export const RequestsScreen = () => {
  const insets = useSafeAreaInsets();
  const { requests, respondToRequest, simulateIncomingRequest } = useAppContext();

  // Filter out completed and cancelled requests/trips, and sort newest first
  const activeRequests = requests
    .filter((req) => {
      if (req.status === 'accepted' || req.status === 'rejected') return false;
      if (req.tripStatus === 'Cancelled' || req.tripStatus === 'Completed') return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });

  // Counter modal states
  const [counterVisible, setCounterVisible] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [counterFare, setCounterFare] = useState('');

  const handleAccept = (id) => {
    respondToRequest(id, 'accept');
  };

  const handleReject = (id) => {
    respondToRequest(id, 'reject');
  };

  const handleCounterPress = (id, currentProposed) => {
    setSelectedReqId(id);
    setCounterFare(currentProposed.toString());
    setCounterVisible(true);
  };

  const submitCounter = () => {
    if (selectedReqId && counterFare) {
      respondToRequest(selectedReqId, 'counter', parseFloat(counterFare));
      setCounterVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>UniRide</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="search-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Portal Header */}
        <View style={styles.portalHeader}>
          <View style={styles.activeTag}>
            <Text style={styles.activeTagText}>Active Portal</Text>
          </View>
          <Text style={styles.portalTitle}>Ride Requests</Text>
          <Text style={styles.portalSubtitle}>
            Review student offers and manage your upcoming transit schedule.
          </Text>
          <View style={styles.filterBar}>
            <Ionicons name="funnel-outline" size={14} color={COLORS.outline} style={{ marginRight: 6 }} />
            <Text style={styles.filterText}>Showing: All University Routes</Text>
          </View>
        </View>

        {/* Requests List */}
        <View style={styles.listContainer}>
          {activeRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={42} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Active Requests</Text>
              <Text style={styles.emptySubtitle}>
                When students request to join your posted rides, their dynamic negotiations will show up here.
              </Text>
              
              <TouchableOpacity onPress={simulateIncomingRequest} style={styles.simulateBtn}>
                <Ionicons name="flash" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.simulateBtnText}>Debug: Simulate Guest Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeRequests.map((req) => {
              const isAccepted = req.status === 'accepted';
              const isRejected = req.status === 'rejected';
              const isCountered = req.status === 'countered';

              if (isRejected) return null; // Don't show rejected cards in active feed

              return (
                <View
                  key={req.id}
                  style={[
                    styles.card,
                    isAccepted && styles.cardAccepted,
                  ]}
                >
                  {/* Status Badge overlay */}
                  {isAccepted ? (
                    <View style={styles.matchedBadge}>
                      <Text style={styles.matchedBadgeText}>Matched</Text>
                    </View>
                  ) : null}

                  {/* Rider Info Header */}
                  <View style={styles.cardHeader}>
                    <Image source={{ uri: req.riderPhoto }} style={styles.riderPhoto} />
                    <View style={styles.riderMeta}>
                      <Text style={styles.riderName}>{req.riderName}</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={COLORS.primary} />
                        <Text style={styles.ratingText}>{req.riderStar} ({req.riderDetails})</Text>
                      </View>
                    </View>
                    <Text style={styles.timeTag}>{req.timeAgo}</Text>
                  </View>

                  {/* Route points */}
                  <View style={styles.routeCard}>
                    <View style={styles.routeRow}>
                      <Ionicons name="navigate-circle" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
                      <Text numberOfLines={1} style={styles.routeText}>{req.origin}</Text>
                    </View>
                    <View style={[styles.routeRow, { marginTop: SPACING.stackSm }]}>
                      <Ionicons name="location" size={18} color={COLORS.error} style={{ marginRight: 10 }} />
                      <Text numberOfLines={1} style={styles.routeText}>{req.destination}</Text>
                    </View>
                  </View>

                  {/* Side-by-side Fare comparison */}
                  <View style={styles.fareComparison}>
                    <View style={styles.fareCol}>
                      <Text style={styles.fareLabel}>ORIGINAL FARE</Text>
                      <Text style={styles.originalFareValue}>
                        {req.originalFare > 100 ? `Rs. ${req.originalFare}` : `$${req.originalFare.toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={styles.fareDivider} />
                    <View style={styles.fareCol}>
                      <Text style={[styles.fareLabel, { color: COLORS.primary, fontWeight: '700' }]}>
                        {isCountered ? 'COUNTER OFFER' : 'PROPOSED FARE'}
                      </Text>
                      <Text style={styles.proposedFareValue}>
                        {req.proposedFare > 100 ? `Rs. ${req.proposedFare}` : `$${req.proposedFare.toFixed(2)}`}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Section */}
                  {!isAccepted ? (
                    <View style={styles.actionSection}>
                      <View style={styles.btnRow}>
                        <TouchableOpacity
                          onPress={() => handleAccept(req.id)}
                          style={styles.acceptBtn}
                        >
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleReject(req.id)}
                          style={styles.rejectBtn}
                        >
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCounterPress(req.id, req.proposedFare)}
                        style={styles.counterBtn}
                      >
                        <Text style={styles.counterBtnText}>Counter Offer</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Accepted/Matched State Panel */
                    <View style={styles.matchedPanel}>
                      <Text style={styles.matchedPanelTitle}>CALL OR MESSAGE RIDER</Text>
                      <View style={styles.phoneRow}>
                        <Ionicons name="call" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                        <Text style={styles.phoneNumber}>{req.phone}</Text>
                      </View>
                      <TouchableOpacity style={styles.detailsTextBtn}>
                        <Text style={styles.detailsTextBtnText}>View Route Details</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* Counter Offer Dialog */}
      <Modal visible={counterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, SPACING.margin) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Counter Proposed Fare</Text>
              <TouchableOpacity onPress={() => setCounterVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>ENTER COUNTER PRICE</Text>
              <View style={styles.counterInputWrapper}>
                <Text style={styles.counterCurrency}>Rs.</Text>
                <TextInput
                  style={styles.counterTextInput}
                  value={counterFare}
                  onChangeText={setCounterFare}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={submitCounter} style={styles.submitCounterBtn}>
                <Text style={styles.submitCounterBtnText}>Send Counter Offer</Text>
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
    paddingBottom: 120,
  },
  portalHeader: {
    marginBottom: SPACING.stackLg,
  },
  activeTag: {
    backgroundColor: COLORS.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDED.default,
    alignSelf: 'flex-start',
    marginBottom: SPACING.stackSm,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  portalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  portalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.outline,
  },
  listContainer: {
    gap: SPACING.gutter,
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    padding: SPACING.padding,
    position: 'relative',
  },
  cardAccepted: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  matchedBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDED.full,
  },
  matchedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.stackMd,
  },
  riderPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.primaryFixed,
  },
  riderMeta: {
    flex: 1,
    marginLeft: 12,
  },
  riderName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  timeTag: {
    fontSize: 11,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDED.full,
    alignSelf: 'flex-start',
  },
  routeCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'rgba(0, 69, 50, 0.05)',
    borderRadius: ROUNDED.md,
    padding: 12,
    marginBottom: SPACING.stackMd,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  fareComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingVertical: 12,
    marginBottom: SPACING.stackMd,
  },
  fareCol: {
    flex: 1,
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  originalFareValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  fareDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.outlineVariant,
  },
  proposedFareValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actionSection: {
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.stackSm,
  },
  acceptBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDED.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.transparent,
    borderRadius: ROUNDED.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
  },
  counterBtn: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  counterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  matchedPanel: {
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDED.md,
    padding: SPACING.gutter,
    alignItems: 'center',
  },
  matchedPanelTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    opacity: 0.7,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  detailsTextBtn: {
    paddingVertical: 4,
  },
  detailsTextBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 27, 43, 0.5)',
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
    marginBottom: SPACING.stackLg,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  counterInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
  },
  counterCurrency: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 6,
  },
  counterTextInput: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
  },
  modalFooter: {},
  submitCounterBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: ROUNDED.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitCounterBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 69, 50, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryFixed,
    backgroundColor: 'rgba(0, 69, 50, 0.04)',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: ROUNDED.md,
  },
  simulateBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});

