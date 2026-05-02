import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FitActionModalShell from './FitActionModalShell';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import UpgradeLimitModal from '../subscriptions/UpgradeLimitModal';
import { useUpgradeWall } from '../../hooks/useUpgradeWall';
import { recreateFitCheckPost } from '../../lib/fitCheckService';
import { isSubscriptionLimitError } from '../../lib/subscriptions/errors';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../../lib/subscriptions/modalState';
import { colors, radii, typography } from '../../lib/theme';
import type { FitCheckItem, FitCheckPost, FitCheckRecreateResult } from '../../types/fitCheck';
import { saveMixedOutfit } from '../../services/savedOutfitService';

const MOCK_RECREATED_ITEMS: FitCheckItem[] = [
  { id: 'recreated-tee', name: 'Neutral Tee', main_category: 'top', source_type: 'wardrobe', source_item_id: 'recreated-tee', reason: 'Keeps the base simple and clean.' },
  { id: 'recreated-denim', name: 'Relaxed Denim', main_category: 'bottom', source_type: 'wardrobe', source_item_id: 'recreated-denim', reason: 'Matches the relaxed lower-half silhouette.' },
  { id: 'recreated-sneaker', name: 'White Sneakers', main_category: 'shoes', source_type: 'wardrobe', source_item_id: 'recreated-sneaker', reason: 'Keeps the shoe choice easy and wearable.' },
];

