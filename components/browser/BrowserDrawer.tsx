import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';
import { BROWSER_STORE_GROUP_ORDER } from '../../lib/browserStoreCatalog';
import {
  getAvailableCuratedBrowserStores,
  resolveUserBrowserStores,
} from '../../services/browserStoresService';
import type {
  CuratedBrowserStore,
  ResolvedBrowserStore,
  UserBrowserStore,
} from '../../types/browserStores';

type SelectableBrowserStore = {
  name: string;
  url: string;
  domain: string;
};

type BrowserDrawerProps = {
  open: boolean;
  drawerX: Animated.Value;
  backdropOpacity: Animated.Value;
  width: number;
  curatedStores: CuratedBrowserStore[];
  userStores: UserBrowserStore[];
  storesSupported: boolean;
  storesLoading: boolean;
  storesMutating: boolean;
  onClose: () => void;
  onSelectSite: (site: SelectableBrowserStore) => void;
  onAddCuratedStore: (store: CuratedBrowserStore) => Promise<boolean> | boolean;
  onAddCustomStore: (input: { name?: string; url: string }) => Promise<boolean> | boolean;
  onUpdateCustomStore: (storeId: string, input: { name?: string; url: string }) => Promise<boolean> | boolean;
  onRemoveUserStore: (store: UserBrowserStore) => Promise<boolean> | boolean;
  onMoveUserStore: (storeId: string, direction: 'up' | 'down') => Promise<boolean> | boolean;
};

function matchesSearch(value: string, searchValue: string) {
  return String(value || '').toLowerCase().includes(searchValue);
}

function buildCuratedSections(stores: CuratedBrowserStore[], searchValue: string) {
  const grouped = BROWSER_STORE_GROUP_ORDER.map((group) => ({
    title: group,
    items: stores.filter((store) => {
      if (store.group !== group) return false;
      if (!searchValue) return true;
      return (
        matchesSearch(store.name, searchValue) ||
        matchesSearch(store.domain, searchValue)
      );
    }),
  })).filter((section) => section.items.length > 0);

  const remaining = stores.filter((store) => {
    if (BROWSER_STORE_GROUP_ORDER.includes(store.group as any)) return false;
    if (!searchValue) return true;
    return (
      matchesSearch(store.name, searchValue) ||
      matchesSearch(store.domain, searchValue)
    );
  });

  if (remaining.length) {
    grouped.push({ title: 'More Stores', items: remaining });
  }

  return grouped;
}

function initialsForStore(name: string) {
  const compact = String(name || '').trim();
  return compact ? compact.slice(0, 1).toUpperCase() : 'S';
}

