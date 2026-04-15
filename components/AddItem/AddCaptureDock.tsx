import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../lib/theme';

type AddCaptureDockProps = {
  hasImage: boolean;
  loading?: boolean;
  onLibrary: () => void;
  onCapture: () => void;
  onVerdict: () => void;
  verdictDisabled: boolean;
};

type SideActionProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

function SideAction({ label, icon, onPress, disabled = false }: SideActionProps) {
  return (
    <TouchableOpacity
      style={styles.sideAction}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
    >
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? 'rgba(28, 28, 28, 0.32)' : 'rgba(28, 28, 28, 0.72)'}
      />
      <Text style={[styles.sideActionLabel, disabled && styles.sideActionLabelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AddCaptureDock({
  hasImage,
  loading = false,
  onLibrary,
  onCapture,
  onVerdict,
  verdictDisabled,
}: AddCaptureDockProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.helperRow}>
        <Text style={styles.helperText}>
          {hasImage ? 'Save from the header or open details if you need overrides.' : 'Frame the piece cleanly, then capture.'}
        </Text>
      </View>

      <View style={styles.dock}>
        <SideAction label="Library" icon="images-outline" onPress={onLibrary} disabled={loading} />

        <TouchableOpacity
          style={[styles.captureOuter, hasImage && styles.captureOuterRetake]}
          onPress={onCapture}
          disabled={loading}
          activeOpacity={0.88}
        >
          <View style={[styles.captureInner, hasImage && styles.captureInnerRetake]}>
            <View style={[styles.captureCore, hasImage && styles.captureCoreRetake]} />
          </View>
          <Text style={styles.captureLabel}>{hasImage ? 'Retake' : 'Capture'}</Text>
        </TouchableOpacity>

        <SideAction
          label="Verdict"
          icon="sparkles-outline"
          onPress={onVerdict}
          disabled={verdictDisabled || loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(250, 250, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(28, 28, 28, 0.08)',
  },
  helperRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(28, 28, 28, 0.52)',
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sideAction: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  sideActionLabel: {
    marginTop: 8,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  sideActionLabelDisabled: {
    color: 'rgba(28, 28, 28, 0.32)',
  },
  captureOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: 'rgba(56, 50, 45, 0.08)',
    backgroundColor: '#eef0f2',
  },
  captureOuterRetake: {
    borderColor: 'rgba(56, 50, 45, 0.16)',
  },
  captureInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  captureInnerRetake: {
    backgroundColor: '#1c1c1c',
  },
  captureCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eef0f2',
    borderWidth: 4,
    borderColor: '#daddd8',
  },
  captureCoreRetake: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 0,
    backgroundColor: '#fafaff',
  },
  captureLabel: {
    position: 'absolute',
    bottom: 10,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
    fontWeight: '600',
  },
});
