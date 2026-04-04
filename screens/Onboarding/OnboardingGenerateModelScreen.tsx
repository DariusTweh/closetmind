import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ActivityIndicator, TouchableOpacity,
  StyleSheet, Alert, SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, fontSizes } from '../../lib/theme';

export default function OnboardingGenerateModelScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfile = async (triggerGenerate = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in.');
    setUserId(user.id);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('body_image_urls, ai_model_url, model_status')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    if (profile.ai_model_url) {
      setModelUrl(profile.ai_model_url);
      setStatus('success');
      return;
    }

    setStatus(profile.model_status);
    console.log("🧠 Current model_status:", profile.model_status);


    if (
  triggerGenerate &&
  ['failed', null, 'idle'].includes(profile.model_status)
) {
  const urls = profile.body_image_urls || [];
  if (!urls.length) throw new Error('No full-body images found.');
  console.log("📡 Sending model generation request...");
  await fetch('http://192.168.0.187:5000/user/generate-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.id, image_urls: urls }),
  });
}

  };

useEffect(() => {
  let interval: any;

  const loadAndPoll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      setUserId(user.id); // optional, no longer needed for polling

      await fetchProfile(true);
      setLoading(false);

      interval = setInterval(async () => {
        const { data } = await supabase
          .from("profiles")
          .select("ai_model_url, model_status")
          .eq("id", user.id) // ✅ use user.id directly here
          .single();

        if (data?.ai_model_url) {
          setModelUrl(data.ai_model_url);
          setStatus("success");
          clearInterval(interval);
        } else {
          setStatus(data?.model_status);
        }
      }, 3000);
    } catch (err: any) {
      Alert.alert("Error", err.message);
      setLoading(false);
    }
  };

  loadAndPoll();
  return () => clearInterval(interval);
}, []);

  const handleContinue = () => navigation.navigate('MainTabs');

  const retry = () => {
    setLoading(true);
    fetchProfile(true).finally(() => setLoading(false));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.header}>Your Digital Model</Text>

        {loading || status === 'generating' ? (
          <>
            <ActivityIndicator size="large" color={colors.textSecondary} />
            <Text style={styles.status}>Generating your avatar…</Text>
          </>
        ) : status === 'failed' ? (
          <>
            <Text style={styles.status}>Model generation failed.</Text>
            <TouchableOpacity style={styles.button} onPress={retry}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </>
        ) : modelUrl ? (
          <>
            <Image source={{ uri: modelUrl }} style={styles.preview} />
            <Text style={styles.status}>This is your base model for AI styling.</Text>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.status}>Something went wrong. Please try again.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  status: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  preview: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginVertical: spacing.lg,
    resizeMode: 'contain',
    backgroundColor: colors.cardBackground,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 28,
    marginTop: spacing.lg,
  },
  buttonText: {
    color: colors.textOnAccent,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
});
