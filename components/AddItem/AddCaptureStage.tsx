import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { spacing, typography } from '../../lib/theme';

type ImageLike = { uri: string };

type AddCaptureStageProps = {
  selectedImage: ImageLike | null;
  images: ImageLike[];
  selectedImageIndex: number | null;
  importMethod?: string | null;
  cameraRef: React.RefObject<CameraView | null>;
  hasCameraPermission: boolean;
  canAskForPermission: boolean;
  onRequestPermission: () => void;
  onCameraReady: () => void;
  onRemove: () => void;
  onSelectImage: (index: number) => void;
};

function formatMethodLabel(method?: string | null) {
  if (!method) return 'Live Camera';
  if (method === 'photos' || method === 'pick') return 'Library';
  if (method === 'autoscan') return 'Auto Scan';
  if (method === 'manual') return 'Manual';
  return 'Camera';
}

function FrameGuide() {
  return (
    <View pointerEvents="none" style={styles.frameGuide}>
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />
    </View>
  );
}

export default function AddCaptureStage({
  selectedImage,
  images,
  selectedImageIndex,
  importMethod,
  cameraRef,
  hasCameraPermission,
  canAskForPermission,
  onRequestPermission,
  onCameraReady,
  onRemove,
  onSelectImage,
}: AddCaptureStageProps) {
  const methodLabel = formatMethodLabel(importMethod);

  return (
    <View style={styles.container}>
      <View style={styles.stageShell}>
        <View style={styles.stage}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          ) : hasCameraPermission ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="picture"
              onCameraReady={onCameraReady}
            />
          ) : (
            <View style={styles.permissionFallback}>
              <Ionicons name="camera-outline" size={36} color="#1c1c1c" />
              <Text style={styles.permissionTitle}>Camera access needed</Text>
              <Text style={styles.permissionText}>
                Turn on camera access to digitize pieces directly inside Klozu.
              </Text>
              {canAskForPermission ? (
                <TouchableOpacity style={styles.permissionButton} onPress={onRequestPermission} activeOpacity={0.82}>
                  <Text style={styles.permissionButtonText}>Enable Camera</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          <View pointerEvents="none" style={styles.stageTint} />
          <FrameGuide />

          <View style={styles.topOverlayRow} pointerEvents="box-none">
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{selectedImage ? methodLabel : 'Live Camera'}</Text>
            </View>

            {selectedImage && images.length > 1 ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  {(selectedImageIndex ?? 0) + 1} / {images.length}
                </Text>
              </View>
            ) : (
              <View style={styles.metaSpacer} />
            )}
          </View>

          <View style={styles.bottomOverlay} pointerEvents="box-none">
            <View style={styles.instructionChip}>
              <Text style={styles.instructionText}>
                {selectedImage ? 'READY TO SAVE TO CLOSET' : 'POINT AT AN ITEM TO DIGITIZE'}
              </Text>
            </View>

            {selectedImage ? (
              <Pressable style={styles.removeButton} onPress={onRemove}>
                <Ionicons name="trash-outline" size={15} color="#eef0f2" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {selectedImage && images.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}
        >
          {images.map((image, index) => (
            <TouchableOpacity
              key={`${image.uri}-${index}`}
              onPress={() => onSelectImage(index)}
              activeOpacity={0.86}
              style={[
                styles.thumbWrap,
                selectedImageIndex === index && styles.thumbWrapActive,
              ]}
            >
              <Image source={{ uri: image.uri }} style={styles.thumbImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const guideWidth = '70%';
const guideHeight = '56%';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stageShell: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  stage: {
    flex: 1,
    minHeight: 440,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#daddd8',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  permissionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: '#eef0f2',
  },
  permissionTitle: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  permissionText: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(28, 28, 28, 0.72)',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: spacing.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1c1c1c',
  },
  permissionButtonText: {
    color: '#eef0f2',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: typography.fontFamily,
  },
  stageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 240, 242, 0.08)',
  },
  topOverlayRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaChip: {
    backgroundColor: 'rgba(31, 28, 25, 0.48)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  metaChipText: {
    color: '#eef0f2',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  metaSpacer: {
    width: 48,
  },
  frameGuide: {
    position: 'absolute',
    width: guideWidth,
    height: guideHeight,
    top: '22%',
    left: '15%',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 1.2,
    borderLeftWidth: 1.2,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 1.2,
    borderRightWidth: 1.2,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 1.2,
    borderLeftWidth: 1.2,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 1.2,
    borderRightWidth: 1.2,
  },
  bottomOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    alignItems: 'center',
  },
  instructionChip: {
    backgroundColor: 'rgba(31, 28, 25, 0.58)',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    maxWidth: '88%',
  },
  instructionText: {
    color: '#eef0f2',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.1,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  removeButton: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 28, 25, 0.7)',
  },
  removeButtonText: {
    marginLeft: 6,
    color: '#eef0f2',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  thumbRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  thumbWrap: {
    width: 54,
    height: 74,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
    opacity: 0.72,
    borderWidth: 1,
    borderColor: 'rgba(60, 55, 49, 0.08)',
  },
  thumbWrapActive: {
    opacity: 1,
    borderColor: '#1c1c1c',
    borderWidth: 1.5,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});
