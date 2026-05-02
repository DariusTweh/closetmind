import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiPost, readApiResponse } from './api';
import { loadFitCheckPostById } from './fitCheckService';
import { supabase } from './supabase';

const INSTALLATION_ID_KEY = 'fit_check_push_installation_id_v1';
const PERMISSION_PROMPTED_KEY = 'fit_check_push_permission_prompted_v1';

export type FitCheckNotificationPreferences = {
  daily_fit_check_reminder: boolean;
  reactions: boolean;
  style_notes: boolean;
  follows: boolean;
  saves_recreates: boolean;
};

type PushRegistrationFailureReason =
  | 'unauthenticated'
  | 'permission_denied'
  | 'missing_aps_entitlement'
  | 'missing_project_id'
  | 'missing_push_token'
  | 'simulator_unsupported'
  | 'registration_failed'
  | 'error';

type PushRegistrationResult =
  | {
      enabled: true;
      permissionStatus: string;
      expoPushToken: string;
    }
  | {
      enabled: false;
      permissionStatus: string;
      reason: PushRegistrationFailureReason;
      errorMessage?: string | null;
    };

export const DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES: FitCheckNotificationPreferences = {
  daily_fit_check_reminder: false,
  reactions: true,
  style_notes: true,
  follows: true,
  saves_recreates: true,
};

let notificationHandlerConfigured = false;

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function getProjectId() {
  return String(
    Constants.easConfig?.projectId ||
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    '',
  ).trim();
}

