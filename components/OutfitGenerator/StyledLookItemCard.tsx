import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { spacing, typography } from '../../lib/theme';

type StyledLookItemCardProps = {
  item: any;
  locked?: boolean;
  onToggleLock?: () => void;
};

function formatRole(mainCategory?: string | null) {
  const raw = String(mainCategory || '').trim().toLowerCase();
  if (!raw) return 'Piece';
  if (raw === 'base_top') return 'Base';
  if (raw === 'top_layer') return 'Layer';
  if (raw === 'onepiece') return 'One-Piece';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function StyledLookItemCard({
  item,
  locked = false,
  onToggleLock,
}: StyledLookItemCardProps) {
  return (
    <View style={styles.card}>
      <WardrobeItemImage item={item} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{formatRole(item?.outfit_role || item?.main_category)}</Text>
          </View>
          {onToggleLock ? (
            <TouchableOpacity
              onPress={onToggleLock}
              style={[styles.lockButton, locked && styles.lockButtonActive]}
              activeOpacity={0.82}
            >
              <Ionicons
                name={locked ? 'lock-closed-outline' : 'lock-open-outline'}
                size={16}
                color={locked ? '#fafaff' : '#5f574f'}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.title}>{item?.name || item?.type || 'Closet piece'}</Text>

        <Text style={styles.meta}>
          {item?.type || item?.primary_color || 'Wardrobe selection'}
        </Text>

        <View style={styles.reasonBlock}>
          <Text style={styles.reasonLabel}>Why it works</Text>
          <Text style={styles.reasonText}>
            {item?.reason || 'Balanced to support the full look.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    padding: 12,
    marginBottom: 12,
  },
  image: {
    width: 92,
    height: 112,
    borderRadius: 12,
    backgroundColor: '#ece4db',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#5c5149',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: typography.fontFamily,
  },
  lockButton: {
    width: 28,
    height: 28,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
  },
  lockButtonActive: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  title: {
    marginTop: 9,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  meta: {
    marginTop: 3,
    fontSize: 12,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  reasonBlock: {
    marginTop: 9,
  },
  reasonLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.52)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontFamily: typography.fontFamily,
  },
  reasonText: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#433a33',
    fontFamily: typography.fontFamily,
  },
});
