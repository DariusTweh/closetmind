import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ImageStyle } from 'react-native';
import { colors, typography } from '../../lib/theme';

export default function TryOnPreviewStage({
  isBusy,
  hasAnythingToShow,
  previewUrl,
  baseModelUrl,
  busyStatusLabel,
  tryOnJobId,
}: {
  isBusy: boolean;
  hasAnythingToShow: boolean;
  previewUrl: string | null;
  baseModelUrl?: string;
  busyStatusLabel: string;
  tryOnJobId?: string | null;
}) {
  const activeImageUri = previewUrl || baseModelUrl || undefined;

  return (
    <View style={styles.stage}>
      <View style={styles.stageGlowLarge} />
      <View style={styles.stageGlowSmall} />
      <View style={styles.stageHeader}>
        <Text style={styles.stageEyebrow}>{previewUrl ? 'Generated Look' : 'Studio Preview'}</Text>
        <Text style={styles.stageMeta}>{previewUrl ? 'Result' : 'Model Base'}</Text>
      </View>

      {isBusy ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#4a433d" />
          <Text style={styles.stateTitle}>{busyStatusLabel}</Text>
          {tryOnJobId ? (
            <Text style={styles.stateSub}>Job {tryOnJobId.slice(0, 8)} in progress</Text>
          ) : (
            <Text style={styles.stateSub}>We are styling the selected pieces onto your model.</Text>
          )}
        </View>
      ) : hasAnythingToShow ? (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: activeImageUri }}
            style={styles.image as ImageStyle}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>No model image yet</Text>
          <Text style={styles.stateSub}>Generate your base model in onboarding to unlock try-on.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 552,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f3f5f8',
    overflow: 'hidden',
  },
  stageGlowLarge: {
    position: 'absolute',
    top: -16,
    right: -34,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.66)',
  },
  stageGlowSmall: {
    position: 'absolute',
    left: -22,
    bottom: 40,
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: 'rgba(238, 240, 242, 0.92)',
  },
  stageHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageEyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  stageMeta: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  imageWrap: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    transform: [{ translateY: -22 }, { scale: 1.03 }],
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  stateSub: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
});
