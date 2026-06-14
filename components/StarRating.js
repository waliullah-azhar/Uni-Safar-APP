import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Theme';

export const StarRating = ({
  rating = 0,
  interactive = false,
  onRatingChange,
  starSize = 24,
  style,
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={[styles.container, style]}>
      {stars.map((star) => {
        const isFilled = star <= rating;
        
        if (interactive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => onRatingChange && onRatingChange(star)}
              activeOpacity={0.7}
              style={styles.starTouch}
            >
              <Ionicons
                name={isFilled ? 'star' : 'star-outline'}
                size={starSize}
                color={isFilled ? COLORS.success : COLORS.outlineVariant}
              />
            </TouchableOpacity>
          );
        }

        return (
          <Ionicons
            key={star}
            name={isFilled ? 'star' : 'star-outline'}
            size={starSize}
            color={isFilled ? COLORS.primary : COLORS.outlineVariant}
            style={styles.starStatic}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    padding: 4,
  },
  starStatic: {
    marginHorizontal: 1,
  },
});
