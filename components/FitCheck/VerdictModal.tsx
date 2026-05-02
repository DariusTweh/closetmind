import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FitActionModalShell from './FitActionModalShell';
import { apiPost, readApiResponse } from '../../lib/api';
import { colors, radii, typography } from '../../lib/theme';
import type {
  FitCheckVerdictFocus,
  FitCheckVerdictMode,
  FitCheckVerdictResult,
} from '../../types/fitCheck';

const VERDICT_OPTIONS: Array<{ label: string; key: FitCheckVerdictFocus }> = [
  { label: 'Overall fit', key: 'overall_fit' },
  { label: 'Color match', key: 'color_match' },
  { label: 'Shoe choice', key: 'shoe_choice' },
  { label: 'Occasion match', key: 'occasion_match' },
  { label: 'Closet match', key: 'closet_match' },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeStringArray(value: unknown, maxItems = 3) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeFocusResults(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, String(entry || '').trim()])
      .filter(([, entry]) => Boolean(entry)),
  ) as Partial<Record<FitCheckVerdictFocus, string>>;
}

function normalizeVerdictPayload(raw: any, fallbackMode: FitCheckVerdictMode): FitCheckVerdictResult {
  const mode: FitCheckVerdictMode =
    String(raw?.mode || '').trim().toLowerCase() === 'verdict'
      ? 'verdict'
      : String(raw?.mode || '').trim().toLowerCase() === 'breakdown'
        ? 'breakdown'
        : fallbackMode;

  if (mode === 'verdict') {
    return {
      mode: 'verdict',
      score: Number.isFinite(Number(raw?.score)) ? Math.max(0, Math.min(100, Math.round(Number(raw.score)))) : 82,
      title: String(raw?.title || 'Strong fit').trim() || 'Strong fit',
      summary:
        String(raw?.summary || '').trim() ||
        'The proportions are clean, the color balance is controlled, and the outfit reads intentionally.',
      what_works: normalizeStringArray(raw?.what_works),
      improvements: normalizeStringArray(raw?.improvements),
      recreate_tips: normalizeStringArray(raw?.recreate_tips),
      focus_results: normalizeFocusResults(raw?.focus_results),
    };
  }

  return {
    mode: 'breakdown',
    title: String(raw?.title || 'Why this works').trim() || 'Why this works',
    summary:
      String(raw?.summary || '').trim() ||
      'The outfit works because the proportions feel intentional and the palette stays easy to read.',
    style_principles: normalizeStringArray(raw?.style_principles),
    recreate_tips: normalizeStringArray(raw?.recreate_tips),
    closet_translation: normalizeStringArray(raw?.closet_translation),
    focus_results: normalizeFocusResults(raw?.focus_results),
  };
}

function buildMockResult(isCurrentUser: boolean): FitCheckVerdictResult {
  if (isCurrentUser) {
    return {
      mode: 'verdict',
      score: 86,
      title: 'Strong fit',
      summary:
        'The proportions are clean, the color palette is controlled, and the shoes fit the relaxed silhouette.',
      what_works: [
        'The silhouette reads intentional instead of random.',
        'The color balance stays controlled.',
        'The shoes support the shape of the outfit.',
      ],
      improvements: [
        'Keep the layer open if you want more movement.',
        'Avoid adding another loud color.',
        'A small accessory would finish it.',
      ],
      recreate_tips: [
        'Start with your cleanest base pieces.',
        'Let the shoes stay simple.',
        'Keep one layer doing most of the work.',
      ],
      focus_results: {
        overall_fit: 'The overall outline feels controlled and readable.',
        color_match: 'The palette stays clean without competing tones.',
        shoe_choice: 'The shoes support the relaxed shape instead of fighting it.',
        occasion_match: 'The fit reads correctly for the context.',
        closet_match: 'You can rebuild this with neutral base pieces from your closet.',
      },
    };
  }

  return {
    mode: 'breakdown',
    title: 'Why this works',
    summary:
      'The relaxed silhouette feels intentional, and the neutral palette keeps the outfit easy to recreate.',
    style_principles: [
      'The silhouette stays readable at a glance.',
      'The palette is controlled, not noisy.',
      'The shoe choice does not overpower the rest of the fit.',
    ],
    recreate_tips: [
      'Start with a neutral base.',
      'Use one relaxed layer.',
      'Keep the shoes simple.',
    ],
    closet_translation: [
      'Use the closest neutral pieces you own first.',
      'Match the proportion before matching exact items.',
      'Let the shoe and layer stay quiet.',
    ],
    focus_results: {
      overall_fit: 'The outfit works because the proportions feel intentional.',
      color_match: 'The palette stays grounded and easy to read.',
      shoe_choice: 'The shoes support the overall proportion.',
      occasion_match: 'The styling matches the context without trying too hard.',
      closet_match: 'You can recreate the vibe with similar neutral closet pieces.',
    },
  };
}

