import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WardrobeItemImage from '../WardrobeItemImage';
import { spacing, typography } from '../../../lib/theme';
import { formatItemMeta } from '../../../lib/closetItemEditor';
import ItemMetaRow from './ItemMetaRow';
import ItemPreviewModalActions from './ItemPreviewModalActions';

const { width, height } = Dimensions.get('window');

function formatTitle(value: string) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ViewItemModal({
  visible,
  onClose,
  items,
  initialIndex,
  onEdit,
  onStyle,
}: {
  visible: boolean;
  onClose: () => void;
  items: any[];
  initialIndex: number | null;
  onEdit?: (item: any) => void;
  onStyle?: (item: any) => void;
}) {
  const flatListRef = useRef<FlatList<any> | null>(null);

  useEffect(() => {
    if (!visible || initialIndex === null || initialIndex === undefined) return;

    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToIndex?.({ index: initialIndex, animated: false });
    }, 30);

    return () => clearTimeout(timeout);
  }, [initialIndex, visible]);

  if (!visible || !items?.length) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.viewport}>
          <FlatList
            ref={flatListRef}
            data={items}
            horizontal
            snapToInterval={width}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            initialScrollIndex={initialIndex || 0}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item, index }) => (
              <View style={styles.cardWrapper}>
                <View style={styles.card}>
                  <TouchableOpacity activeOpacity={0.84} style={styles.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={18} color="#1c1c1c" />
                  </TouchableOpacity>

                  <View style={styles.headerRow}>
                    <Text style={styles.eyebrow}>
                      {formatTitle(formatItemMeta(item.main_category || item.type || 'Wardrobe'))}
                    </Text>
                    {items.length > 1 ? (
                      <Text style={styles.position}>{index + 1} / {items.length}</Text>
                    ) : null}
                  </View>

                  <View style={styles.imageFrame}>
                    <WardrobeItemImage item={item} style={styles.image} resizeMode="cover" />
                  </View>

                  <View style={styles.copyBlock}>
                    <Text style={styles.name}>{item.name || formatTitle(item.type) || 'Untitled Piece'}</Text>
                    <ItemMetaRow
                      items={[
                        formatTitle(formatItemMeta(item.primary_color || item.color)),
                        formatTitle(formatItemMeta(item.season)),
                        formatTitle(formatItemMeta(item.pattern_description || item.type)),
                      ]}
                    />
                    {item?.type ? (
                      <Text style={styles.descriptor}>{formatTitle(formatItemMeta(item.type))}</Text>
                    ) : null}
                  </View>

                  <ItemPreviewModalActions
                    onEdit={() => onEdit?.(item)}
                    onStyle={() => onStyle?.(item)}
                  />
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 22, 18, 0.34)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 28,
  },
  viewport: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 390,
    maxHeight: height * 0.84,
    borderRadius: 18,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingRight: 40,
  },
  eyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  position: {
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.9,
    color: 'rgba(28, 28, 28, 0.52)',
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  imageFrame: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#eef0f2',
  },
  image: {
    width: '100%',
    aspectRatio: 0.94,
  },
  copyBlock: {
    marginTop: 14,
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
    color: '#1c1c1c',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  descriptor: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(28, 28, 28, 0.72)',
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
});
