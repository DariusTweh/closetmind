import React from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type BrowserTopBarProps = {
  addressBarText: string;
  onClose: () => void;
  onChangeAddress: (value: string) => void;
  onFocusAddress: () => void;
  onBlurAddress: () => void;
  onSubmitAddress: () => void;
  onOpenDrawer: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  progressAnim: Animated.Value;
  webLoading: boolean;
};

export default function BrowserTopBar({
  addressBarText,
  onClose,
  onChangeAddress,
  onFocusAddress,
  onBlurAddress,
  onSubmitAddress,
  onOpenDrawer,
  onGoBack,
  onGoForward,
  onReload,
  canGoBack,
  canGoForward,
  progressAnim,
  webLoading,
}: BrowserTopBarProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.leadingControls}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton} accessibilityLabel="Close browser">
            <Ionicons name="close-outline" size={22} color="#1c1c1c" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onOpenDrawer} style={styles.iconButton} accessibilityLabel="Open menu">
            <Ionicons name="menu-outline" size={20} color="#1c1c1c" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.urlInput}
          value={addressBarText}
          onChangeText={onChangeAddress}
          onFocus={onFocusAddress}
          onBlur={onBlurAddress}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="Search or enter website"
          placeholderTextColor="rgba(28, 28, 28, 0.52)"
          returnKeyType="go"
          onSubmitEditing={onSubmitAddress}
        />

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={onGoBack}
            disabled={!canGoBack}
            style={[styles.iconButton, !canGoBack && styles.disabledButton]}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={20} color="#1c1c1c" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onGoForward}
            disabled={!canGoForward}
            style={[styles.iconButton, !canGoForward && styles.disabledButton]}
            accessibilityLabel="Forward"
          >
            <Ionicons name="chevron-forward" size={20} color="#1c1c1c" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onReload} style={styles.iconButton} accessibilityLabel="Reload">
            <Ionicons name="refresh-outline" size={20} color="#1c1c1c" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }) as any,
              opacity: webLoading ? 1 : 0,
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fafaff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  leadingControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.38,
  },
  urlInput: {
    flex: 1,
    height: 38,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#daddd8',
    borderRadius: 13,
    paddingHorizontal: 13,
    color: '#1c1c1c',
    backgroundColor: '#eef0f2',
    fontSize: 15,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#daddd8',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#1c1c1c',
  },
});
