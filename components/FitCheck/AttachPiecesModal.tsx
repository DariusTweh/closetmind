import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchField from '../SavedOutfits/SearchField';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';
import type { FitCheckAttachLook, FitCheckItem } from '../../types/fitCheck';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

export default function AttachPiecesModal({
  visible,
  items,
  selectedIds,
  savedLooks = [],
  loadingSavedLooks = false,
  onToggle,
  onAttachLook,
  onClose,
  onDone,
}: {
  visible: boolean;
  items: FitCheckItem[];
  selectedIds: string[];
  savedLooks?: FitCheckAttachLook[];
  loadingSavedLooks?: boolean;
  onToggle: (item: FitCheckItem) => void;
  onAttachLook: (look: FitCheckAttachLook) => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'closet' | 'saved'>('closet');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setQuery('');
      setActiveTab('closet');
    }
  }, [visible]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredClosetItems = useMemo(
    () =>
      items.filter((item) =>
        !normalizedQuery
          ? true
          : [item.name, item.main_category, item.type].some((value) =>
              String(value || '').toLowerCase().includes(normalizedQuery),
            ),
      ),
    [items, normalizedQuery],
  );
  const filteredSavedLooks = useMemo(
    () =>
      savedLooks.filter((look) =>
        !normalizedQuery
          ? true
          : [
              look.title,
              look.subtitle,
              ...look.items.flatMap((item) => [item.name, item.main_category, item.type]),
            ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)),
      ),
    [normalizedQuery, savedLooks],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Attach Pieces</Text>
              <Text style={styles.title}>Pick what is in the fit</Text>
            </View>
            <TouchableOpacity activeOpacity={0.88} onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabSwitch}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setActiveTab('closet')}
              style={[styles.tabButton, activeTab === 'closet' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, activeTab === 'closet' && styles.tabButtonTextActive]}>
                Closet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setActiveTab('saved')}
              style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, activeTab === 'saved' && styles.tabButtonTextActive]}>
                Saved Fits
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={
                activeTab === 'closet'
                  ? 'Search your closet pieces'
                  : 'Search saved fits or attached pieces'
              }
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={activeTab === 'closet' ? styles.grid : styles.savedList}
          >
            {activeTab === 'closet'
              ? filteredClosetItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.9}
                      onPress={() => onToggle(item)}
                      style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    >
                      <WardrobeItemImage item={item} style={styles.itemImage} imagePreference="thumbnail" />
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {item.main_category || item.type || 'piece'}
                      </Text>
                      {isSelected ? (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              : null}

            {activeTab === 'saved' && loadingSavedLooks ? (
              <View style={styles.emptyStateCard}>
                <ActivityIndicator size="small" color={colors.textPrimary} />
                <Text style={styles.emptyStateTitle}>Loading saved fits</Text>
                <Text style={styles.emptyStateCopy}>
                  Pulling your saved looks so you can attach pieces faster.
                </Text>
              </View>
            ) : null}

            {activeTab === 'saved' && !loadingSavedLooks
              ? filteredSavedLooks.map((look) => {
                  const lookItemIds = look.items.map((item) => item.id);
                  const fullyAttached =
                    lookItemIds.length > 0 && lookItemIds.every((id) => selectedIds.includes(id));

                  return (
                    <TouchableOpacity
                      key={look.id}
                      activeOpacity={0.9}
                      onPress={() => onAttachLook(look)}
                      style={[styles.savedLookCard, fullyAttached && styles.savedLookCardSelected]}
                    >
                      <View style={styles.savedLookHeader}>
                        <View style={styles.savedLookCopy}>
                          <Text style={styles.savedLookTitle} numberOfLines={1}>
                            {look.title}
                          </Text>
                          {look.subtitle ? (
                            <Text style={styles.savedLookSubtitle} numberOfLines={2}>
                              {look.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.savedLookAction, fullyAttached && styles.savedLookActionActive]}>
                          <Text
                            style={[
                              styles.savedLookActionText,
                              fullyAttached && styles.savedLookActionTextActive,
                            ]}
                          >
                            {fullyAttached ? 'Added' : 'Attach'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.savedLookPreviewRow}>
                        {look.items.slice(0, 4).map((item) => (
                          <WardrobeItemImage
                            key={`${look.id}-${item.id}`}
                            item={item}
                            style={styles.savedLookThumb}
                            imagePreference="thumbnail"
                          />
                        ))}
                      </View>

                      <Text style={styles.savedLookMeta}>
                        {look.items.length} {look.items.length === 1 ? 'piece' : 'pieces'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              : null}

            {activeTab === 'closet' && !filteredClosetItems.length ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>No closet pieces found</Text>
                <Text style={styles.emptyStateCopy}>
                  Try another search or attach from one of your saved fits instead.
                </Text>
              </View>
            ) : null}

            {activeTab === 'saved' && !loadingSavedLooks && !filteredSavedLooks.length ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>No saved fits found</Text>
                <Text style={styles.emptyStateCopy}>
                  Search another fit name, or pull pieces directly from your closet.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity activeOpacity={0.9} onPress={onDone} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.3)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.background,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  tabSwitch: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tabButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
  },
  tabButtonText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  tabButtonTextActive: {
    color: colors.textOnAccent,
  },
  searchWrap: {
    marginBottom: 16,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
  },
  savedList: {
    gap: 12,
    paddingBottom: 8,
  },
  itemCard: {
    width: '47%',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  itemCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  itemName: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  itemMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    textTransform: 'capitalize',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedLookCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 16,
    gap: 12,
  },
  savedLookCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  savedLookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  savedLookCopy: {
    flex: 1,
    minWidth: 0,
  },
  savedLookTitle: {
    fontSize: 17,
    lineHeight: 21,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  savedLookSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  savedLookAction: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedLookActionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  savedLookActionText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  savedLookActionTextActive: {
    color: colors.textOnAccent,
  },
  savedLookPreviewRow: {
    flexDirection: 'row',
    gap: 10,
  },
  savedLookThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  savedLookMeta: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  emptyStateCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    textAlign: 'center',
  },
  emptyStateCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
  },
  doneButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
