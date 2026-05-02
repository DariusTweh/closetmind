import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import OnboardingChip from '../../components/Onboarding/OnboardingChip';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import {
  BROWSER_STORE_GROUP_ORDER,
  CURATED_BROWSER_STORES,
  deriveBrowserStoreDomain,
  deriveBrowserStoreName,
  normalizeBrowserStoreUrl,
} from '../../lib/browserStoreCatalog';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';
import {
  fetchUserBrowserStores,
  isBrowserStoresAuthError,
  isBrowserStoresSchemaError,
  replaceUserBrowserStores,
} from '../../services/browserStoresService';
import type { BrowserStoreDraft } from '../../types/browserStores';
import { ONBOARDING_STAGES, updateOnboardingProgress } from '../../lib/onboarding';

const MAX_SELECTED_STORES = 5;

function buildCuratedDraft(store: (typeof CURATED_BROWSER_STORES)[number]): BrowserStoreDraft {
  return {
    catalog_key: store.key,
    name: store.name,
    url: store.url,
    domain: store.domain,
    source_type: 'curated',
  };
}

function buildUserStoreDraft(store: any): BrowserStoreDraft {
  return {
    catalog_key: store.catalog_key ?? null,
    name: String(store.name || '').trim(),
    url: String(store.url || '').trim(),
    domain: String(store.domain || '').trim(),
    source_type: store.source_type === 'curated' ? 'curated' : 'custom',
  };
}

function isDuplicateStore(list: BrowserStoreDraft[], nextStore: BrowserStoreDraft) {
  return list.some((store) => {
    if (nextStore.catalog_key && store.catalog_key === nextStore.catalog_key) return true;
    return store.url === nextStore.url;
  });
}

export default function OnboardingFavoriteStoresScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storesSupported, setStoresSupported] = useState(true);
  const [selectedStores, setSelectedStores] = useState<BrowserStoreDraft[]>([]);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        const result = await fetchUserBrowserStores();
        if (cancelled) return;

        setStoresSupported(result.supported);
        setSelectedStores(result.items.slice(0, MAX_SELECTED_STORES).map((item) => buildUserStoreDraft(item)));
      } catch (error: any) {
        console.error('Load onboarding favorite stores failed:', error?.message || error);
        if (isBrowserStoresAuthError(error)) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
        if (!cancelled) {
          setStoresSupported(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const selectedCatalogKeys = useMemo(
    () => new Set(selectedStores.map((store) => store.catalog_key).filter(Boolean) as string[]),
    [selectedStores],
  );

  const groupedCuratedStores = useMemo(
    () =>
      BROWSER_STORE_GROUP_ORDER.map((group) => ({
        title: group,
        items: CURATED_BROWSER_STORES.filter((store) => store.group === group),
      })).filter((section) => section.items.length > 0),
    [],
  );

  const toggleCuratedStore = (store: (typeof CURATED_BROWSER_STORES)[number]) => {
    const exists = selectedStores.some((entry) => entry.catalog_key === store.key);
    if (exists) {
      setSelectedStores((current) => current.filter((entry) => entry.catalog_key !== store.key));
      return;
    }
    if (selectedStores.length >= MAX_SELECTED_STORES) {
      Alert.alert('Store limit', `Choose up to ${MAX_SELECTED_STORES} stores for now.`);
      return;
    }
    setSelectedStores((current) => [...current, buildCuratedDraft(store)]);
  };

  const handleAddCustomStore = () => {
    const normalizedUrl = normalizeBrowserStoreUrl(customUrl);
    if (!normalizedUrl) {
      Alert.alert('Enter a valid URL', 'Use a real website like `store.com` or `https://store.com`.');
      return;
    }

    const domain = deriveBrowserStoreDomain(normalizedUrl);
    if (!domain) {
      Alert.alert('Invalid store', 'That website could not be parsed.');
      return;
    }

    const nextStore: BrowserStoreDraft = {
      catalog_key: null,
      name: String(customName || '').trim() || deriveBrowserStoreName(normalizedUrl) || domain,
      url: normalizedUrl,
      domain,
      source_type: 'custom',
    };

    if (isDuplicateStore(selectedStores, nextStore)) {
      Alert.alert('Already selected', 'That store is already part of your onboarding list.');
      return;
    }
    if (selectedStores.length >= MAX_SELECTED_STORES) {
      Alert.alert('Store limit', `Choose up to ${MAX_SELECTED_STORES} stores for now.`);
      return;
    }

    setSelectedStores((current) => [...current, nextStore]);

    setCustomName('');
    setCustomUrl('');
  };

  const handleContinue = async () => {
    try {
      setSaving(true);
      const { data: userData } = await supabase.auth.getUser();
      const nextUserId = userData?.user?.id || null;

      if (storesSupported) {
        await replaceUserBrowserStores(selectedStores);
      }

      if (nextUserId) {
        await updateOnboardingProgress(nextUserId, {
          stage: ONBOARDING_STAGES.STYLE_UPLOAD,
        }).catch((error) => {
          console.warn('Onboarding stage update failed:', error?.message || error);
        });
      }
      navigation.navigate('OnboardingStyle');
    } catch (error: any) {
      console.error('Save onboarding favorite stores failed:', error?.message || error);

      if (isBrowserStoresAuthError(error)) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      if (isBrowserStoresSchemaError(error)) {
        Alert.alert(
          'Store sync unavailable',
          'We could not save your favorite stores yet, but onboarding can continue normally.',
        );
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await updateOnboardingProgress(userData.user.id, {
            stage: ONBOARDING_STAGES.STYLE_UPLOAD,
          }).catch(() => null);
        }
        navigation.navigate('OnboardingStyle');
        return;
      }

      Alert.alert(
        'Could not save stores',
        'Your favorite stores were not saved, but you can add them later from Browser.',
      );
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        await updateOnboardingProgress(userData.user.id, {
          stage: ONBOARDING_STAGES.STYLE_UPLOAD,
        }).catch(() => null);
      }
      navigation.navigate('OnboardingStyle');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      await updateOnboardingProgress(data.user.id, {
        stage: ONBOARDING_STAGES.STYLE_UPLOAD,
      }).catch(() => null);
    }
    navigation.navigate('OnboardingStyle');
  };

  if (loading) {
    return (
      <OnboardingScaffold
        step="Step 6 of 7"
        title="Shop where you already shop."
        subtitle="Pin the sites you actually browse so Browser opens around your real shopping routine."
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      step="Step 6 of 7"
      title="Shop where you already shop."
      subtitle="Pick the websites that already define your shopping habits. This is optional, but it makes Browser feel personal right away."
      scroll
      footer={
        <View style={styles.footerStack}>
          <TouchableOpacity
            activeOpacity={0.84}
            style={[styles.secondaryButton, saving && styles.buttonDisabled]}
            onPress={() => {
              void handleSkip();
            }}
            disabled={saving}
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={() => {
              void handleContinue();
            }}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {!storesSupported ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Store sync is not ready yet</Text>
          <Text style={styles.noticeText}>
            You can still continue onboarding now. After the database migration is applied, favorite stores will save here and appear in Browser.
          </Text>
        </View>
      ) : null}

      <View style={styles.selectionCard}>
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionEyebrow}>Selected Stores</Text>
          <Text style={styles.selectionCount}>
            {selectedStores.length} / {MAX_SELECTED_STORES}
          </Text>
        </View>

        {selectedStores.length ? (
          <View style={styles.selectedList}>
            {selectedStores.map((store, index) => (
              <View key={`${store.catalog_key || store.url}_${index}`} style={styles.selectedRow}>
                <View style={styles.selectedRowCopy}>
                  <Text style={styles.selectedRowTitle}>{store.name}</Text>
                  <Text style={styles.selectedRowMeta}>
                    {store.source_type === 'custom' ? 'Custom URL' : 'Curated'} · {store.domain}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.84}
                  style={styles.removeButton}
                  onPress={() =>
                    setSelectedStores((current) => current.filter((_, currentIndex) => currentIndex !== index))
                  }
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.selectionEmpty}>
            Start with the stores you reach for most. You can also skip this and set it up later.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add a custom website</Text>
        <Text style={styles.sectionDescription}>
          Include a personal favorite that is not already in the curated list.
        </Text>
        <TextInput
          value={customName}
          onChangeText={setCustomName}
          placeholder="Store name (optional)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="words"
        />
        <TextInput
          value={customUrl}
          onChangeText={setCustomUrl}
          placeholder="https://store.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity activeOpacity={0.84} style={styles.inlineButton} onPress={handleAddCustomStore}>
          <Text style={styles.inlineButtonText}>Add custom store</Text>
        </TouchableOpacity>
      </View>

      {groupedCuratedStores.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionDescription}>
            Pin the sites you want at the top of Browser.
          </Text>
          <View style={styles.chipGrid}>
            {section.items.map((store) => (
              <OnboardingChip
                key={store.key}
                label={store.name}
                selected={selectedCatalogKeys.has(store.key)}
                onPress={() => toggleCuratedStore(store)}
              />
            ))}
          </View>
        </View>
      ))}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStack: {
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  noticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  noticeText: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  selectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg - 2,
    marginBottom: spacing.md,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  selectionEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  selectionCount: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  selectedList: {
    gap: spacing.sm,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectedRowCopy: {
    flex: 1,
  },
  selectedRowTitle: {
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  selectedRowMeta: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  removeButton: {
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  selectionEmpty: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  section: {
    marginBottom: spacing.lg - 4,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  sectionDescription: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm + 2,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.sm,
  },
  inlineButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});
