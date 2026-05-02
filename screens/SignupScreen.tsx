import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthScreenShell from '../components/Auth/AuthScreenShell';
import AuthTextField from '../components/Auth/AuthTextField';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import { ensureProfileShell } from '../lib/onboarding';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const user = data.user;
      const session = data.session;
      if (user?.id) {
        await ensureProfileShell(user.id);
      }

      if (!session?.user) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

        if (signInErr) {
          if (/email not confirmed/i.test(signInErr.message || '')) {
            Alert.alert('Check your email', 'Confirm your email to finish creating your account.');
            return;
          }
          throw signInErr;
        }

        if (signInData?.user?.id) {
          await ensureProfileShell(signInData.user.id);
        }
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Sign Up Failed', e.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      eyebrow="Klozu"
      title="Create your account."
      subtitle="Set up your identity, style signals, and model once, then let the app learn the rest from your closet."
      footer={
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.navigate('Login' as never)}
        >
          <Text style={styles.footerCopy}>
            Already have an account? <Text style={styles.footerLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <AuthTextField
        label="Email"
        placeholder="name@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <AuthTextField
        label="Password"
        placeholder="Create a password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      <TouchableOpacity
        activeOpacity={0.84}
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.primaryButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.textOnAccent,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  disabledButton: {
    opacity: 0.6,
  },
  footerCopy: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: typography.fontFamily,
  },
  footerLink: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
