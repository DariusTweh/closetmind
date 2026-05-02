import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiPost } from '../lib/api';
import {
  buildDashboardRegenerationRequest,
  evaluateDailyFitCandidate,
  extractDailyFitSummary,
  fetchDailyFitForUser,
  fetchProfileAvatarForUser,
  getRecentWardrobeItems,
  mapGeneratedOutfitToWardrobe,
  mapDailyFitItems,
  maybeRefreshUserLocation,
  persistManualDailyFit,
  persistDashboardCache,
  readDashboardCache,
  resolveCurrentUserId,
} from '../lib/closetDashboard';

type UseClosetDashboardOptions = {
  wardrobe?: any[];
  enabled?: boolean;
};

export default function useClosetDashboard({
  wardrobe = [],
  enabled = true,
}: UseClosetDashboardOptions) {
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyFitItems, setDailyFitItems] = useState<any[]>([]);
  const [outfitWeather, setOutfitWeather] = useState<string | null>(null);
  const [outfitLocation, setOutfitLocation] = useState<string | null>(null);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const wardrobeRef = useRef<any[]>(wardrobe);

  useEffect(() => {
    wardrobeRef.current = wardrobe;
    if (!wardrobe.length) return;

    setDailyFitItems((current) => mapDailyFitItems({ items: current }, wardrobe, current));
  }, [wardrobe]);

  const recentItems = useMemo(() => getRecentWardrobeItems(wardrobe, 10), [wardrobe]);

  const syncDailyFit = useCallback(async (uid: string, fallbackItems: any[] = []) => {
    const dailyFit = await fetchDailyFitForUser(uid);
    const nextItems = dailyFit
      ? mapDailyFitItems(dailyFit, wardrobeRef.current, fallbackItems)
      : [];
    const { outfitWeather: nextWeather, outfitLocation: nextLocation } = extractDailyFitSummary(dailyFit);

    setDailyFitItems(nextItems);
    setOutfitWeather(nextWeather);
    setOutfitLocation(nextLocation);
    await persistDashboardCache(uid, {
      outfit: nextItems,
      outfitWeather: nextWeather,
      outfitLocation: nextLocation,
    });

    return nextItems;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const uid = await resolveCurrentUserId();
        if (cancelled) return;

        if (!uid) {
          setUserId(null);
          setDailyFitItems([]);
          setOutfitWeather(null);
          setOutfitLocation(null);
          setAvatarUri(null);
          return;
        }

        setUserId(uid);

        const cached = await readDashboardCache(uid);
        if (cancelled) return;

        const cachedOutfit = Array.isArray(cached?.outfit)
          ? mapDailyFitItems({ items: cached.outfit }, wardrobeRef.current, cached.outfit)
          : [];

        if (cachedOutfit.length || cached?.outfitWeather || cached?.outfitLocation) {
          setDailyFitItems(cachedOutfit);
          setOutfitWeather(cached?.outfitWeather ?? null);
          setOutfitLocation(cached?.outfitLocation ?? null);
        }

        maybeRefreshUserLocation(uid).catch(() => {});
        fetchProfileAvatarForUser(uid)
          .then((nextAvatar) => {
            if (!cancelled) {
              setAvatarUri(nextAvatar || null);
            }
          })
          .catch(() => {});

        setOutfitLoading(cachedOutfit.length === 0);
        await syncDailyFit(uid, cachedOutfit);
      } catch (error: any) {
        console.warn('useClosetDashboard bootstrap error:', error?.message || error);
      } finally {
        if (!cancelled) {
          setOutfitLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [enabled, syncDailyFit]);

  const refreshDashboard = useCallback(async () => {
    if (!userId) return [];

    setOutfitLoading(true);
    try {
      return await syncDailyFit(userId, dailyFitItems);
    } catch (error: any) {
      console.warn('useClosetDashboard refresh error:', error?.message || error);
      return dailyFitItems;
    } finally {
      setOutfitLoading(false);
    }
  }, [dailyFitItems, syncDailyFit, userId]);

  const handleRegenerate = useCallback(async () => {
    if (!userId || !wardrobeRef.current.length || outfitLoading) return [];

    setOutfitLoading(true);
    try {
      const attemptedAvoidIds = new Set(
        (Array.isArray(dailyFitItems) ? dailyFitItems : [])
          .map((item) => String(item?.id || '').trim())
          .filter(Boolean),
      );
      let nextItems: any[] = [];
      let resolvedRequest: any = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const request = buildDashboardRegenerationRequest({
          outfitWeather,
          outfitLocation,
          currentOutfit: dailyFitItems,
          wardrobe: wardrobeRef.current,
          avoidIds: Array.from(attemptedAvoidIds),
        });
        resolvedRequest = request;

        const response = await apiPost('/generate-multistep-outfit', request);
        if (!response.ok) {
          continue;
        }

        const payload = await response.json().catch(() => null);
        const candidateItems = mapGeneratedOutfitToWardrobe(payload, wardrobeRef.current);
        if (!candidateItems.length) {
          continue;
        }

        const evaluation = evaluateDailyFitCandidate(candidateItems, outfitWeather);
        if (evaluation.accepted) {
          nextItems = candidateItems;
          break;
        }

        console.warn('Rejected incoherent daily fit candidate:', evaluation.issues.join(', ') || 'unknown');
        candidateItems.forEach((item) => {
          const itemId = String(item?.id || '').trim();
          if (itemId) attemptedAvoidIds.add(itemId);
        });
      }

      if (!nextItems.length) {
        return dailyFitItems;
      }

      setDailyFitItems(nextItems);
      await Promise.all([
        persistDashboardCache(userId, {
          outfit: nextItems,
          outfitWeather,
          outfitLocation,
        }),
        persistManualDailyFit({
          userId,
          items: nextItems,
          outfitWeather,
          outfitLocation,
          context: resolvedRequest?.context ?? null,
        }),
      ]);

      return nextItems;
    } catch (error: any) {
      console.warn('useClosetDashboard regenerate error:', error?.message || error);
      return dailyFitItems;
    } finally {
      setOutfitLoading(false);
    }
  }, [dailyFitItems, outfitLoading, outfitLocation, outfitWeather, userId]);

  return {
    userId,
    wardrobe,
    recentItems,
    dailyFitItems,
    outfitWeather,
    outfitLocation,
    outfitLoading,
    avatarUri,
    handleRegenerate,
    refreshDashboard,
  };
}