function isUuid(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function ItemRail({
  items,
  showReasons = false,
}: {
  items: FitCheckItem[];
  showReasons?: boolean;
}) {
  if (!items.length) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No pieces attached</Text>
        <Text style={styles.emptyCopy}>
          This fit did not include a piece breakdown, so recreation will lean more on vibe and context.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((item) => (
        <View key={`${item.source_item_id || item.id}-${item.name}`} style={styles.itemCard}>
          {item.image_url || item.image_path || item.cutout_image_url ? (
            <WardrobeItemImage
              item={item}
              style={styles.itemImage}
              resizeMode={item.cutout_image_url ? 'contain' : 'cover'}
            />
          ) : (
            <View style={styles.itemPlaceholder}>
              <Ionicons name="shirt-outline" size={24} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {item.main_category || item.type || 'piece'}
          </Text>
          {showReasons && item.reason ? (
            <Text style={styles.itemReason} numberOfLines={3}>
              {item.reason}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

function buildMockResult(): FitCheckRecreateResult {
  return {
    title: 'Your closet version',
    summary: 'This keeps the relaxed neutral vibe but uses pieces you already own.',
    outfit: MOCK_RECREATED_ITEMS,
    recreate_quality: 'decent',
    recreate_score: 72,
    recreate_issues: [],
    missing_piece_suggestions: ['A lightweight neutral jacket would make this closer.'],
  };
}

export default function RecreateFitModal({
  visible,
  post,
  onClose,
}: {
  visible: boolean;
  post: FitCheckPost | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<FitCheckRecreateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [variationIndex, setVariationIndex] = useState(0);
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      setSaving(false);
      setSaved(false);
      setResult(null);
      setErrorMessage('');
      setVariationIndex(0);
      setUpgradeModal(HIDDEN_UPGRADE_MODAL_STATE);
    }
  }, [visible, post?.id]);

  const originalItems = useMemo(() => post?.items || [], [post?.items]);

  const handleGenerate = async (nextVariationIndex = 0) => {
    if (!post?.id || loading) return;
    setLoading(true);
    setErrorMessage('');

    try {
      if (!isUuid(post.id)) {
        if (__DEV__) {
          setResult(buildMockResult());
          setVariationIndex(0);
          return;
        }
        throw new Error('Recreate is not available for this post yet.');
      }

      const recreated = await recreateFitCheckPost({
        postId: post.id,
        variationIndex: nextVariationIndex,
      });
      setSaved(false);
      setResult(recreated);
      setVariationIndex(
        Number.isFinite(Number(recreated.variation_index))
          ? Number(recreated.variation_index)
          : nextVariationIndex,
      );
    } catch (error: any) {
      console.error('Fit Check recreate failed:', error);
      if (__DEV__) {
        setResult(buildMockResult());
        setVariationIndex(0);
      } else {
        setErrorMessage(String(error?.message || 'Could not build a closet version right now.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTryAnother = async () => {
    if (!result || loading || saving || saved) return;

    const totalVariations = Number(result.variation_count || 0);
    const nextVariationIndex = variationIndex + 1;
    if (totalVariations > 0 && nextVariationIndex >= totalVariations) {
      Alert.alert('No more versions', 'You’ve already seen the available closet recreates for this fit.');
      return;
    }

    await handleGenerate(nextVariationIndex);
  };

  const handleSave = async () => {
    if (!result?.outfit.length || saving || saved) return;

    if (result.recreate_quality === 'weak') {
      Alert.alert(
        'Save closest attempt?',
        'This recreate is a weak match. Save it only if you still want this fallback version.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Anyway',
            style: 'default',
            onPress: () => {
              void performSave();
            },
          },
        ],
      );
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    if (!result?.outfit.length || saving || saved) return;
    setSaving(true);

    try {
      await saveMixedOutfit({
        name: result.title || 'Your closet version',
        context: result.summary || post?.context || 'Fit Check recreation',
        items: result.outfit as any,
        sourceKind: 'fit_check_recreated',
        sourceFitCheckPostId: isUuid(post?.id) ? post?.id : null,
      });
      setSaved(true);
    } catch (error: any) {
      if (isSubscriptionLimitError(error)) {
        setUpgradeModal(buildUpgradeModalState(error.featureName, error.accessResult));
        return;
      }
      console.error('Saving recreated fit failed:', error);
      Alert.alert('Could not save recreated fit', String(error?.message || 'Try again in a moment.'));
    } finally {
      setSaving(false);
    }
  };

  const totalVariations = Number(result?.variation_count || 0);
  const hasMoreVariations = Boolean(
    result && result.has_more_variations && (!totalVariations || variationIndex < totalVariations - 1),
  );
  const primaryDisabled = loading || saving || (!result && !post?.id) || (result ? !result.outfit.length || saved : false);
  const primaryLabel = result
    ? saved
      ? 'Saved Recreated Fit'
      : saving
        ? 'Saving...'
        : 'Save Recreated Fit'
    : loading
      ? 'Generating...'
      : 'Generate Closet Version';

  return (
    <>
      <FitActionModalShell
        visible={visible}
        title="Recreate with your closet"
        subtitle="Klozu will build a version using pieces you own."
        onClose={onClose}
        footer={(
          <View style={styles.footerRow}>
            {result ? (
              <TouchableOpacity
                activeOpacity={hasMoreVariations && !loading && !saving && !saved ? 0.9 : 1}
                onPress={() => {
                  void handleTryAnother();
                }}
                disabled={!hasMoreVariations || loading || saving || saved}
                style={[styles.secondaryButton, (!hasMoreVariations || loading || saving || saved) && styles.secondaryButtonDisabled]}
              >
                <Text style={[styles.secondaryButtonText, (!hasMoreVariations || loading || saving || saved) && styles.secondaryButtonTextDisabled]}>
                  {hasMoreVariations ? 'Try Another' : 'No More Versions'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={!primaryDisabled ? 0.9 : 1}
              onPress={() => {
                void (result ? handleSave() : handleGenerate());
              }}
              disabled={primaryDisabled}
              style={[
                styles.primaryButton,
                result && styles.primaryButtonSplit,
                primaryDisabled && styles.primaryButtonDisabled,
                saved && styles.primaryButtonSaved,
              ]}
            >
              {loading || saving ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Original pieces</Text>
          <ItemRail items={originalItems} />
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn’t recreate this fit</Text>
            <Text style={styles.errorCopy}>{errorMessage}</Text>
          </View>
        ) : null}

        {result ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <Text style={styles.resultCopy}>{result.summary}</Text>
              {typeof result.recreate_score === 'number' ? (
                <Text style={styles.resultMeta}>
                  Score {Math.round(result.recreate_score)} · {(result.recreate_quality || 'decent').replace(/^./, (value) => value.toUpperCase())}
                </Text>
              ) : null}
              {result.variation_count && result.variation_count > 1 ? (
                <Text style={styles.resultSubmeta}>
                  Option {variationIndex + 1} of {result.variation_count}
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your closet version</Text>
              <ItemRail items={result.outfit} showReasons />
            </View>

            {result.recreate_quality === 'weak' && result.recreate_issues?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Why this is weak</Text>
                <View style={styles.issueCard}>
                  {result.recreate_issues.map((issue) => (
                    <View key={issue} style={styles.suggestionRow}>
                      <View style={styles.issueDot} />
                      <Text style={styles.suggestionText}>{issue}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {result.missing_piece_suggestions.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Missing piece suggestions</Text>
                <View style={styles.suggestionCard}>
                  {result.missing_piece_suggestions.map((suggestion) => (
                    <View key={suggestion} style={styles.suggestionRow}>
                      <View style={styles.suggestionDot} />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </FitActionModalShell>

      <UpgradeLimitModal
        visible={upgradeModal.visible}
        featureName={upgradeModal.featureName}
        used={upgradeModal.used}
        limit={upgradeModal.limit}
        remaining={upgradeModal.remaining}
        tier={upgradeModal.tier}
        recommendedUpgrade={upgradeModal.recommendedUpgrade}
        isPaywallAvailable={isPaywallAvailable}
        onClose={() => setUpgradeModal(HIDDEN_UPGRADE_MODAL_STATE)}
        onUpgrade={() => {
          void openUpgrade();
        }}
        onBuyTryOnPack={() => {
          void openTryOnPack();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  rail: {
    paddingRight: 18,
    gap: 12,
  },
  itemCard: {
    width: 154,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 12,
    gap: 8,
  },
  itemImage: {
    width: '100%',
    height: 112,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  itemPlaceholder: {
    width: '100%',
    height: 112,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  itemMeta: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    textTransform: 'capitalize',
    fontFamily: typography.fontFamily,
  },
  itemReason: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  resultCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
    padding: 18,
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  resultCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  resultMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    textTransform: 'capitalize',
  },
  issueCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 16,
    gap: 10,
  },
  suggestionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 16,
    gap: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: colors.textPrimary,
  },
  issueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: colors.accent,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 19,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  errorCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  errorCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryButtonTextDisabled: {
    color: colors.textMuted,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonSplit: {
    flex: 1,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonSaved: {
    opacity: 0.88,
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  resultSubmeta: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
});
