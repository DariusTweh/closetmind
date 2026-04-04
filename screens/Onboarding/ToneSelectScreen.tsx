// screens/Onboarding/ToneSelectScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase'; 
const TONE_OPTIONS = [
  { id: 'friendly', label: 'Friendly & supportive' },
  { id: 'bold', label: 'Bold & confident' },
  { id: 'minimal', label: 'Calm & minimalist' },
  { id: 'trendy', label: 'Fashion-obsessed' },
  { id: 'chill', label: 'Relaxed & cool' },
];

export default function ToneSelectScreen() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = async () => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error('User not found');

    const userId = userData.user.id;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        tone: selected,
        // ❌ don't mark onboarding as complete yet
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    navigation.navigate('OnboardingStyle'); // ✅ go to next onboarding step
  } catch (err) {
    console.error('❌ Failed to save tone:', err);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>How should ClosetMind talk to you?</Text>
      <View style={styles.optionsContainer}>
        {TONE_OPTIONS.map((tone) => (
          <TouchableOpacity
            key={tone.id}
            style={[styles.optionCard, selected === tone.id && styles.selectedCard]}
            onPress={() => setSelected(tone.id)}
          >
            <Text style={styles.optionLabel}>{tone.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={!selected}>
        <Text style={styles.nextText}>Finish</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
    marginTop: 20,
    marginBottom: 30,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCard: {
    borderColor: '#f4a261',
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 16,
    color: '#111',
    textAlign: 'center',
  },
  nextButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#f4a261',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
