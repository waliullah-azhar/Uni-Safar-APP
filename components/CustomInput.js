import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { COLORS, ROUNDED, SPACING } from '../constants/Theme';

export const CustomInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  style,
  rightElement,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useState(new Animated.Value(0))[0];

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderStyle = {
    borderColor: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.outlineVariant, COLORS.primary],
    }),
    borderWidth: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.5],
    }),
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.inputWrapper, borderStyle]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightElement && <View style={styles.rightIcon}>{rightElement}</View>}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: SPACING.stackMd,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: ROUNDED.lg,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.stackMd,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: COLORS.text,
    fontFamily: 'System',
  },
  rightIcon: {
    marginLeft: 8,
  },
});
