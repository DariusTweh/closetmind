import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { typography } from '../../lib/theme';

export default function SettingsInfoFooter({ text }: { text: string }) {
  return <Text style={styles.text}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: {
    marginTop: 10,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#7a6e63',
    fontFamily: typography.fontFamily,
  },
});
