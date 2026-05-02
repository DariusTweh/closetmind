import { supabase } from './supabase';

export type ProfileVisibility = 'public' | 'private';

export type ProfilePrivacySettings = {
  profileVisibility: ProfileVisibility;
  publicClosetEnabled: boolean;
};

const DEFAULT_PROFILE_PRIVACY_SETTINGS: ProfilePrivacySettings = {
  profileVisibility: 'public',
  publicClosetEnabled: false,
};

function isMissingProfilePrivacyColumn(error: any, field: string) {
  const normalized = String(error?.message || error?.details || error || '').toLowerCase();
  const target = String(field || '').toLowerCase();
  return (
    normalized.includes(`profiles.${target}`) ||
    normalized.includes(`'${target}' column of 'profiles'`) ||
    (normalized.includes("column of 'profiles'") && normalized.includes(target))
  );
}

function normalizeVisibility(value: any): ProfileVisibility {
  return String(value || '').trim().toLowerCase() === 'private' ? 'private' : 'public';
}

export async function loadCurrentProfilePrivacySettings(): Promise<ProfilePrivacySettings> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new Error('You must be logged in to manage privacy settings.');
  }

  let response: any = await supabase
    .from('profiles')
    .select('profile_visibility, public_closet_enabled')
    .eq('id', user.id)
    .maybeSingle();

  if (response.error && isMissingProfilePrivacyColumn(response.error, 'public_closet_enabled')) {
    response = await supabase
      .from('profiles')
      .select('profile_visibility')
      .eq('id', user.id)
      .maybeSingle();
  }

  if (response.error && isMissingProfilePrivacyColumn(response.error, 'profile_visibility')) {
    return DEFAULT_PROFILE_PRIVACY_SETTINGS;
  }

  if (response.error) {
    throw new Error(response.error.message || 'Could not load privacy settings.');
  }

  return {
    profileVisibility: normalizeVisibility(response.data?.profile_visibility),
    publicClosetEnabled: Boolean(response.data?.public_closet_enabled),
  };
}

export async function updateCurrentProfilePrivacySettings(
  patch: Partial<ProfilePrivacySettings>,
): Promise<ProfilePrivacySettings> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new Error('You must be logged in to update privacy settings.');
  }

  const payload: Record<string, any> = {};

  if (patch.profileVisibility) {
    payload.profile_visibility = normalizeVisibility(patch.profileVisibility);
  }

  if (typeof patch.publicClosetEnabled === 'boolean') {
    payload.public_closet_enabled = patch.publicClosetEnabled;
  }

  if (!Object.keys(payload).length) {
    return loadCurrentProfilePrivacySettings();
  }

  let response: any = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('profile_visibility, public_closet_enabled')
    .single();

  if (response.error && isMissingProfilePrivacyColumn(response.error, 'public_closet_enabled')) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.public_closet_enabled;

    response = await supabase
      .from('profiles')
      .update(fallbackPayload)
      .eq('id', user.id)
      .select('profile_visibility')
      .single();
  }

  if (response.error) {
    throw new Error(response.error.message || 'Could not update privacy settings.');
  }

  return {
    profileVisibility: normalizeVisibility(response.data?.profile_visibility),
    publicClosetEnabled:
      typeof response.data?.public_closet_enabled === 'boolean'
        ? response.data.public_closet_enabled
        : Boolean(patch.publicClosetEnabled),
  };
}
