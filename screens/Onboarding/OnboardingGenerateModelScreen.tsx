import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import OnboardingScaffold from '../../components/Onboarding/OnboardingScaffold';
import { apiPost, getRetryAfterMs, isRateLimitedResponse, readApiResponse } from '../../lib/api';
import { ONBOARDING_STAGES, updateOnboardingProgress } from '../../lib/onboarding';
import { resolvePrivateMediaUrl } from '../../lib/privateMedia';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../lib/theme';

const PROFILE_SELECT_FIELDS = 'body_image_paths, body_image_urls, ai_model_path, ai_model_url, model_status';
const PROFILE_LEGACY_SELECT_FIELDS = 'body_image_urls, ai_model_path, ai_model_url, model_status';
const PROFILE_MINIMAL_SELECT_FIELDS = 'ai_model_path, ai_model_url, model_status';
const PROFILE_FALLBACK_SELECT_FIELDS = 'id';
const MODEL_POLL_INTERVAL_MS = 3000;
const MODEL_WAIT_TIMEOUT_MS = 90_000;

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

function formatModelGenerationError(message?: string | null) {
  const normalized = String(message || '').trim();
  if (!normalized) {
    return 'Model generation failed. Try again in a moment.';
  }
  if (
    normalized.toLowerCase().includes('quota') ||
    normalized.toLowerCase().includes('billing') ||
    normalized.toLowerCase().includes('image generation is temporarily unavailable')
  ) {
    return 'Model generation is temporarily unavailable because image-generation quota is exhausted. Try again later.';
  }
  return normalized;
}

