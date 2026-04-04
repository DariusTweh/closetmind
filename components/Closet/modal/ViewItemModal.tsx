import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows, typography } from '../../../lib/theme'; // adjust path as needed


const { width, height } = Dimensions.get('window');

export default function ViewItemModal({ visible, onClose, items, initialIndex, onEdit, onStyle, }) {
  const flatListRef = useRef(null);

  return (
     <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.cardWrapper}>
          <FlatList
            ref={flatListRef}
            data={items}
            horizontal
            snapToInterval={width}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={initialIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <View style={styles.card}>
                  <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={20} color="#000" />
                  </TouchableOpacity>

                  <Image source={{ uri: item.image_url }} style={styles.image} />
                  <Text style={styles.name}>{item.name || item.type}</Text>
                  <Text style={styles.meta}>
                    {item.main_category} · {item.primary_color} · {item.pattern_description}
                  </Text>

                  {/* Edit Button */}
                  <TouchableOpacity style={styles.editBtn} onPress={() => onEdit?.(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>

                  {/* Style This Item Button */}
                  <TouchableOpacity
                    style={[styles.editBtn, { marginTop: spacing.sm }]}
                    onPress={() => onStyle?.(item)}
                  >
                    <Text style={styles.editText}>Style This Item</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: width * 0.85,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs + 2,
    fontFamily: typography.fontFamily,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md - 2,
    fontFamily: typography.fontFamily,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.border,
    padding: 6,
    borderRadius: radii.pill,
    zIndex: 2,
  },
  editBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  editText: {
    color: colors.textOnAccent,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: typography.fontFamily,
  },
});