function renderList(title: string, items: string[]) {
  if (!items.length) return null;
  return (
    <View style={styles.resultSection}>
      <Text style={styles.resultSectionLabel}>{title}</Text>
      <View style={styles.bulletList}>
        {items.map((bullet) => (
          <View key={`${title}-${bullet}`} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function VerdictModal({
  visible,
  postId,
  isCurrentUser,
  onClose,
}: {
  visible: boolean;
  postId?: string | null;
  isCurrentUser: boolean;
  onClose: () => void;
}) {
  const [selectedOptions, setSelectedOptions] = useState<FitCheckVerdictFocus[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FitCheckVerdictResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      setSelectedOptions([]);
      setLoading(false);
      setResult(null);
      setErrorMessage('');
    }
  }, [visible, postId]);

  const mode: FitCheckVerdictMode = isCurrentUser ? 'verdict' : 'breakdown';
  const title = isCurrentUser ? 'Ask Verdict' : 'Break Down This Fit';
  const subtitle = isCurrentUser
    ? 'Get feedback on your fit.'
    : 'Understand why this outfit works and how to recreate it.';
  const footerLabel = isCurrentUser ? 'Get Verdict' : 'Break It Down';

  const selectedOptionLabels = useMemo(
    () =>
      selectedOptions.reduce<Record<string, boolean>>((acc, option) => {
        acc[option] = true;
        return acc;
      }, {}),
    [selectedOptions],
  );

  const toggleOption = (option: FitCheckVerdictFocus) => {
    setSelectedOptions((current) =>
      current.includes(option)
        ? current.filter((entry) => entry !== option)
        : [...current, option],
    );
  };

  const handleSubmit = async () => {
    if (!selectedOptions.length || loading) return;

    setLoading(true);
    setErrorMessage('');

    try {
      if (!UUID_RE.test(String(postId || '').trim())) {
        if (__DEV__) {
          setResult(buildMockResult(isCurrentUser));
          return;
        }
        throw new Error('Verdict is not available for this post yet.');
      }

      const response = await apiPost('/fit-check/verdict', {
        post_id: postId,
        mode,
        selected_focus: selectedOptions,
      });
      const payload = await readApiResponse<any>(response);

      if (!response.ok) {
        throw new Error(String((payload as any)?.error || `Request failed with status ${response.status}`));
      }

      setResult(normalizeVerdictPayload(payload, mode));
    } catch (error: any) {
      console.error('Fit Check verdict failed:', error);
      if (__DEV__) {
        setResult(buildMockResult(isCurrentUser));
      } else {
        setErrorMessage(String(error?.message || 'Could not load verdict right now.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FitActionModalShell
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={(
        <TouchableOpacity
          activeOpacity={selectedOptions.length && !loading ? 0.9 : 1}
          disabled={!selectedOptions.length || loading}
          onPress={handleSubmit}
          style={[styles.primaryButton, (!selectedOptions.length || loading) && styles.primaryButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>{footerLabel}</Text>
          )}
        </TouchableOpacity>
      )}
    >
      <View style={styles.optionWrap}>
        {VERDICT_OPTIONS.map((option) => {
          const isActive = Boolean(selectedOptionLabels[option.key]);
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.88}
              onPress={() => toggleOption(option.key)}
              style={[styles.optionChip, isActive && styles.optionChipActive]}
            >
              <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Couldn’t load the verdict</Text>
          <Text style={styles.errorCopy}>{errorMessage}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultCard}>
          {result.mode === 'verdict' ? (
            <View style={styles.scorePill}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{result.score}</Text>
            </View>
          ) : null}

          <Text style={styles.resultTitle}>{result.title}</Text>
          <Text style={styles.resultCopy}>{result.summary}</Text>

          {result.mode === 'verdict'
            ? (
              <>
                {renderList('What works', result.what_works)}
                {renderList('Improvements', result.improvements)}
                {renderList('Recreate tips', result.recreate_tips)}
              </>
            )
            : (
              <>
                {renderList('Style principles', result.style_principles)}
                {renderList('Recreate tips', result.recreate_tips)}
                {renderList('Closet translation', result.closet_translation)}
              </>
            )}

          {Object.keys(result.focus_results || {}).length ? (
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionLabel}>Focus results</Text>
              <View style={styles.focusWrap}>
                {Object.entries(result.focus_results).map(([key, value]) => {
                  const matched = VERDICT_OPTIONS.find((option) => option.key === key);
                  return (
                    <View key={key} style={styles.focusCard}>
                      <Text style={styles.focusLabel}>{matched?.label || key}</Text>
                      <Text style={styles.focusCopy}>{value}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </FitActionModalShell>
  );
}

const styles = StyleSheet.create({
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  optionTextActive: {
    color: colors.textOnAccent,
  },
  errorCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 18,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  errorCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  resultCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 18,
    gap: 12,
  },
  scorePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  scoreLabel: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  scoreValue: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  resultTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  resultCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  resultSection: {
    gap: 10,
  },
  resultSectionLabel: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: colors.textPrimary,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  focusWrap: {
    gap: 10,
  },
  focusCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    padding: 14,
    gap: 6,
  },
  focusLabel: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  focusCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
