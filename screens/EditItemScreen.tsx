import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import { updateWardrobeItemWithCompatibility } from '../lib/wardrobeStorage';
import WardrobeItemImage from '../components/Closet/WardrobeItemImage';
import EditItemAdvancedSection from '../components/Closet/edit/EditItemAdvancedSection';
import EditItemChipGroup from '../components/Closet/edit/EditItemChipGroup';
import EditItemHeader from '../components/Closet/edit/EditItemHeader';
import EditItemSection from '../components/Closet/edit/EditItemSection';
import {
  buildEditItemPayload,
  CATEGORY_OPTIONS,
  COLORS,
  createEditItemDraft,
  formatItemMeta,
  getSubtypeChipOptions,
  SEASONS,
} from '../lib/closetItemEditor';
import { getFriendlyTypeLabel, isSubtypeInCategory } from '../lib/wardrobeTaxonomy';

function formatTitle(value: string) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function DetailField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9d9388"
        multiline={multiline}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

export default function EditItemScreen({ route, navigation }: any) {
  const item = route?.params?.item;
  const insets = useSafeAreaInsets();
  const [loadedItem, setLoadedItem] = useState(item);
  const [draft, setDraft] = useState(() => createEditItemDraft(item));
  const [loadingItem, setLoadingItem] = useState(Boolean(item?.id));
  const [saving, setSaving] = useState(false);

  const subtypeOptions = useMemo(
    () => getSubtypeChipOptions(draft.main_category),
    [draft.main_category],
  );

  useEffect(() => {
    let isActive = true;

    const hydrateItem = async () => {
      if (!item?.id) {
        if (isActive) setLoadingItem(false);
        return;
      }

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          if (isActive) setLoadingItem(false);
          return;
        }

        const response = await supabase
          .from('wardrobe')
          .select('*')
          .eq('id', item.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isActive) return;

        if (response.error) {
          console.error('EditItemScreen hydrate error:', response.error.message);
          return;
        }

        if (response.data) {
          setLoadedItem(response.data);
          setDraft(createEditItemDraft(response.data));
        }
      } finally {
        if (isActive) {
          setLoadingItem(false);
        }
      }
    };

    void hydrateItem();

    return () => {
      isActive = false;
    };
  }, [item?.id]);

  const updateField = (key: string, value: string) => {
    setDraft((current: any) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!item?.id) {
      Alert.alert('Missing Item', 'This item could not be loaded for editing.');
      return;
    }

    setSaving(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      Alert.alert('Not Logged In', 'Please log in to edit this item.');
      return;
    }

    const payload = buildEditItemPayload(draft, loadedItem || item);
    const { error } = await updateWardrobeItemWithCompatibility({
      payload,
      itemId: item.id,
      userId: user.id,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Save Failed', error.message);
      return;
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top }}>
          <EditItemHeader
            onBack={() => navigation.goBack()}
            onSave={handleSave}
            saving={saving}
          />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 48 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.imageCard}>
            <WardrobeItemImage
              item={loadedItem || item}
              style={styles.image}
              resizeMode="cover"
              imagePreference="display"
            />
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => Alert.alert('Coming Soon', 'Photo replacement will be added here.')}
              style={styles.replaceButton}
            >
              <Text style={styles.replaceText}>Replace Image</Text>
            </TouchableOpacity>
          </View>

          {loadingItem ? (
            <View style={styles.syncBanner}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={styles.syncBannerText}>Loading full item metadata...</Text>
            </View>
          ) : null}

          <EditItemSection
            title="Details"
            subtitle="Refine the core identity fields that shape how this piece shows up across your closet."
          >
            <DetailField
              label="Item Name"
              value={draft.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Name this piece"
            />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Main Category</Text>
              <EditItemChipGroup
                options={CATEGORY_OPTIONS}
                value={draft.main_category}
                onChange={(next) => {
                  setDraft((current: any) => ({
                    ...current,
                    main_category: next,
                    subcategory: isSubtypeInCategory(current.subcategory, next) ? current.subcategory : '',
                    type: isSubtypeInCategory(current.subcategory, next)
                      ? current.type
                      : '',
                  }));
                }}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Subtype</Text>
              {subtypeOptions.length ? (
                <EditItemChipGroup
                  options={subtypeOptions}
                  value={draft.subcategory}
                  onChange={(next) =>
                    setDraft((current: any) => ({
                      ...current,
                      subcategory: next,
                      type: getFriendlyTypeLabel(next, current.type) || current.type,
                    }))
                  }
                />
              ) : (
                <Text style={styles.helperText}>Choose a main category to refine the subtype.</Text>
              )}
            </View>
          </EditItemSection>

          <EditItemSection
            title="Attributes"
            subtitle="Keep the metadata crisp so styling, search, and recommendations stay useful."
          >
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Color</Text>
              <EditItemChipGroup
                options={COLORS}
                value={draft.primary_color}
                onChange={(next) => updateField('primary_color', next)}
              />
            </View>

            <DetailField
              label="Pattern"
              value={draft.pattern_description}
              onChangeText={(value) => updateField('pattern_description', value)}
              placeholder="Stripe, graphic, textured..."
            />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Season</Text>
              <EditItemChipGroup
                options={SEASONS}
                value={draft.season || 'all'}
                onChange={(next) => updateField('season', next)}
              />
            </View>

            <DetailField
              label="Vibe Tags"
              value={draft.vibe_tags}
              onChangeText={(value) => updateField('vibe_tags', value)}
              placeholder="casual, minimal, tailored"
            />
          </EditItemSection>

          <EditItemSection
            title="Advanced"
            subtitle="These fields are structured now so the editor can scale into resale, notes, and richer product metadata later."
          >
            <EditItemAdvancedSection draft={draft} setDraft={setDraft} />
          </EditItemSection>

          <View style={styles.footerNote}>
            <Text style={styles.footerNoteLabel}>Current Piece</Text>
            <Text style={styles.footerNoteValue}>
              {[
                formatItemMeta(draft.main_category),
                formatItemMeta(draft.primary_color),
                formatItemMeta(draft.season || 'all'),
              ]
                .filter(Boolean)
                .map(formatTitle)
                .join('  ·  ')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  imageCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  image: {
    width: '100%',
    aspectRatio: 0.98,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  replaceButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
  },
  replaceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  syncBanner: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBannerText: {
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  footerNote: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  footerNoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  footerNoteValue: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});
