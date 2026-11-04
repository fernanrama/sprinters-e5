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
};

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
