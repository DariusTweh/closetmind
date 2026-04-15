import React, { useMemo, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Site = { name: string; url: string; domain: string };

type BrowserDrawerProps = {
  open: boolean;
  drawerX: Animated.Value;
  backdropOpacity: Animated.Value;
  width: number;
  sites: Site[];
  onClose: () => void;
  onSelectSite: (site: Site) => void;
};

const GROUP_ORDER = ['Popular', 'Sportswear', 'Luxury', 'Resale'];

const GROUPS: Record<string, string[]> = {
  Popular: [
    'ZARA',
    'H&M',
    'UNIQLO',
    'Mango',
    'COS',
    'Everlane',
    'Abercrombie',
    'Urban Outfitters',
    'Amazon Fashion',
    'Target',
    'Walmart',
  ],
  Sportswear: [
    'Nike',
    'Adidas',
    'Lululemon',
    'New Balance',
    'The North Face',
    'Patagonia',
    'Arc’teryx',
    'REI',
  ],
  Luxury: [
    'Mr Porter',
    'NET-A-PORTER',
    'Farfetch',
    'Mytheresa',
    'SSENSE',
    'Kith',
    'END.',
    'Nordstrom',
    'Bloomingdale’s',
    'Zappos',
  ],
  Resale: [
    'Grailed',
    'Depop',
    'Poshmark',
    'eBay',
    'thredUP',
  ],
};

function buildGroupedSites(sites: Site[], searchValue: string) {
  const query = String(searchValue || '').trim().toLowerCase();
  const filtered = !query
    ? sites
    : sites.filter((site) => {
        const name = String(site.name || '').toLowerCase();
        const domain = String(site.domain || '').toLowerCase();
        return name.includes(query) || domain.includes(query);
      });

  const grouped = GROUP_ORDER.map((groupName) => {
    const members = GROUPS[groupName] || [];
    return {
      title: groupName,
      items: filtered.filter((site) => members.includes(site.name)),
    };
  }).filter((section) => section.items.length > 0);

  const known = new Set(Object.values(GROUPS).flat());
  const remaining = filtered.filter((site) => !known.has(site.name));
  if (remaining.length) {
    grouped.push({ title: 'More Stores', items: remaining });
  }

  return grouped;
}

export default function BrowserDrawer({
  open,
  drawerX,
  backdropOpacity,
  width,
  sites,
  onClose,
  onSelectSite,
}: BrowserDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const groupedSites = useMemo(() => buildGroupedSites(sites, searchQuery), [sites, searchQuery]);

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
            <Text style={styles.title}>Shops</Text>
            <Text style={styles.subtitle}>Browse retailers and import from your favorite stores.</Text>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color="rgba(28, 28, 28, 0.52)" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search stores"
              placeholderTextColor="rgba(28, 28, 28, 0.52)"
              style={styles.searchInput}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {groupedSites.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionCard}>
                  {section.items.map((site, index) => (
                    <StoreRow
                      key={site.name}
                      site={site}
                      onPress={() => onSelectSite(site)}
                      showDivider={index < section.items.length - 1}
                    />
                  ))}
                </View>
              </View>
            ))}

            {!groupedSites.length ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No stores found</Text>
                <Text style={styles.emptySub}>Try a different name or domain.</Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

function StoreRow({
  site,
  onPress,
  showDivider,
}: {
  site: Site;
  onPress: () => void;
  showDivider: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.84} style={[styles.item, showDivider && styles.itemDivider]} onPress={onPress}>
      <View style={styles.faviconCircle}>
        <Text style={styles.faviconText}>{site.name.slice(0, 1)}</Text>
      </View>

      <View style={styles.itemCopy}>
        <Text style={styles.siteName}>{site.name}</Text>
        <Text style={styles.siteDomain}>{site.domain}</Text>
      </View>

      <Ionicons name="chevron-forward" size={14} color="rgba(28, 28, 28, 0.52)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fafaff',
    borderRightWidth: 1,
    borderRightColor: '#daddd8',
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
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
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
    color: '#1c1c1c',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 8,
    paddingHorizontal: 4,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.05,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#fafaff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#daddd8',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#daddd8',
  },
  faviconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  faviconText: {
    color: '#fafaff',
    fontWeight: '700',
    fontSize: 13,
  },
  itemCopy: {
    flex: 1,
    paddingRight: 10,
  },
  siteName: {
    color: '#1c1c1c',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
  siteDomain: {
    color: 'rgba(28, 28, 28, 0.52)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    padding: 18,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1c1c1c',
    fontWeight: '600',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
});
