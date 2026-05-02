import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BrowserItem, WardrobeCanvasSourceItem } from '../../types/styleCanvas';

type AddSource = 'closet' | 'browser' | 'url';

type StyleCanvasAddItemsSheetProps = {
  visible: boolean;
  source: AddSource;
  availableSources?: AddSource[];
  onChangeSource: (source: AddSource) => void;
  onClose: () => void;
  closetItems: WardrobeCanvasSourceItem[];
  browserItems: BrowserItem[];
  selectedClosetIds: Record<string, boolean>;
  selectedBrowserIds: Record<string, boolean>;
  onToggleClosetItem: (itemId: string) => void;
  onToggleBrowserItem: (itemId: string) => void;
  onAddSelected: () => void;
  canAddSelected: boolean;
  isAddingSelected: boolean;
  isLoadingSourceItems?: boolean;
  pasteUrl: string;
  onChangePasteUrl: (value: string) => void;
  onSubmitPasteUrl: () => void;
  isSubmittingUrl: boolean;
};

function formatPrice(value?: number | null) {
  if (value == null) return null;
  return `$${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 2)}`;
}

function SourceChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.sourceChip, active && styles.sourceChipActive]}
    >
      <Ionicons name={icon} size={15} color={active ? '#fafaff' : '#1c1c1c'} />
      <Text style={[styles.sourceChipText, active && styles.sourceChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SelectableAssetCard({
  title,
  subtitle,
  price,
  imageUrl,
  isCutout = false,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  price?: string | null;
  imageUrl?: string | null;
  isCutout?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={[styles.assetCard, selected && styles.assetCardSelected]} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.assetImage} resizeMode={isCutout ? 'contain' : 'cover'} />
      ) : (
        <View style={styles.assetImagePlaceholder} />
      )}
      <View style={styles.assetMeta}>
        <Text numberOfLines={2} style={styles.assetTitle}>
          {title}
        </Text>
        <Text numberOfLines={2} style={styles.assetSubtitle}>
          {subtitle}
        </Text>
        {price ? <Text style={styles.assetPrice}>{price}</Text> : null}
      </View>
      <View style={[styles.assetCheck, selected && styles.assetCheckSelected]}>
        <Ionicons name={selected ? 'checkmark' : 'add'} size={15} color={selected ? '#fafaff' : '#1c1c1c'} />
      </View>
    </TouchableOpacity>
  );
}

