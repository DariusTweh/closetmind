import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthScreenShell from '../components/Auth/AuthScreenShell';
import AuthTextField from '../components/Auth/AuthTextField';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('getSession error:', error.message);
          setCheckingSession(false);
          return;
        }

        if (data?.session?.user) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' as never }] as never,
          });
        } else {
          setCheckingSession(false);
        }
      } catch (err: any) {
        console.error('Initial session check failed:', err?.message || err);
        if (mounted) setCheckingSession(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigation]);

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
      await supabase.auth.signOut();

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
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to log in.');
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
      redirectTo: 'yourapp://reset-password',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', 'We sent a password reset link.');
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <AuthScreenShell
      eyebrow="ClosetMind"
      title="Sign in to your closet."
      subtitle="Track what you own, generate sharper looks, and keep verdicts tied to one personal wardrobe."
      footer={
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.navigate('Signup' as never)}
        >
          <Text style={styles.footerCopy}>
            Don&apos;t have an account? <Text style={styles.footerLink}>Create one</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <AuthTextField
        label="Email"
        placeholder="name@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <AuthTextField
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      <TouchableOpacity
        activeOpacity={0.84}
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.82} onPress={handleForgotPassword} style={styles.secondaryAction}>
        <Text style={styles.secondaryActionText}>Forgot password?</Text>
      </TouchableOpacity>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  secondaryAction: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
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
