import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_STYLE_CANVAS_SESSION_KEY = 'closetmind.active_style_canvas_session.v1';

export type ActiveStyleCanvasSession = {
  canvasId: string;
  title?: string | null;
  origin?: string | null;
  updatedAt: string;
};

export async function getActiveStyleCanvasSession(): Promise<ActiveStyleCanvasSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_STYLE_CANVAS_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.canvasId) return null;

    return {
      canvasId: String(parsed.canvasId),
      title: parsed.title ? String(parsed.title) : null,
      origin: parsed.origin ? String(parsed.origin) : null,
      updatedAt: parsed.updatedAt ? String(parsed.updatedAt) : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function setActiveStyleCanvasSession(session: {
  canvasId: string;
  title?: string | null;
  origin?: string | null;
}) {
  const payload: ActiveStyleCanvasSession = {
    canvasId: String(session.canvasId),
    title: session.title ? String(session.title) : null,
    origin: session.origin ? String(session.origin) : null,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(ACTIVE_STYLE_CANVAS_SESSION_KEY, JSON.stringify(payload));
  return payload;
}

export async function clearActiveStyleCanvasSession() {
  await AsyncStorage.removeItem(ACTIVE_STYLE_CANVAS_SESSION_KEY);
}
