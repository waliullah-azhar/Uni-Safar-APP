import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';
import { useAppContext } from '../context/AppContext';
import { StarRating } from '../components/StarRating';

export const ReviewModal = ({ route, navigation }) => {
  const { driverName } = route.params || { driverName: 'Alex Thompson' };
  const { submitReview } = useAppContext();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Selection Required', 'Please select a star rating first.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      submitReview(rating, comment, driverName);
      setSubmitting(false);
      Alert.alert('Thank you!', `You rated ${driverName} ${rating} stars.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 1200);
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  // Pre-selected avatar mapping based on mockup
  const driverAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkC98kp9ED9gycPOJ9_vBBkNwXbmJPmKtRfLZvZhyc2utosxwoWjOBbz102R7qJMcCzcLFntFb66NWUsnWdQUKcbtPpkPcDAJ-cCBGRVEwdGM7xsPt12eLepJzCzC9ncZ6iZZ_525pbbEIUdnTteUxk8qHshEhrGoO_TRFB15CZOEFtnZ3375Jg36Q6XJJ8u6eNCDQ0WdguttH9izdtNCVDRS40f3E0VXK0-wbreZ13oTnrjYz-jNfP1ta6XjSWWNJAljgqOaoik0b';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalContent}>
        {/* Top: Driver Info Header */}
        <View style={styles.topHeader}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: driverAvatar }} style={styles.avatar} />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
            </View>
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.timestampText}>Trip completed • 12 mins ago</Text>
        </View>

        {/* Center: Star Selector & Review comment box */}
        <View style={styles.body}>
          <Text style={styles.questionText}>How was your ride with {driverName.split(' ')[0]}?</Text>
          
          <StarRating
            rating={rating}
            interactive={true}
            onRatingChange={setRating}
            starSize={36}
            style={styles.stars}
          />

          <View style={styles.commentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Leave a comment about your trip experience..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Review</Text>
                <Ionicons name="send" size={16} color={COLORS.white} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} disabled={submitting} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(20, 27, 43, 0.4)', // modal-blur effect
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.margin,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDED.xl,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  topHeader: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingVertical: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.stackSm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: COLORS.primaryFixed,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  body: {
    padding: SPACING.padding,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.stackMd,
  },
  stars: {
    marginBottom: SPACING.stackLg,
  },
  commentContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: ROUNDED.lg,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    fontSize: 14,
    color: COLORS.text,
    textAlignVertical: 'top',
    height: 100,
    fontFamily: 'System',
  },
  footer: {
    padding: SPACING.padding,
    paddingTop: 0,
    gap: SPACING.stackSm,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: ROUNDED.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  skipBtn: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  skipBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
