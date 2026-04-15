import React from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type BrowserImagePickerModalProps = {
  visible: boolean;
  domain?: string | null;
  price?: number | null;
  currency?: string | null;
  filterProductish: boolean;
  isBusy: boolean;
  filteredImages: string[];
  selectedMap: Record<string, boolean>;
  selectedCount: number;
  hasActiveCanvas?: boolean;
  activeCanvasTitle?: string | null;
  activeAction: string | null;
  importQueueState: { completed: number; total: number } | null;
  onClose: () => void;
  onToggleFilter: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onToggleImage: (uri: string) => void;
  onAdd: () => void;
  onVerdict: () => void;
  onStyle: () => void;
  onTryOn: () => void;
  onStyleCanvas: () => void;
  children?: React.ReactNode;
};

export default function BrowserImagePickerModal({
  visible,
  domain,
  price,
  currency,
  filterProductish,
  isBusy,
  filteredImages,
  selectedMap,
  selectedCount,
  hasActiveCanvas = false,
  activeCanvasTitle,
  activeAction,
  importQueueState,
  onClose,
  onToggleFilter,
  onSelectAll,
  onClear,
  onToggleImage,
  onAdd,
  onVerdict,
  onStyle,
  onTryOn,
  onStyleCanvas,
  children,
}: BrowserImagePickerModalProps) {
  const isSingleSelection = selectedCount === 1;

  const primaryLabel = importQueueState
    ? `Importing ${Math.min(importQueueState.completed + 1, importQueueState.total)}/${importQueueState.total}`
    : activeAction
      ? activeAction
      : selectedCount
        ? `Add ${selectedCount} to Closet`
        : 'Select an Item';

  const helperText = importQueueState
    ? `Queued import in progress. Processing ${importQueueState.total} item(s) one at a time.`
    : activeAction
      ? `${activeAction}...`
      : selectedCount === 0
        ? hasActiveCanvas
          ? `Open ${activeCanvasTitle || 'your current style canvas'} or select more items to add from this page.`
          : 'Select at least one image to unlock Add to Closet and Style Canvas. Verdict, Style Item, and Try On need one item.'
        : isSingleSelection
          ? '1 selected. Add it to your closet, build a canvas, or run a one-item action below.'
          : 'Style Canvas supports multiple items. Verdict, Style Item, and Try On work with one item at a time.';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Found Images</Text>
            <Text style={styles.headerSub}>
              {domain ? `From ${domain}` : 'Picked images'}
              {price != null ? ` · ${currency || ''}${price}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.doneButton} disabled={isBusy}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <SmallControl label={filterProductish ? 'Filter: On' : 'Filter: Off'} onPress={onToggleFilter} disabled={isBusy} />
          <SmallControl label="Select All" onPress={onSelectAll} disabled={isBusy} />
          <SmallControl label="Clear Selection" onPress={onClear} disabled={isBusy} />
        </View>

        <ScrollView contentContainerStyle={styles.grid}>
          {filteredImages.map((uri) => {
            const selected = Boolean(selectedMap[uri]);
            return (
              <TouchableOpacity
                key={uri}
                disabled={isBusy}
                onPress={() => onToggleImage(uri)}
                style={[styles.gridItem, isBusy && styles.gridItemDisabled]}
              >
                <View style={[styles.imageCard, selected && styles.imageCardSelected]}>
                  <Image source={{ uri }} style={styles.image} />
                </View>
                <View style={[styles.badge, selected ? styles.badgeSelected : styles.badgeIdle]}>
                  <Text style={styles.badgeText}>{selected ? '✓' : '+'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {children}

        <View style={styles.footer}>
          <Text style={styles.selectionState}>
            {selectedCount === 0
              ? 'No image selected'
              : `${selectedCount} ${selectedCount === 1 ? 'image selected' : 'images selected'}`}
          </Text>

          <View style={styles.footerPrimaryRow}>
            <TouchableOpacity
              disabled={isBusy || selectedCount === 0}
              onPress={onAdd}
              style={[styles.primaryButton, (isBusy || selectedCount === 0) && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerSecondaryRow}>
            <ActionChip label="Get Verdict" onPress={onVerdict} disabled={isBusy || !isSingleSelection} />
            <ActionChip label="Style Item" onPress={onStyle} disabled={isBusy || !isSingleSelection} />
            <ActionChip label="Try On" onPress={onTryOn} disabled={isBusy || !isSingleSelection} />
            <ActionChip
              label="Style Canvas"
              onPress={onStyleCanvas}
              disabled={isBusy || (!hasActiveCanvas && selectedCount === 0)}
              last
            />
          </View>

          <Text style={styles.footerHint}>{helperText}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function SmallControl({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.controlButton, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.controlButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionChip({
  label,
  onPress,
  disabled,
  last = false,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryButton, last && styles.secondaryButtonLast, disabled && styles.buttonDisabled]}
      activeOpacity={0.88}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaff',
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#1c1c1c',
    fontSize: 19,
    fontWeight: '700',
  },
  headerSub: {
    marginTop: 4,
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 13,
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#eef0f2',
  },
  doneButtonText: {
    color: '#1c1c1c',
    fontWeight: '600',
  },
  controlsRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#eef0f2',
    marginRight: 8,
  },
  controlButtonText: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '31.5%',
    marginRight: '2.75%',
    marginBottom: 12,
  },
  gridItemDisabled: {
    opacity: 0.75,
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
  },
  imageCardSelected: {
    borderColor: '#1c1c1c',
    borderWidth: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIdle: {
    backgroundColor: 'rgba(28, 28, 28, 0.48)',
  },
  badgeSelected: {
    backgroundColor: '#1c1c1c',
  },
  badgeText: {
    color: '#fafaff',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef0f2',
    backgroundColor: 'rgba(250, 250, 255, 0.98)',
  },
  selectionState: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.95,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontWeight: '700',
    marginBottom: 10,
  },
  footerPrimaryRow: {
    flexDirection: 'row',
  },
  primaryButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fafaff',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  footerSecondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  secondaryButton: {
    minWidth: '47%',
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonLast: {
    marginRight: 0,
  },
  secondaryButtonText: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontWeight: '700',
    fontSize: 13,
  },
  footerHint: {
    marginTop: 8,
    textAlign: 'left',
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 12,
    lineHeight: 18,
  },
  buttonDisabled: {
    opacity: 0.62,
  },
});
