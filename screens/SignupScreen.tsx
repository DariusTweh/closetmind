// screens/SignupScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

const createProfileIfMissing = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    // 👇 Insert only the required and safe fields — adapt as needed once schema is fixed
    const insertData: any = {
      id: userId,
      created_at: new Date().toISOString(),
    };

    // OPTIONAL: Add fields only if you're confident they're in your DB
    try {
      // Just test-select to check if the column exists
      const { error: testError } = await supabase
        .from('profiles')
        .select('onboarding_completed, style_vibes, tone, use_intent')
        .eq('id', userId)
        .maybeSingle();

      if (!testError) {
        insertData.onboarding_completed = false;
        insertData.style_vibes = [];
        insertData.tone = null;
        insertData.use_intent = null;
      }
    } catch (e) {
      console.warn('Column check failed or fields not present. Inserting minimal profile.');
    }

    const { error: insertErr } = await supabase.from('profiles').insert([insertData]);
    if (insertErr) throw insertErr;
  }
};

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // With email confirmation disabled, this should return an active session
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const user = data.user;
      const session = data.session;
      if (!user || !session) {
        // Fallback: if your project still doesn’t return a session, sign in directly
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        if (!signInData.user) throw new Error('No user returned after sign-in');
        await createProfileIfMissing(signInData.user.id);
      } else {
        await createProfileIfMissing(user.id);
      }

      // ✅ Go straight to your onboarding stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'UseIntent' }], // first screen in your onboarding flow
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Sign Up Failed', e.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ClosetMind</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#999"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 16 }}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf8f3', paddingHorizontal: 30, justifyContent: 'center' },
  logo: { fontSize: 32, fontWeight: '700', marginBottom: 40, textAlign: 'center', color: '#000' },
  input: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', fontSize: 16, marginBottom: 14 },
  button: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#555', textAlign: 'center' },
});