function createInstallationId() {
  return `fc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getInstallationId() {
  const cached = String(await AsyncStorage.getItem(INSTALLATION_ID_KEY) || '').trim();
  if (cached) return cached;
  const nextId = createInstallationId();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, nextId);
  return nextId;
}

function getPermissionLabel(settings: Notifications.NotificationPermissionsStatus) {
  if (settings.granted) return 'granted';
  return String(settings.status || 'undetermined').trim() || 'undetermined';
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#111111',
  });
}

export function configureFitCheckNotificationHandling() {
  if (notificationHandlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

function inferPushRegistrationFailureReason(message: string) {
  const normalized = String(message || '').trim().toLowerCase();
  if (!normalized) return 'error' as const;
  if (normalized.includes('physical device')) return 'simulator_unsupported' as const;
  if (normalized.includes('aps-environment')) return 'missing_aps_entitlement' as const;
  if (normalized.includes('no valid') && normalized.includes('entitlement')) return 'missing_aps_entitlement' as const;
  if (normalized.includes('project id')) return 'missing_project_id' as const;
  if (normalized.includes('push token')) return 'missing_push_token' as const;
  if (normalized.includes('failed with status')) return 'registration_failed' as const;
  return 'error' as const;
}

export function describePushRegistrationFailure(result: PushRegistrationResult) {
  if (result.enabled) {
    return null;
  }

  const failure = result as Extract<PushRegistrationResult, { enabled: false }>;

  switch (failure.reason) {
    case 'permission_denied':
      return {
        title: 'Push permission needed',
        message: 'Enable push notifications in iPhone settings to receive Fit Check alerts.',
      };
    case 'missing_aps_entitlement':
      return {
        title: 'Push capability missing',
        message: 'This iOS build was not signed with Apple push notifications enabled. Rebuild the app with the Push Notifications capability and a valid aps-environment entitlement, then try again.',
      };
    case 'simulator_unsupported':
      return {
        title: 'Physical device required',
        message: 'Expo push tokens do not work reliably in the simulator. Test push notifications on a real iPhone or Android device.',
      };
    case 'missing_project_id':
      return {
        title: 'Push project config missing',
        message: 'The app could not resolve the Expo project ID needed for push registration. Rebuild the app and verify the Expo config is bundled correctly.',
      };
    case 'missing_push_token':
      return {
        title: 'Push token unavailable',
        message: 'Notification permission is on, but the app could not get a push token yet. Try reopening the app on a physical device after the native rebuild finishes.',
      };
    case 'registration_failed':
      return {
        title: 'Push registration failed',
        message: failure.errorMessage || 'The app could not register this device with the backend. Check the backend deploy and try again.',
      };
    case 'unauthenticated':
      return {
        title: 'Sign in required',
        message: 'You need to be signed in before enabling Fit Check notifications.',
      };
    default:
      return {
        title: 'Push setup failed',
        message: failure.errorMessage || 'Push setup did not complete. Try again on a physical device after rebuilding the app.',
      };
  }
}

export async function syncFitCheckPushRegistration({
  requestPermission = false,
}: {
  requestPermission?: boolean;
} = {}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        enabled: false,
        permissionStatus: 'unauthenticated',
        reason: 'unauthenticated',
      } as const;
    }

    await ensureAndroidNotificationChannel();

    let settings = await Notifications.getPermissionsAsync();
    if (!settings.granted && requestPermission) {
      settings = await Notifications.requestPermissionsAsync();
    }

    const permissionStatus = getPermissionLabel(settings);
    const deviceId = await getInstallationId();

    if (!settings.granted) {
      await apiPost('/notifications/register-token', {
        device_id: deviceId,
        expo_push_token: null,
        permission_status: permissionStatus,
        platform: Platform.OS,
        app_version: String((Constants.expoConfig as any)?.version || '').trim() || null,
        build_number: String(Constants.nativeBuildVersion || '').trim() || null,
      }).catch(() => null);

      return {
        enabled: false,
        permissionStatus,
        reason: 'permission_denied',
      } as const;
    }

    const projectId = getProjectId();
    if (!projectId) {
      return {
        enabled: false,
        permissionStatus,
        reason: 'missing_project_id',
      } as const;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = String(token?.data || '').trim();
    if (!expoPushToken) {
      return {
        enabled: false,
        permissionStatus,
        reason: 'missing_push_token',
      } as const;
    }

    const response = await apiPost('/notifications/register-token', {
      device_id: deviceId,
      expo_push_token: expoPushToken,
      permission_status: permissionStatus,
      platform: Platform.OS,
      app_version: String((Constants.expoConfig as any)?.version || '').trim() || null,
      build_number: String(Constants.nativeBuildVersion || '').trim() || null,
    });

    if (!response.ok) {
      const payload = await readApiResponse<{ error?: string }>(response);
      return {
        enabled: false,
        permissionStatus,
        reason: 'registration_failed',
        errorMessage: String((payload as any)?.error || `Push registration failed with status ${response.status}`),
      } as const;
    }

    return { enabled: true, permissionStatus, expoPushToken } as const;
  } catch (error: any) {
    const errorMessage = String(error?.message || '').trim() || null;
    console.warn('Push registration skipped:', error);
    return {
      enabled: false,
      permissionStatus: 'error',
      reason: inferPushRegistrationFailureReason(errorMessage || ''),
      errorMessage,
    } as const;
  }
}

export async function loadFitCheckNotificationPreferences() {
  const response = await apiPost('/notifications/preferences', undefined, { method: 'GET' });
  const rawPayload = await readApiResponse<Partial<FitCheckNotificationPreferences> & { error?: string }>(response);
  const payload = rawPayload as Partial<FitCheckNotificationPreferences> & { error?: string; rawText?: string };

  if (!response.ok) {
    throw new Error(String((payload as any)?.error || `Request failed with status ${response.status}`));
  }

  return {
    daily_fit_check_reminder: normalizeBoolean(payload.daily_fit_check_reminder, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.daily_fit_check_reminder),
    reactions: normalizeBoolean(payload.reactions, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.reactions),
    style_notes: normalizeBoolean(payload.style_notes, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.style_notes),
    follows: normalizeBoolean(payload.follows, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.follows),
    saves_recreates: normalizeBoolean(payload.saves_recreates, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.saves_recreates),
  } as FitCheckNotificationPreferences;
}

export async function updateFitCheckNotificationPreferences(
  patch: Partial<FitCheckNotificationPreferences>,
) {
  const response = await apiPost('/notifications/preferences', patch);
  const rawPayload = await readApiResponse<Partial<FitCheckNotificationPreferences> & { error?: string }>(response);
  const payload = rawPayload as Partial<FitCheckNotificationPreferences> & { error?: string; rawText?: string };

  if (!response.ok) {
    throw new Error(String((payload as any)?.error || `Request failed with status ${response.status}`));
  }

  return {
    daily_fit_check_reminder: normalizeBoolean(payload.daily_fit_check_reminder, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.daily_fit_check_reminder),
    reactions: normalizeBoolean(payload.reactions, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.reactions),
    style_notes: normalizeBoolean(payload.style_notes, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.style_notes),
    follows: normalizeBoolean(payload.follows, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.follows),
    saves_recreates: normalizeBoolean(payload.saves_recreates, DEFAULT_FIT_CHECK_NOTIFICATION_PREFERENCES.saves_recreates),
  } as FitCheckNotificationPreferences;
}

export async function processActivityNotification(activityEventId: string) {
  const normalizedId = String(activityEventId || '').trim();
  if (!normalizedId) return null;

  const response = await apiPost('/notifications/process-activity', {
    activity_event_id: normalizedId,
  });
  const payload = await readApiResponse<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(String((payload as any)?.error || `Request failed with status ${response.status}`));
  }

  return payload;
}

export async function hasPromptedForFitCheckPushPermission() {
  return String(await AsyncStorage.getItem(PERMISSION_PROMPTED_KEY) || '').trim() === '1';
}

export async function maybePromptForFitCheckPushPermission() {
  const hasPrompted = await hasPromptedForFitCheckPushPermission();
  if (hasPrompted) return false;

  await AsyncStorage.setItem(PERMISSION_PROMPTED_KEY, '1');
  const result = await syncFitCheckPushRegistration({ requestPermission: true });
  return result.enabled;
}

export async function handleFitCheckNotificationNavigation(
  navigationRef: any,
  response: Notifications.NotificationResponse | null | undefined,
) {
  const data = (response?.notification?.request?.content?.data || {}) as Record<string, any>;
  const screen = String(data?.screen || '').trim();
  const actorId = String(data?.actor_id || '').trim();
  const postId = String(data?.post_id || '').trim();

  if (!navigationRef?.isReady?.()) {
    return false;
  }

  if (screen === 'PublicProfile' && actorId) {
    navigationRef.navigate('PublicProfile', {
      userId: actorId,
      source: 'push_follow',
    });
    return true;
  }

  if (screen === 'PostFitCheck') {
    navigationRef.navigate('PostFitCheck');
    return true;
  }

  if (screen === 'FitPostDetail' && postId) {
    const post = await loadFitCheckPostById(postId).catch(() => null);
    if (post) {
      navigationRef.navigate('FitPostDetail', {
        post,
        source: 'push_notification',
      });
      return true;
    }
  }

  navigationRef.navigate('Activity');
  return true;
}