export default function BrowserDrawer({
  open,
  drawerX,
  backdropOpacity,
  width,
  curatedStores,
  userStores,
  storesSupported,
  storesLoading,
  storesMutating,
  onClose,
  onSelectSite,
  onAddCuratedStore,
  onAddCustomStore,
  onUpdateCustomStore,
  onRemoveUserStore,
  onMoveUserStore,
}: BrowserDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addMode, setAddMode] = useState<'curated' | 'custom'>('curated');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [editingCustomStoreId, setEditingCustomStoreId] = useState<string | null>(null);

  const normalizedSearch = String(searchQuery || '').trim().toLowerCase();
  const resolvedUserStores = useMemo(
    () => resolveUserBrowserStores(userStores, curatedStores),
    [curatedStores, userStores],
  );
  const filteredUserStores = useMemo(
    () =>
      resolvedUserStores.filter((store) => {
        if (!normalizedSearch) return true;
        return (
          matchesSearch(store.name, normalizedSearch) ||
          matchesSearch(store.domain, normalizedSearch)
        );
      }),
    [normalizedSearch, resolvedUserStores],
  );
  const availableCuratedStores = useMemo(
    () => getAvailableCuratedBrowserStores(userStores, curatedStores),
    [curatedStores, userStores],
  );
  const curatedSections = useMemo(
    () => buildCuratedSections(availableCuratedStores, normalizedSearch),
    [availableCuratedStores, normalizedSearch],
  );

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setEditMode(false);
      setShowAddPanel(false);
      setAddMode('curated');
      setCustomName('');
      setCustomUrl('');
      setEditingCustomStoreId(null);
    }
  }, [open]);

  const resetCustomEditor = () => {
    setCustomName('');
    setCustomUrl('');
    setEditingCustomStoreId(null);
  };

  const handleToggleEditMode = () => {
    if (!storesSupported) return;
    setEditMode((value) => {
      const nextValue = !value;
      if (!nextValue) {
        setShowAddPanel(false);
        resetCustomEditor();
      }
      return nextValue;
    });
  };

  const handleStartCustomEdit = (store: UserBrowserStore) => {
    setEditMode(true);
    setShowAddPanel(true);
    setAddMode('custom');
    setEditingCustomStoreId(store.id);
    setCustomName(store.name);
    setCustomUrl(store.url);
  };

  const handleSaveCustomStore = async () => {
    if (storesMutating) return;
    let didSave = true;
    if (editingCustomStoreId) {
      didSave = (await onUpdateCustomStore(editingCustomStoreId, { name: customName, url: customUrl })) !== false;
    } else {
      didSave = (await onAddCustomStore({ name: customName, url: customUrl })) !== false;
    }
    if (didSave) {
      resetCustomEditor();
      setShowAddPanel(false);
    }
  };

  const drawerSubtitle = storesSupported
    ? 'Browse retailers, pin the sites you actually shop, and adjust your list inline.'
    : 'Browse retailers and import from your favorite stores.';

  return (
    <>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: '#000', opacity: backdropOpacity },
        ]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawer, { width, transform: [{ translateX: drawerX }] }]}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Shops</Text>
                <Text style={styles.subtitle}>{drawerSubtitle}</Text>
              </View>

              {storesSupported ? (
                <TouchableOpacity
                  activeOpacity={0.84}
                  style={styles.headerAction}
                  onPress={handleToggleEditMode}
                  disabled={storesMutating}
                >
                  <Text style={styles.headerActionText}>{editMode ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons
              name="search-outline"
              size={16}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search stores"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Your Stores</Text>
                  <Text style={styles.sectionSub}>
                    {storesSupported
                      ? 'Pinned first so your browser opens around your actual shopping habits.'
                      : 'Store personalization will appear here after the database migration is applied.'}
                  </Text>
                </View>
              </View>

              {storesSupported && editMode ? (
                <TouchableOpacity
                  activeOpacity={0.84}
                  style={styles.inlineAddButton}
                  onPress={() =>
                    setShowAddPanel((value) => {
                      if (value) resetCustomEditor();
                      return !value;
                    })
                  }
                  disabled={storesMutating}
                >
                  <View style={styles.inlineAddIconWrap}>
                    <Ionicons
                      name={showAddPanel ? 'close-outline' : 'add-outline'}
                      size={15}
                      color={colors.textPrimary}
                    />
                  </View>
                  <View style={styles.inlineAddCopy}>
                    <Text style={styles.inlineAddButtonText}>{showAddPanel ? 'Close Add Panel' : 'Add Store'}</Text>
                    <Text style={styles.inlineAddButtonSub}>
                      {showAddPanel ? 'Hide curated and custom add options.' : 'Pin a curated site or add your own URL.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <View style={styles.sectionCard}>
                {storesLoading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={colors.textPrimary} />
                  </View>
                ) : filteredUserStores.length ? (
                  filteredUserStores.map((store, index) => {
                    const rawStore = userStores.find((candidate) => candidate.id === store.id);
                    const actualIndex = resolvedUserStores.findIndex((candidate) => candidate.id === store.id);
                    if (!rawStore) return null;

                    return (
                      <StoreRow
                        key={store.id}
                        name={store.name}
                        domain={store.domain}
                        onPress={() => {
                          if (editMode) return;
                          onSelectSite(store);
                        }}
                        showDivider={index < filteredUserStores.length - 1}
                        disabled={editMode}
                        sourceLabel={store.source_type === 'custom' ? 'Custom' : undefined}
                        editMode={editMode}
                        storesMutating={storesMutating}
                        onMoveUp={() => onMoveUserStore(store.id, 'up')}
                        onMoveDown={() => onMoveUserStore(store.id, 'down')}
                        onEditCustom={
                          rawStore.source_type === 'custom'
                            ? () => handleStartCustomEdit(rawStore)
                            : undefined
                        }
                        onRemove={() => onRemoveUserStore(rawStore)}
                        canMoveUp={actualIndex > 0}
                        canMoveDown={actualIndex > -1 && actualIndex < resolvedUserStores.length - 1}
                      />
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No stores pinned yet</Text>
                    <Text style={styles.emptySub}>
                      {storesSupported
                        ? 'Pin your favorite websites so Browser opens around where you actually shop.'
                        : 'Curated stores still work normally until personalization is available.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {storesSupported && editMode && showAddPanel ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add Store</Text>
                <View style={styles.addPanel}>
                  <View style={styles.tabRow}>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      style={[styles.tabButton, addMode === 'curated' && styles.tabButtonActive]}
                      onPress={() => {
                        resetCustomEditor();
                        setAddMode('curated');
                      }}
                    >
                      <Text style={[styles.tabButtonText, addMode === 'curated' && styles.tabButtonTextActive]}>
                        Curated
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.84}
                      style={[styles.tabButton, addMode === 'custom' && styles.tabButtonActive]}
                      onPress={() => setAddMode('custom')}
                    >
                      <Text style={[styles.tabButtonText, addMode === 'custom' && styles.tabButtonTextActive]}>
                        Custom URL
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {addMode === 'curated' ? (
                    <>
                      <Text style={styles.addPanelCopy}>
                        Pin built-in stores so they stay at the top of Browser.
                      </Text>
                      <View style={styles.addList}>
                        {curatedSections.length ? (
                          curatedSections.map((section) => (
                            <View key={section.title} style={styles.addListSection}>
                              <Text style={styles.addListSectionTitle}>{section.title}</Text>
                              {section.items.map((store) => (
                                <StoreAddRow
                                  key={store.key}
                                  name={store.name}
                                  domain={store.domain}
                                  onAdd={() => onAddCuratedStore(store)}
                                  disabled={storesMutating}
                                />
                              ))}
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptySub}>No curated stores match your search.</Text>
                        )}
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.addPanelCopy}>
                        Add any website you shop so it opens directly from your Browser drawer.
                      </Text>
                      <TextInput
                        value={customName}
                        onChangeText={setCustomName}
                        placeholder="Store name (optional)"
                        placeholderTextColor={colors.textMuted}
                        style={styles.formInput}
                        autoCapitalize="words"
                      />
                      <TextInput
                        value={customUrl}
                        onChangeText={setCustomUrl}
                        placeholder="https://store.com"
                        placeholderTextColor={colors.textMuted}
                        style={styles.formInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                      />
                      <TouchableOpacity
                        activeOpacity={0.84}
                        style={[styles.primaryAction, storesMutating && styles.actionDisabled]}
                        onPress={() => {
                          void handleSaveCustomStore();
                        }}
                        disabled={storesMutating}
                      >
                        <Text style={styles.primaryActionText}>
                          {editingCustomStoreId ? 'Update Store' : 'Add Store'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : null}

            {!editMode
              ? curatedSections.map((section) => (
                  <View key={section.title} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.sectionCard}>
                      {section.items.map((store, index) => (
                        <StoreRow
                          key={store.key}
                          name={store.name}
                          domain={store.domain}
                          onPress={() => onSelectSite(store)}
                          showDivider={index < section.items.length - 1}
                        />
                      ))}
                    </View>
                  </View>
                ))
              : null}

            {!storesLoading && !editMode && !curatedSections.length && !filteredUserStores.length ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No stores found</Text>
                <Text style={styles.emptySub}>Try a different store name or domain.</Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

function StoreRow({
  name,
  domain,
  onPress,
  showDivider,
  disabled = false,
  sourceLabel,
  editMode = false,
  storesMutating = false,
  onMoveUp,
  onMoveDown,
  onEditCustom,
  onRemove,
  canMoveUp = true,
  canMoveDown = true,
}: {
  name: string;
  domain: string;
  onPress: () => void;
  showDivider: boolean;
  disabled?: boolean;
  sourceLabel?: string;
  editMode?: boolean;
  storesMutating?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEditCustom?: () => void;
  onRemove?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={editMode ? 1 : 0.84}
      style={[styles.item, showDivider && styles.itemDivider]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.faviconCircle}>
        <Text style={styles.faviconText}>{initialsForStore(name)}</Text>
      </View>

      <View style={styles.itemCopy}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.siteName} numberOfLines={1}>
            {name}
          </Text>
          {sourceLabel ? (
            <View style={styles.sourcePill}>
              <Text style={styles.sourcePillText} numberOfLines={1}>
                {sourceLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.siteDomain} numberOfLines={1} ellipsizeMode="middle">
          {domain}
        </Text>

        {editMode ? (
          <View style={styles.controlsWrap}>
            <View style={styles.controlsRow}>
              <IconControl
                icon="arrow-up-outline"
                onPress={onMoveUp}
                disabled={storesMutating || !canMoveUp}
              />
              <IconControl
                icon="arrow-down-outline"
                onPress={onMoveDown}
                disabled={storesMutating || !canMoveDown}
              />
              {onEditCustom ? (
                <IconControl
                  icon="create-outline"
                  onPress={onEditCustom}
                  disabled={storesMutating}
                />
              ) : null}
              <IconControl
                icon="trash-outline"
                onPress={onRemove}
                disabled={storesMutating}
                destructive
              />
            </View>
          </View>
        ) : null}
      </View>

      {!editMode ? (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      ) : null}
    </TouchableOpacity>
  );
}

function StoreAddRow({
  name,
  domain,
  onAdd,
  disabled,
}: {
  name: string;
  domain: string;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.addRow}>
      <View style={styles.faviconCircle}>
        <Text style={styles.faviconText}>{initialsForStore(name)}</Text>
      </View>

      <View style={styles.itemCopy}>
        <Text style={styles.siteName}>{name}</Text>
        <Text style={styles.siteDomain}>{domain}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.84}
        style={[styles.addStoreButton, disabled && styles.actionDisabled]}
        onPress={onAdd}
        disabled={disabled}
      >
        <Ionicons name="add-outline" size={16} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function IconControl({
  icon,
  onPress,
  disabled,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      style={[
        styles.iconControl,
        destructive && styles.iconControlDestructive,
        disabled && styles.iconControlDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <Ionicons
        name={icon}
        size={15}
        color={disabled ? colors.textMuted : destructive ? colors.textPrimary : colors.textPrimary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 12,
    paddingHorizontal: 14,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  headerAction: {
    minHeight: 34,
    paddingHorizontal: spacing.md - 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 18,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    gap: 6,
    marginBottom: 12,
  },
  sectionHeaderCopy: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  sectionSub: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    maxWidth: 240,
  },
  inlineAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  inlineAddIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  inlineAddCopy: {
    flex: 1,
    gap: 2,
  },
  inlineAddButtonText: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  inlineAddButtonSub: {
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 78,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 4,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  faviconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  faviconText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  siteName: {
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    flexShrink: 1,
  },
  siteDomain: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  sourcePill: {
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignSelf: 'flex-start',
  },
  sourcePillText: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  controlsWrap: {
    marginTop: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  iconControl: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconControlDestructive: {
    backgroundColor: colors.surface,
  },
  iconControlDisabled: {
    opacity: 0.4,
  },
  emptyState: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  addPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  tabButtonTextActive: {
    color: colors.textOnAccent,
  },
  addPanelCopy: {
    marginTop: spacing.md,
    marginBottom: spacing.md - 2,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  addList: {
    gap: spacing.md - 2,
  },
  addListSection: {
    gap: spacing.xs,
  },
  addListSectionTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  addStoreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.sm + 2,
  },
  primaryAction: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
  actionDisabled: {
    opacity: 0.45,
  },
});
