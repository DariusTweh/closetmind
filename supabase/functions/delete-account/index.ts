import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const APP_TABLES: Array<{ table: string; column: string }> = [
  { table: "travel_collections", column: "user_id" },
  { table: "saved_outfits", column: "user_id" },
  { table: "daily_outfits", column: "user_id" },
  { table: "tryon_outfits", column: "user_id" },
  { table: "tryon_jobs", column: "user_id" },
  { table: "user_style_profiles", column: "user_id" },
  { table: "user_browser_stores", column: "user_id" },
  { table: "onboarding_outfit_photos", column: "user_id" },
  { table: "wardrobe", column: "user_id" },
  { table: "profiles", column: "id" },
];

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeBearerToken(headerValue: string | null) {
  const raw = String(headerValue || "").trim();
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function listAllPaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
  accum: string[] = []
): Promise<string[]> {
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    if (!data?.length) break;

    for (const entry of data) {
      const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isDirectory = entry.id == null;
      if (isDirectory) {
        await listAllPaths(admin, bucket, nextPath, accum);
      } else {
        accum.push(nextPath);
      }
    }

    if (data.length < 100) break;
    offset += data.length;
  }

  return accum;
}

async function listFolderPrefixMatches(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
  namePrefix: string
) {
  const { data, error } = await admin.storage.from(bucket).list(folder, {
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) throw error;

  return (data || [])
    .filter((entry) => entry.id != null && entry.name.startsWith(namePrefix))
    .map((entry) => `${folder}/${entry.name}`);
}

async function removePaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  paths: string[]
) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const batch = uniquePaths.slice(index, index + 100);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw error;
  }
}

async function deleteRowsByUser(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  userId: string
) {
  const { error } = await admin.from(table).delete().eq(column, userId);
  if (error && error.code !== "42P01") {
    throw error;
  }
}

async function collectDeletePaths(admin: ReturnType<typeof createClient>, userId: string) {
  const onboardingFolderPaths = await Promise.all([
    listAllPaths(admin, "onboarding", `avatars/${userId}`),
    listAllPaths(admin, "onboarding", `tryon/${userId}`),
    listAllPaths(admin, "onboarding", `body/${userId}`),
    listAllPaths(admin, "onboarding", userId),
  ]);

  const onboardingLegacyPaths = await Promise.all([
    listFolderPrefixMatches(admin, "onboarding", "avatars", `${userId}_`),
    listFolderPrefixMatches(admin, "onboarding", "tryon", `${userId}_`),
  ]);

  const clothesPaths = await listAllPaths(admin, "clothes", `wardrobe/${userId}`);

  return {
    onboarding: [...onboardingFolderPaths.flat(), ...onboardingLegacyPaths.flat()],
    clothes: clothesPaths,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const token = normalizeBearerToken(req.headers.get("Authorization"));

    if (!token) {
      return json(401, { error: "Missing bearer token" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      return json(401, { error: "Invalid or expired token" });
    }

    const userId = user.id;
    const deletePaths = await collectDeletePaths(admin, userId);

    for (const entry of APP_TABLES) {
      await deleteRowsByUser(admin, entry.table, entry.column, userId);
    }

    if (deletePaths.onboarding.length) {
      await removePaths(admin, "onboarding", deletePaths.onboarding);
    }

    if (deletePaths.clothes.length) {
      await removePaths(admin, "clothes", deletePaths.clothes);
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw deleteUserError;
    }

    return json(200, { success: true });
  } catch (error) {
    console.error("[delete-account] failed", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Could not delete account",
    });
  }
});