export default function OnboardingGenerateModelScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(true);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const routeImagePaths = useMemo(
    () =>
      Array.isArray(route.params?.onboardingImagePaths)
        ? route.params.onboardingImagePaths.map((entry: any) => String(entry || '').trim()).filter(Boolean)
        : [],
    [route.params?.onboardingImagePaths],
  );
  const routeImageUrls = useMemo(
    () =>
      Array.isArray(route.params?.onboardingImageUrls)
        ? route.params.onboardingImageUrls.map((entry: any) => String(entry || '').trim()).filter(Boolean)
        : [],
    [route.params?.onboardingImageUrls],
  );

  const fetchProfile = async () => {
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

    if (response.error && hasMissingProfileColumn(response.error.message, 'body_image_urls')) {
      response = await supabase
        .from('profiles')
        .select(PROFILE_MINIMAL_SELECT_FIELDS)
        .eq('id', user.id)
        .single();
    }

    if (
      response.error &&
      ['ai_model_path', 'ai_model_url', 'model_status'].some((field) => hasMissingProfileColumn(response.error.message, field))
    ) {
      response = await supabase
        .from('profiles')
        .select(PROFILE_FALLBACK_SELECT_FIELDS)
        .eq('id', user.id)
        .single();
    }

    const { data: profile, error } = response;
    if (error) throw error;

    const resolvedModelUrl = await resolvePrivateMediaUrl({
      path: profile?.ai_model_path,
      legacyUrl: profile?.ai_model_url,
    });

    if (resolvedModelUrl) {
      setModelUrl(resolvedModelUrl);
      setStatus('success');
      return { userId: user.id, profile, resolvedModelUrl };
    }

    setStatus(String(profile?.model_status || '').trim().toLowerCase() || 'idle');
    return { userId: user.id, profile, resolvedModelUrl: null };
  };

  useEffect(() => {
    let interval: any;
    let timeoutHandle: any;
    let cancelled = false;

    const clearTimers = () => {
      if (interval) clearInterval(interval);
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };

    const pollProfileStatus = async (uid: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_model_path, ai_model_url, model_status')
        .eq('id', uid)
        .single();

      if (error) throw error;

      const resolvedModelUrl = await resolvePrivateMediaUrl({
        path: data?.ai_model_path,
        legacyUrl: data?.ai_model_url,
      });

      if (cancelled) return;

      if (resolvedModelUrl) {
        setModelUrl(resolvedModelUrl);
        setStatus('success');
        clearTimers();
        return;
      }

      const nextStatus = String(data?.model_status || '').trim().toLowerCase() || 'idle';
      setStatus(nextStatus);
    };

    const requestModelGeneration = async (uid: string, sourcePayload: { image_paths: string[]; image_urls: string[] }) => {
      const response = await apiPost('/user/generate-model', { user_id: uid, ...sourcePayload });
      const payload: any = await readApiResponse(response);

      if (isRateLimitedResponse(response, payload)) {
        setStatus('generating');
        return {
          accepted: true,
          pollAfterMs: getRetryAfterMs(response, MODEL_POLL_INTERVAL_MS),
        };
      }

      if (!response.ok) {
        throw new Error(formatModelGenerationError(payload?.error || 'Model generation request failed.'));
      }
      setStatus('generating');
      return {
        accepted: true,
        pollAfterMs: Number(payload?.poll_after_ms) || MODEL_POLL_INTERVAL_MS,
      };
    };

    const loadAndPoll = async () => {
      try {
        const result = await fetchProfile();
        if (!result || cancelled) return;

        const uid = result.userId;
        const profile = result.profile;

        if (result.resolvedModelUrl) {
          setLoading(false);
          return;
        }

        if (!result.resolvedModelUrl && ['failed', '', 'idle', 'null'].includes(String(profile?.model_status || '').trim().toLowerCase() || 'idle')) {
          const storedSources = Array.isArray(profile?.body_image_paths) && profile.body_image_paths.length
            ? profile.body_image_paths
            : (profile?.body_image_urls || []);
          const sourcePayload = splitStoredMediaSources([
            ...storedSources,
            ...routeImagePaths,
            ...routeImageUrls,
          ]);
          if (!sourcePayload.image_paths.length && !sourcePayload.image_urls.length) {
            throw new Error('No full-body images found.');
          }

          const generationRequest = await requestModelGeneration(uid, sourcePayload);
          if (generationRequest?.pollAfterMs && generationRequest.pollAfterMs > MODEL_POLL_INTERVAL_MS) {
            await new Promise((resolve) => setTimeout(resolve, generationRequest.pollAfterMs));
          }
        }

        setLoading(false);

        interval = setInterval(() => {
          void pollProfileStatus(uid);
        }, MODEL_POLL_INTERVAL_MS);

        timeoutHandle = setTimeout(() => {
          if (cancelled) return;
          setLoading(false);
          setStatus((current) => (current === 'success' ? current : 'timed_out'));
          clearTimers();
        }, MODEL_WAIT_TIMEOUT_MS);
      } catch (err: any) {
        const nextMessage = formatModelGenerationError(err?.message);
        Alert.alert('Error', nextMessage);
        setStatus('failed');
        setLoading(false);
      }
    };

    void loadAndPoll();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [routeImagePaths, routeImageUrls]);

  const handleContinue = async () => {
    if (userId) {
      await updateOnboardingProgress(userId, {
        completed: true,
        stage: ONBOARDING_STAGES.COMPLETE,
      }).catch((error) => {
        if (!hasMissingProfileColumn(error?.message || error, 'onboarding_completed')) {
          console.warn('Could not mark onboarding as completed:', error?.message || error);
        }
      });
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const retry = () => {
    setStatus('idle');
    setModelUrl(null);
    setLoading(true);
    const reloadScreen = () => navigation.replace('OnboardingModal');
    requestAnimationFrame(reloadScreen);
  };

  const primaryAction = modelUrl
    ? { label: 'Enter Klozu', onPress: handleContinue }
    : status === 'failed'
      ? { label: 'Try Again', onPress: retry }
      : status === 'timed_out'
        ? { label: 'Keep Checking', onPress: retry }
        : null;

  const secondaryAction =
    !modelUrl && (status === 'failed' || status === 'timed_out')
      ? { label: 'Continue for now', onPress: handleContinue }
      : null;

  return (
    <OnboardingScaffold
      eyebrow="Final Setup"
      title="Build your digital model."
      subtitle="This becomes the base for try-on and future styling features. It only needs to happen once."
      footer={
        primaryAction || secondaryAction ? (
          <View style={styles.footerStack}>
            {secondaryAction ? (
              <TouchableOpacity activeOpacity={0.84} style={styles.secondaryButton} onPress={secondaryAction.onPress}>
                <Text style={styles.secondaryButtonText}>{secondaryAction.label}</Text>
              </TouchableOpacity>
            ) : null}
            {primaryAction ? (
              <TouchableOpacity activeOpacity={0.84} style={styles.primaryButton} onPress={primaryAction.onPress}>
                <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
            <Text style={styles.stageText}>Klozu is building a clean base avatar from your uploaded looks. This can take a little while the first time.</Text>
          </>
        ) : modelUrl ? (
          <>
            <Image source={{ uri: modelUrl }} style={styles.preview} />
            <Text style={styles.stageTitle}>Your model is ready</Text>
            <Text style={styles.stageText}>You can now move into the app with a base model ready for try-on.</Text>
          </>
        ) : status === 'timed_out' ? (
          <>
            <View style={styles.loaderWrap}>
              <Text style={styles.failureMark}>…</Text>
            </View>
            <Text style={styles.stageTitle}>Still generating</Text>
            <Text style={styles.stageText}>Your model request is taking longer than expected. You can keep checking, or continue into the app and come back later.</Text>
          </>
        ) : status === 'failed' ? (
          <>
            <View style={styles.loaderWrap}>
              <Text style={styles.failureMark}>×</Text>
            </View>
            <Text style={styles.stageTitle}>Model generation failed</Text>
            <Text style={styles.stageText}>Try again once more. If image generation is unavailable right now, you can continue into the app and finish this later.</Text>
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
  footerStack: {
    gap: spacing.sm,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
