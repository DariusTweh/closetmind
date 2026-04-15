import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BrowserActionTrayProps = {
  busy: boolean;
  activeAction: string | null;
  onScan: () => void;
};

const HOME_INDICATOR_GAP = 10;

export default function BrowserActionTray({
  busy,
  activeAction,
  onScan,
}: BrowserActionTrayProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: Math.max(insets.bottom + HOME_INDICATOR_GAP, 12) }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={busy}
        onPress={onScan}
        style={[styles.scanPill, busy && styles.disabledButton]}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fafaff" />
        ) : (
          <Ionicons name="scan-outline" size={15} color="#fafaff" />
        )}
        <Text style={styles.scanPillText}>{busy ? activeAction || 'Scanning' : 'Scan Page'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
    gap: 8,
  },
  scanPill: {
    minHeight: 40,
    borderRadius: 16,
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  scanPillText: {
    color: '#fafaff',
    fontSize: 13.5,
    fontWeight: '700',
    marginLeft: 7,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.72,
  },
});
