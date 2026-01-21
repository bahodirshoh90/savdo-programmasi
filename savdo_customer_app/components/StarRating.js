/**
 * Star Rating Component
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

export default function StarRating({ 
  rating, 
  maxRating = 5, 
  size = 20, 
  color = '#ffc107',
  onRatingPress = null,
  showValue = false,
  style 
}) {
  const stars = [];
  
  for (let i = 1; i <= maxRating; i++) {
    const isFilled = i <= Math.round(rating);
    const isHalf = i - 0.5 <= rating && rating < i;
    
    stars.push(
      <TouchableOpacity
        key={i}
        onPress={() => onRatingPress && onRatingPress(i)}
        disabled={!onRatingPress}
        activeOpacity={onRatingPress ? 0.7 : 1}
      >
        <Ionicons
          name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
          size={size}
          color={color}
          style={styles.star}
        />
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {stars}
      </View>
      {showValue && (
        <Text style={styles.ratingText}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
