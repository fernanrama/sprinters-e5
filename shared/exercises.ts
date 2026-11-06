export type ImageAsset = { url: string; width: number; height: number };
export type ExerciseImages = {
  thumbnail: ImageAsset;
  card: ImageAsset;
  detail: ImageAsset;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string;
  instructions: string;
  imageUrl?: string;
  images?: ExerciseImages;
  tags?: string[];
  demonstration?: { url: string; provider: string };
};

export function isExercise(value: unknown): value is Exercise {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const fields = value as Record<string, unknown>;
  if (!["id", "name", "muscleGroup", "equipment", "description", "instructions"].every(
    field => typeof fields[field] === "string" && fields[field].trim().length > 0,
  )) return false;
  if (fields.imageUrl !== undefined && typeof fields.imageUrl !== "string") return false;
  if (fields.images !== undefined && !isExerciseImages(fields.images)) return false;
  if (fields.demonstration !== undefined && !isDemonstration(fields.demonstration)) return false;
  return fields.tags === undefined || (Array.isArray(fields.tags) && fields.tags.every(tag => typeof tag === "string" && !!tag.trim()));
}

export function isDemonstration(value: unknown): value is NonNullable<Exercise["demonstration"]> {
  if (!value || typeof value !== "object") return false;
  const fields = value as Record<string, unknown>;
  if (typeof fields.url !== "string" || typeof fields.provider !== "string" || !fields.provider.trim()) return false;
  try {
    const url = new URL(fields.url);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

export function isExerciseImages(value: unknown): value is ExerciseImages {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["thumbnail", "card", "detail"].every(key => {
    const asset = record[key];
    if (!asset || typeof asset !== "object") return false;
    const fields = asset as Record<string, unknown>;
    return typeof fields.url === "string" && fields.url.trim().length > 0 &&
      typeof fields.width === "number" && Number.isSafeInteger(fields.width) && fields.width > 0 &&
      typeof fields.height === "number" && Number.isSafeInteger(fields.height) && fields.height > 0;
  });
}
