import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { apiPost } from '../../lib/api';
import { resolvePrivateMediaUrl } from '../../lib/privateMedia';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

const PROFILE_SELECT_FIELDS = 'body_image_paths, body_image_urls, ai_model_path, ai_model_url, model_status';
const PROFILE_LEGACY_SELECT_FIELDS = 'body_image_urls, ai_model_path, ai_model_url, model_status';

const hasMissingProfileColumn = (message: string, field: string) => {
  const normalized = String(message || '').toLowerCase();
  const normalizedField = String(field || '').toLowerCase();
  return (
    normalized.includes(`profiles.${normalizedField}`) ||
    normalized.includes(`'${normalizedField}' column of 'profiles'`) ||
    (normalized.includes("column of 'profiles'") && normalized.includes(normalizedField))
  );
};

function splitStoredMediaSources(values: string[] = []) {
  const image_paths: string[] = [];
  const image_urls: string[] = [];

  for (const entry of values) {
    const normalized = String(entry || '').trim();
    if (!normalized) continue;
    if (/^https?:\/\//i.test(normalized) || /^data:image\//i.test(normalized)) {
      image_urls.push(normalized);
    } else {
      image_paths.push(normalized.replace(/^\/+/, ''));
    }
  }

  return { image_paths, image_urls };
}

export default function OnboardingGenerateModelScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfile = async (triggerGenerate = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in.');
    setUserId(user.id);

    let response = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FIELDS)
      .eq('id', user.id)
      .single();

    if (response.error && hasMissingProfileColumn(response.error.message, 'body_image_paths')) {
      response = await supabase
        .from('profiles')
        .select(PROFILE_LEGACY_SELECT_FIELDS)
        .eq('id', user.id)
        .single();
    }

    const { data: profile, error } = response;
    if (error) throw error;

    const resolvedModelUrl = await resolvePrivateMediaUrl({
      path: profile.ai_model_path,
      legacyUrl: profile.ai_model_url,
    });

    if (resolvedModelUrl) {
      setModelUrl(resolvedModelUrl);
      setStatus('success');
      return;
    }

    setStatus(profile.model_status);

    if (triggerGenerate && ['failed', null, 'idle'].includes(profile.model_status)) {
      const storedSources = Array.isArray(profile.body_image_paths) && profile.body_image_paths.length
        ? profile.body_image_paths
        : (profile.body_image_urls || []);
      const sourcePayload = splitStoredMediaSources(storedSources);
      if (!sourcePayload.image_paths.length && !sourcePayload.image_urls.length) {
        throw new Error('No full-body images found.');
      }

      const response = await apiPost('/user/generate-model', { user_id: user.id, ...sourcePayload });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Model generation request failed.');
      }
    }
  };

  useEffect(() => {
    let interval: any;

    const loadAndPoll = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');
        setUserId(user.id);

        await fetchProfile(true);
        setLoading(false);

        interval = setInterval(async () => {
          const { data } = await supabase
            .from('profiles')
            .select('ai_model_path, ai_model_url, model_status')
            .eq('id', user.id)
            .single();

          const resolvedModelUrl = await resolvePrivateMediaUrl({
            path: data?.ai_model_path,
            legacyUrl: data?.ai_model_url,
          });

          if (resolvedModelUrl) {
            setModelUrl(resolvedModelUrl);
            setStatus('success');
            clearInterval(interval);
          } else {
            setStatus(data?.model_status);
          }
        }, 3000);
      } catch (err: any) {
        Alert.alert('Error', err.message);
        setLoading(false);
      }
    };

    loadAndPoll();
    return () => clearInterval(interval);
  }, []);

  const handleContinue = async () => {
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);

      if (error && !hasMissingProfileColumn(error.message, 'onboarding_completed')) {
        console.warn('Could not mark onboarding as completed:', error.message);
      }
    }

    navigation.navigate('MainTabs');
  };

  const retry = () => {
    setLoading(true);
    fetchProfile(true).finally(() => setLoading(false));
  };

  const action = status === 'failed'
    ? { label: 'Try Again', onPress: retry }
    : modelUrl
      ? { label: 'Enter ClosetMind', onPress: handleContinue }
      : null;

  return (
    <OnboardingScaffold
      eyebrow="Final Setup"
      title="Build your digital model."
      subtitle="This becomes the base for try-on and future styling features. It only needs to happen once."
      footer={
        action ? (
          <TouchableOpacity activeOpacity={0.84} style={styles.primaryButton} onPress={action.onPress}>
            <Text style={styles.primaryButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ) : null
      }
    >
      <View style={styles.stageCard}>
        {loading || status === 'generating' ? (
          <>
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
            <Text style={styles.stageTitle}>Generating your model</Text>
            <Text style={styles.stageText}>ClosetMind is building a clean base avatar from your uploaded looks.</Text>
          </>
        ) : modelUrl ? (
          <>
            <Image source={{ uri: modelUrl }} style={styles.preview} />
            <Text style={styles.stageTitle}>Your model is ready</Text>
            <Text style={styles.stageText}>You can now move into the app with a base model ready for try-on.</Text>
          </>
        ) : status === 'failed' ? (
          <>
            <View style={styles.loaderWrap}>
              <Text style={styles.failureMark}>×</Text>
            </View>
            <Text style={styles.stageTitle}>Model generation failed</Text>
            <Text style={styles.stageText}>Try again once more. Your uploaded outfit photos are still on file.</Text>
          </>
        ) : (
          <>
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
            <Text style={styles.stageTitle}>Preparing your setup</Text>
            <Text style={styles.stageText}>Please wait a moment while we check your model status.</Text>
          </>
        )}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  stageCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  loaderWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  failureMark: {
    fontSize: 42,
    lineHeight: 42,
    color: colors.textPrimary,
    fontWeight: '300',
  },
  preview: {
    width: 260,
    height: 320,
    borderRadius: 22,
    marginBottom: spacing.lg,
    resizeMode: 'contain',
    backgroundColor: colors.backgroundAlt,
  },
  stageTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  stageText: {
    marginTop: spacing.sm,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    maxWidth: 300,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
