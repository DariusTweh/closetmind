import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../lib/theme';

type GeneratorSummaryCardProps = {
  vibe: string;
  context: string;
  season: string;
  temperature: string;
};

function SummaryMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function GeneratorSummaryCard({
  vibe,
  context,
  season,
  temperature,
}: GeneratorSummaryCardProps) {
  const summaryLine = [vibe || 'Open brief', context ? `for ${context}` : 'for any plan']
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Styled for you</Text>
      <Text style={styles.title}>{summaryLine}</Text>
      <View style={styles.grid}>
        <SummaryMeta label="Vibe" value={vibe || 'Open brief'} />
        <SummaryMeta label="Context" value={context || 'Any plan'} />
      </View>
      <View style={[styles.grid, styles.gridTopBorder]}>
        <SummaryMeta label="Season" value={season || 'All'} />
        <SummaryMeta label="Temperature" value={temperature ? `${temperature} deg F` : 'Flexible'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#897d71',
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  grid: {
    flexDirection: 'row',
  },
  gridTopBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e2dbd1',
  },
  metaCell: {
    flex: 1,
    paddingVertical: 10,
  },
  metaLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(28, 28, 28, 0.52)',
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  metaValue: {
    marginTop: 5,
    paddingRight: 12,
    fontSize: 13.5,
    lineHeight: 18,
    color: '#2a241f',
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
});
