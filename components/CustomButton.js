import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';

export const CustomButton = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false, 
  disabled = false, 
  style, 
  textStyle,
  icon
}) => {
  const scaleValue = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';

  const buttonStyle = [
    styles.btn,
    isPrimary && styles.btnPrimary,
    isDanger && styles.btnDanger,
    isOutline && styles.btnOutline,
    (disabled || loading) && styles.btnDisabled,
    style
  ];

  const labelStyle = [
    styles.label,
    isPrimary && styles.labelPrimary,
    isDanger && styles.labelDanger,
    isOutline && styles.labelOutline,
    (disabled || loading) && styles.labelDisabled,
    textStyle
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      style={{ width: style?.width || '100%' }}
    >
      <Animated.View style={[buttonStyle, { transform: [{ scale: scaleValue }] }]}>
        {loading ? (
          <ActivityIndicator color={isPrimary || isDanger ? COLORS.white : COLORS.primary} size="small" />
        ) : (
          <>
            {icon && icon}
            <Text style={labelStyle}>{title}</Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: ROUNDED.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.gutter,
    width: '100%',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnDanger: {
    backgroundColor: COLORS.error,
  },
  btnOutline: {
    backgroundColor: COLORS.transparent,
    borderColor: COLORS.error,
  },
  btnDisabled: {
    backgroundColor: COLORS.outlineVariant,
    borderColor: COLORS.transparent,
  },
  label: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '700',
    textAlign: 'center',
  },
  labelPrimary: {
    color: COLORS.white,
  },
  labelDanger: {
    color: COLORS.white,
  },
  labelOutline: {
    color: COLORS.error,
  },
  labelDisabled: {
    color: COLORS.textSecondary,
  },
});
