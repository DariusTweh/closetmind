import { resolvePrivateMediaUrl } from './privateMedia';
import { supabase } from './supabase';

export const CLOTHES_BUCKET = 'clothes';
const OPTIONAL_WARDROBE_INSERT_FIELDS = [
  'image_path',
  'source_title',
  'pattern_type',
  'color_family',
  'material',
  'silhouette',
  'fit_type',
  'length',
  'rise',
  'sleeve_length',
  'formality',
  'occasion_tags',
  'layering_role',
  'statement_level',
  'footwear_style',
  'style_role',
  'garment_function',
  'subcategory',
  'subcategory_confidence',
  'function_confidence',
  'material_confidence',
  'material_guess',
  'fabric_weight',
  'texture_notes',
  'weather_use',
  'fit_notes',
  'try_on_fit_notes',
  'styling_notes',
  'price',
  'retailer',
  'product_url',
  'source_type',
  'source_id',
  'external_product_id',
  'original_image_url',
  'wardrobe_status',
];

type UploadWardrobeImageBytesArgs = {
  bytes: Uint8Array<ArrayBufferLike>;
  contentType: string;
  extension: string;
  userId: string;
};

export type UploadedWardrobeImage = {
  imagePath: string;
  imageUrl: string | null;
  accessUrl: string | null;
};

function normalizeExtension(extension: string) {
  const normalized = String(extension || '').trim().toLowerCase().replace(/^\./, '');
  return normalized || 'jpg';
}

function buildWardrobeImagePath(userId: string, extension: string) {
  const safeUserId = String(userId || '').trim();
  const ext = normalizeExtension(extension);
  return `wardrobe/${safeUserId}/${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
}

function hasMissingOptionalWardrobeInsertColumnError(message: string) {
  return OPTIONAL_WARDROBE_INSERT_FIELDS.some((field) => message.includes(`wardrobe.${field}`));
}

function extractMissingWardrobeColumn(message: string) {
  const rawMessage = String(message || '');
  const patterns = [
    /wardrobe\.([a-zA-Z0-9_]+)/i,
    /column "?([a-zA-Z0-9_]+)"? does not exist/i,
    /Could not find the '([^']+)' column of 'wardrobe'/i,
  ];

  for (const pattern of patterns) {
    const match = rawMessage.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

async function runWardrobeInsertWithSchemaFallback(payload: Record<string, any>) {
  const insertPayload = { ...payload };

  while (Object.keys(insertPayload).length) {
    let response = await supabase.from('wardrobe').insert([insertPayload]).select().single();
    if (!response.error) return response;

    const missingColumn = extractMissingWardrobeColumn(response.error.message);
    if (!missingColumn || !(missingColumn in insertPayload) || !OPTIONAL_WARDROBE_INSERT_FIELDS.includes(missingColumn)) {
      return response;
    }

    delete insertPayload[missingColumn];
  }

  return await supabase.from('wardrobe').insert([payload]).select().single();
}

async function runWardrobeUpdateWithSchemaFallback(payload: Record<string, any>, itemId: string, userId: string) {
  const updatePayload = { ...payload };

  while (Object.keys(updatePayload).length) {
    let response = await supabase
      .from('wardrobe')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (!response.error) return response;

    const missingColumn = extractMissingWardrobeColumn(response.error.message);
    if (!missingColumn || !(missingColumn in updatePayload) || !OPTIONAL_WARDROBE_INSERT_FIELDS.includes(missingColumn)) {
      return response;
    }

    delete updatePayload[missingColumn];
  }

  return await supabase
    .from('wardrobe')
    .update(payload)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single();
}

export async function uploadWardrobeImageBytes({
  bytes,
  contentType,
  extension,
  userId,
}: UploadWardrobeImageBytesArgs): Promise<UploadedWardrobeImage> {
  const imagePath = buildWardrobeImagePath(userId, extension);

  const { error: uploadError } = await supabase.storage
    .from(CLOTHES_BUCKET)
    .upload(imagePath, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const accessUrl = await resolvePrivateMediaUrl({
    path: imagePath,
    bucket: CLOTHES_BUCKET,
    preferBackendSigner: true,
  }).catch(() => null);

  return {
    imagePath,
    imageUrl: null,
    accessUrl,
  };
}

export async function insertWardrobeItemWithCompatibility(payload: Record<string, any>) {
  console.log('[item-source]', {
    sourceType: payload?.source_type || payload?.meta?.source_type || 'manual_upload',
    sourceSubtype: payload?.import_method || null,
    writingToWardrobe: true,
    action:
      payload?.source_type === 'browser_import'
        ? 'browser_explicit_save'
        : payload?.source_type === 'manual_upload'
          ? 'manual_upload'
          : 'import_confirmed_save',
  });
  let response = await runWardrobeInsertWithSchemaFallback(payload);

  if (response.error && hasMissingOptionalWardrobeInsertColumnError(response.error.message)) {
    const fallbackPayload = { ...payload };
    for (const field of OPTIONAL_WARDROBE_INSERT_FIELDS) {
      delete fallbackPayload[field];
    }
    response = await supabase.from('wardrobe').insert([fallbackPayload]).select().single();
  }

  return response;
}

export async function updateWardrobeItemWithCompatibility({
  payload,
  itemId,
  userId,
}: {
  payload: Record<string, any>;
  itemId: string;
  userId: string;
}) {
  console.log('[item-source]', {
    sourceType: payload?.source_type || 'wardrobe',
    sourceSubtype: payload?.import_method || null,
    writingToWardrobe: true,
    action: 'edit_existing',
  });
  let response = await runWardrobeUpdateWithSchemaFallback(payload, itemId, userId);

  if (response.error && hasMissingOptionalWardrobeInsertColumnError(response.error.message)) {
    const fallbackPayload = { ...payload };
    for (const field of OPTIONAL_WARDROBE_INSERT_FIELDS) {
      delete fallbackPayload[field];
    }
    response = await supabase
      .from('wardrobe')
      .update(fallbackPayload)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();
  }

  return response;
}
