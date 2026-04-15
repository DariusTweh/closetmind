import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../lib/theme';

type ImageLike = { uri: string };

type AddItemPreviewCardProps = {
  selectedImage: ImageLike | null;
  images: ImageLike[];
  selectedImageIndex: number | null;
  detailsExpanded: boolean;
  importMethod?: string | null;
  onSelectImage: (index: number) => void;
  onRetake: () => void;
  onRemove: () => void;
  onToggleDetails: () => void;
};

function formatMethodLabel(method?: string | null) {
  if (!method) return null;
  if (method === 'photos' || method === 'pick') return 'Camera Roll';
  if (method === 'manual') return 'Manual';
  if (method === 'autoscan') return 'Auto Scan';
  return 'Capture';
}

export default function AddItemPreviewCard({
  selectedImage,
  images,
  selectedImageIndex,
  detailsExpanded,
  importMethod,
  onSelectImage,
  onRetake,
  onRemove,
  onToggleDetails,
}: AddItemPreviewCardProps) {
  const methodLabel = formatMethodLabel(importMethod);

  return (
    <View style={styles.container}>
      {selectedImage ? (
        <>
          <View style={styles.previewFrame}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            <View style={styles.overlayTopRow}>
              {methodLabel ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{methodLabel}</Text>
                </View>
              ) : (
                <View />
              )}

              {images.length > 1 ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>
                    {selectedImageIndex != null ? selectedImageIndex + 1 : 1} / {images.length}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={onRetake}>
              <Ionicons name="camera-reverse-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.quickActionText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton} onPress={onRemove}>
              <Ionicons name="trash-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.quickActionText}>Remove</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButtonWide} onPress={onToggleDetails}>
              <Ionicons
                name={detailsExpanded ? 'chevron-up-outline' : 'create-outline'}
                size={16}
                color={colors.textPrimary}
              />
              <Text style={styles.quickActionText}>
                {detailsExpanded ? 'Hide Details' : 'Edit Details'}
              </Text>
            </TouchableOpacity>
          </View>

          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {images.map((image, index) => (
                <TouchableOpacity
                  key={`${image.uri}-${index}`}
                  onPress={() => onSelectImage(index)}
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
        </>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyCameraRing}>
            <Ionicons name="camera-outline" size={34} color={colors.textPrimary} />
          </View>
          <Text style={styles.emptyTitle}>Capture your next piece</Text>
          <Text style={styles.emptyText}>
            Snap a quick photo or pull one from your camera roll, then save it straight into ClosetMind.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    borderRadius: 30,
    backgroundColor: '#fbf7f1',
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 3,
  },
  previewFrame: {
    height: 420,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#e8e0d4',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  overlayTopRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaChip: {
    backgroundColor: 'rgba(250, 246, 239, 0.92)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#332f29',
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: '#eef0f2',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginRight: 8,
  },
  quickActionButtonWide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: '#eef0f2',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  quickActionText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  thumbRow: {
    paddingTop: spacing.md,
  },
  thumbWrap: {
    width: 68,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#eadfce',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thumbWrapActive: {
    borderColor: '#4a453f',
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    height: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d8ccbc',
    backgroundColor: '#f6f0e5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCameraRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee5d8',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
