// screens/Onboarding/UseIntentScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase'; 

const OPTIONS = [
  { id: 'closet', label: 'Just my digital closet' },
  { id: 'sell', label: 'Selling clothes too' },
  { id: 'both', label: 'Both' },
];

export default function UseIntentScreen() {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = async () => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error('User not found');

    const userId = userData.user.id;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ use_intent: selected })
      .eq('id', userId);

    if (updateError) throw updateError;

    navigation.navigate('ToneSelect');
  } catch (err) {
    console.error('❌ Failed to save use intent:', err);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>What are you using ClosetMind for?</Text>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.id}
          style={[styles.option, selected === opt.id && styles.selectedOption]}
          onPress={() => setSelected(opt.id)}
        >
          <Text style={styles.optionText}>{opt.label}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.nextButton, !selected && { opacity: 0.4 }]}
        onPress={handleNext}
        disabled={!selected}
      >
        <Text style={styles.nextText}>Next</Text>
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
    marginBottom: 30,
  },
  option: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
  },
  selectedOption: {
    borderColor: '#f4a261',
    backgroundColor: '#fff6f1',
  },
  optionText: {
    fontSize: 16,
    color: '#111',
  },
  nextButton: {
    marginTop: 'auto',
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
