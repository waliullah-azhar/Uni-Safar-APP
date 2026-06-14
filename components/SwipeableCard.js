import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SPACING, SHADOWS } from '../constants/Theme';
import { MiniMap } from './MiniMap';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export const SwipeableCard = ({
  ride,
  onSwipeLeft,
  onSwipeRight,
  onPress,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe Right (Request)
          Animated.timing(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy },
            duration: 250,
            useNativeDriver: true,
          }).start(() => onSwipeRight());
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe Left (Skip)
          Animated.timing(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
            duration: 250,
            useNativeDriver: true,
          }).start(() => onSwipeLeft());
        } else {
          // Snap Back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Rotation interpolation based on movement x
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  // Interpolations for border outline shifts during drag
  const borderColor = pan.x.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [COLORS.error, COLORS.outlineVariant, COLORS.primary],
    extrapolate: 'clamp',
  });

  const animatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate: rotate },
    ],
  };

  return (
    <Animated.View
      style={[styles.cardContainer, animatedStyle]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        style={StyleSheet.absoluteFillObject}
      >
        <Animated.View style={[styles.card, { borderColor: borderColor }]}>
          {/* Top Driver Info */}
          <View style={styles.topSection}>
            <View style={styles.driverRow}>
              <Image source={{ uri: ride.driverPhoto }} style={styles.driverPhoto} />
              <View style={styles.driverMeta}>
                <Text style={styles.driverName}>{ride.driverName}</Text>
                <View style={styles.badge}>
                  <Ionicons name="star" size={12} color={COLORS.primary} />
                  <Text style={styles.badgeText}>{ride.driverStar}</Text>
                </View>
              </View>
            </View>
            <View style={styles.fareTag}>
              <Text style={styles.fareText}>Rs. {ride.fare}</Text>
            </View>
          </View>

          {/* Ride Specs */}
          <View style={styles.middleSection}>
            <View style={styles.specRow}>
              <View>
                <Text style={styles.specLabel}>DEPARTURE</Text>
                <Text style={styles.departureText}>{ride.departure}</Text>
              </View>
              <View style={styles.seatsBadge}>
                <Text style={styles.seatsText}>{ride.seatsLeft} seats left</Text>
              </View>
            </View>

            <View style={styles.tagsRow}>
              <View style={styles.genderChip}>
                <Text style={styles.genderText}>{ride.genderBreakdown}</Text>
              </View>
              <Text style={styles.carText}>{ride.carDetails}</Text>
            </View>

            {ride.routeDescription ? (
              <View style={styles.routeMetaRow}>
                <Ionicons name="navigate-circle" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.routeMetaText}>
                  {ride.distance} • {ride.duration} ({ride.routeDescription})
                </Text>
              </View>
            ) : null}

            {/* Map Preview Box */}
            <MiniMap
              mapImage={ride.mapImage}
              origin={ride.origin}
              destination={ride.destination}
              originCoords={ride.originCoords}
              destCoords={ride.destCoords}
              routeCoordinates={ride.routeCoordinates}
              height={140}
            />
          </View>

          {/* Action Hints */}
          <View style={styles.bottomSection}>
            <View style={styles.hintCol}>
              <Ionicons name="close" size={20} color={COLORS.error} />
              <Text style={styles.hintLabel}>SKIP</Text>
            </View>
            <View style={styles.hintCol}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              <Text style={styles.hintLabel}>REQUEST</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDED.lg,
    borderWidth: 1.5,
    padding: SPACING.padding,
    ...SHADOWS.sm,
    justifyContent: 'space-between',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.stackMd,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhoto: {
    width: 48,
    height: 48,
    borderRadius: ROUNDED.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  driverMeta: {
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDED.full,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 2,
  },
  fareTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDED.default,
  },
  fareText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.stackSm,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  departureText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  seatsBadge: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDED.default,
  },
  seatsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.stackMd,
  },
  genderChip: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDED.default,
    marginRight: 10,
  },
  genderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  carText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  routeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.stackSm,
  },
  routeMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingTop: SPACING.stackSm,
    marginTop: SPACING.stackMd,
  },
  hintCol: {
    alignItems: 'center',
    opacity: 0.35,
  },
  hintLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