export default function StyleCanvasAddItemsSheet({
  visible,
  source,
  availableSources = ['closet', 'browser', 'url'],
  onChangeSource,
  onClose,
  closetItems,
  browserItems,
  selectedClosetIds,
  selectedBrowserIds,
  onToggleClosetItem,
  onToggleBrowserItem,
  onAddSelected,
  canAddSelected,
  isAddingSelected,
  isLoadingSourceItems = false,
  pasteUrl,
  onChangePasteUrl,
  onSubmitPasteUrl,
  isSubmittingUrl,
}: StyleCanvasAddItemsSheetProps) {
  const sourceOptions = availableSources.length ? availableSources : ['closet'];
  const isClosetOnly = sourceOptions.length === 1 && sourceOptions[0] === 'closet';
  const selectedCount =
    source === 'closet'
      ? Object.keys(selectedClosetIds).filter((key) => selectedClosetIds[key]).length
      : Object.keys(selectedBrowserIds).filter((key) => selectedBrowserIds[key]).length;

  const primaryLabel =
    source === 'url'
      ? isSubmittingUrl
        ? 'Importing Product...'
        : 'Import Product'
      : isAddingSelected
        ? 'Adding Items...'
        : selectedCount
          ? `Add ${selectedCount} Item${selectedCount > 1 ? 's' : ''}`
          : 'Select Items';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{isClosetOnly ? 'Add Closet Pieces' : 'Add Items'}</Text>
            <Text style={styles.subtitle}>
              {isClosetOnly ? 'Pull pieces straight from your closet into the board.' : 'Keep building without leaving the canvas.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color="#1c1c1c" />
          </TouchableOpacity>
        </View>

        {sourceOptions.length > 1 ? (
          <View style={styles.sourceRow}>
            {sourceOptions.includes('closet') ? (
              <SourceChip icon="shirt-outline" label="Closet" active={source === 'closet'} onPress={() => onChangeSource('closet')} />
            ) : null}
            {sourceOptions.includes('browser') ? (
              <SourceChip icon="globe-outline" label="Browser Items" active={source === 'browser'} onPress={() => onChangeSource('browser')} />
            ) : null}
            {sourceOptions.includes('url') ? (
              <SourceChip icon="link-outline" label="Paste URL" active={source === 'url'} onPress={() => onChangeSource('url')} />
            ) : null}
          </View>
        ) : null}

        {source === 'url' ? (
          <View style={styles.urlPane}>
            <Text style={styles.urlLabel}>Paste a product page link</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://brand.com/products/example"
              placeholderTextColor="rgba(28, 28, 28, 0.42)"
              style={styles.urlInput}
              value={pasteUrl}
              onChangeText={onChangePasteUrl}
            />
            <Text style={styles.urlHint}>
              We&apos;ll scan the page, pull the hero product image, and drop it straight onto the canvas.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.assetList}>
            {(source === 'closet' ? closetItems : browserItems).map((item) => {
              const selected = source === 'closet' ? !!selectedClosetIds[item.id] : !!selectedBrowserIds[item.id];
              const title = 'name' in item ? item.name || item.source_title || 'Closet item' : item.title || 'Browser item';
              const subtitle = 'name' in item
                ? [item.brand, item.main_category || item.type].filter(Boolean).join(' · ') || 'Ready from your closet'
                : [item.brand, item.retailer].filter(Boolean).join(' · ') || 'Available from this browser session';
              const cutoutUrl = item.cutout_url || ('cutout_image_url' in item ? item.cutout_image_url : null) || null;
              const imageUrl = cutoutUrl || item.image_url || null;

              return (
                <SelectableAssetCard
                  key={item.id}
                  title={title}
                  subtitle={subtitle}
                  price={formatPrice(item.price)}
                  imageUrl={imageUrl}
                  isCutout={Boolean(cutoutUrl)}
                  selected={selected}
                  onPress={() =>
                    source === 'closet' ? onToggleClosetItem(item.id) : onToggleBrowserItem(item.id)
                  }
                />
              );
            })}

            {source === 'closet' && !closetItems.length ? (
              <Text style={styles.emptyText}>
                {isLoadingSourceItems ? 'Loading closet pieces...' : 'No closet items are ready to add right now.'}
              </Text>
            ) : null}

            {source === 'browser' && !browserItems.length ? (
              <Text style={styles.emptyText}>
                {isLoadingSourceItems ? 'Loading browser items...' : 'No browser items are available in this canvas session yet.'}
              </Text>
            ) : null}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={source === 'url' ? onSubmitPasteUrl : onAddSelected}
            disabled={source === 'url' ? isSubmittingUrl || !pasteUrl.trim() : isAddingSelected || !canAddSelected}
            style={[
              styles.primaryButton,
              (source === 'url' ? isSubmittingUrl || !pasteUrl.trim() : isAddingSelected || !canAddSelected) &&
                styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    color: '#1c1c1c',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(28, 28, 28, 0.64)',
    fontSize: 13,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0f2',
  },
  sourceRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 8,
    paddingBottom: 12,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#eef0f2',
  },
  sourceChipActive: {
    backgroundColor: '#1c1c1c',
  },
  sourceChipText: {
    color: '#1c1c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  sourceChipTextActive: {
    color: '#fafaff',
  },
  assetList: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 12,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 12,
    backgroundColor: '#f3f3f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assetCardSelected: {
    borderColor: '#1c1c1c',
    backgroundColor: '#f5efe3',
  },
  assetImage: {
    width: 78,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#ffffff',
  },
  assetImagePlaceholder: {
    width: 78,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#daddd8',
  },
  assetMeta: {
    flex: 1,
    paddingHorizontal: 12,
  },
  assetTitle: {
    color: '#1c1c1c',
    fontSize: 15,
    fontWeight: '700',
  },
  assetSubtitle: {
    marginTop: 4,
    color: 'rgba(28, 28, 28, 0.62)',
    fontSize: 12.5,
    lineHeight: 18,
  },
  assetPrice: {
    marginTop: 8,
    color: '#1c1c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  assetCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0f2',
  },
  assetCheckSelected: {
    backgroundColor: '#1c1c1c',
  },
  urlPane: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  urlLabel: {
    color: '#1c1c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  urlInput: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: '#f3f3f0',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1c1c1c',
    fontSize: 14,
  },
  urlHint: {
    marginTop: 10,
    color: 'rgba(28, 28, 28, 0.62)',
    fontSize: 12.5,
    lineHeight: 18,
  },
  emptyText: {
    paddingVertical: 40,
    textAlign: 'center',
    color: 'rgba(28, 28, 28, 0.56)',
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(28, 28, 28, 0.06)',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.42,
  },
  primaryButtonText: {
    color: '#fafaff',
    fontSize: 14,
    fontWeight: '700',
  },
});
