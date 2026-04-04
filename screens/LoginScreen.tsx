import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true); // ⬅️ For initial session check
  const navigation = useNavigation();

  // Initial session check
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] as never });
      } else {
        setCheckingSession(false);
      }
    })();
  }, []);

  // Only trigger navigation on SIGNED_IN (no need to duplicate logic)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] as never });
      }
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      await supabase.auth.signOut(); // Clear lingering sessions

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg =
          /invalid login/i.test(error.message)
            ? 'Invalid email or password.'
            : /email not confirmed/i.test(error.message)
            ? 'Please confirm your email before logging in.'
            : error.message;

        Alert.alert('Login failed', msg);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Forgot password', 'Enter your email first.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'yourapp://reset-password', // 🔧 Replace with actual deep link
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', 'We sent a password reset link.');
    }
  };

  if (checkingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.title}>Welcome to ClosetMind</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)} style={{ marginTop: 16 }}>
            <Text style={styles.signupText}>Don't have an account? <Text style={styles.link}>Sign up</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    paddingTop: 80,
    paddingHorizontal: 30,
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 40,
    color: '#111',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
  },
});
