import React from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

type LookItem = {
  id: string;
  name?: string;
  type?: string;
  image_url?: string | null;
  image_path?: string | null;
  cutout_url?: string | null;
  cutout_image_url?: string | null;
  main_category?: string;
  outfit_role?: string | null;
  reason?: string;
};

function formatRole(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'PIECE';
  if (normalized === 'base_top') return 'BASE';
  if (normalized === 'top_layer') return 'LAYER';
  if (normalized === 'onepiece') return 'ONE-PIECE';
  return normalized.toUpperCase();
}

type StyledLook = {
  id: string;
  title: string;
  summary: string;
  items: LookItem[];
};

type Props = {
  look: StyledLook;
  lockedItemId?: string;
  onTryOn: () => void;
  onSave: () => void;
  saving?: boolean;
};

export default function StyledLookCard({
  look,
  lockedItemId,
  onTryOn,
  onSave,
  saving = false,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Styled Look</Text>
          <Text style={styles.title}>{look.title}</Text>
          <Text style={styles.summary}>{look.summary}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{look.items.length} pieces</Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={look.items}
        keyExtractor={(item, index) => `${look.id}:${item.id || index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemStrip}
        renderItem={({ item }) => {
          const isLocked = item.id === lockedItemId;
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemImageFrame}>
                {item.cutout_url || item.cutout_image_url || item.image_path || item.image_url ? (
                  <WardrobeItemImage item={item} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder} />
                )}
                {isLocked ? (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>Anchor</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.itemCategory} numberOfLines={1}>
                {formatRole(item.outfit_role || item.main_category || item.type)}
              </Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name || item.type || 'Item'}
              </Text>
              <Text style={styles.itemReason} numberOfLines={2}>
                {item.reason || 'Balances the look.'}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.tryOnButton} onPress={onTryOn} activeOpacity={0.88}>
          <Text style={styles.tryOnButtonText}>Try On</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.88}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8ddd1',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#241f1b',
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: '#8a7563',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6f645a',
  },
  countPill: {
    backgroundColor: '#eef0f2',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5dbcf',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  countText: {
    color: '#5e5348',
    fontSize: 11,
    fontWeight: '700',
  },
  itemStrip: {
    paddingBottom: 2,
    paddingRight: 4,
  },
  itemCard: {
    width: 126,
    backgroundColor: '#fafaff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ece3d8',
    padding: 8,
    marginRight: 10,
    minHeight: 212,
  },
  itemImageFrame: {
    position: 'relative',
    marginBottom: 7,
  },
  itemImage: {
    width: '100%',
    height: 118,
    borderRadius: 12,
    backgroundColor: '#eef0f2',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 118,
    borderRadius: 12,
    backgroundColor: '#eef0f2',
  },
  lockedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 31, 28, 0.88)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lockedBadgeText: {
    color: '#fafaff',
    fontSize: 10,
    fontWeight: '700',
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#8e7e70',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#25201b',
    marginBottom: 3,
  },
  itemReason: {
    fontSize: 11,
    lineHeight: 15,
    color: '#71655a',
    minHeight: 30,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tryOnButton: {
    flex: 1,
    backgroundColor: '#2e2925',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  tryOnButtonText: {
    color: '#fafaff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dfd5ca',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#fafaff',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#1c1c1c',
    fontSize: 14,
    fontWeight: '700',
  },
});
