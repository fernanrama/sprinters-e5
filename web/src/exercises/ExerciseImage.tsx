import { useState } from "react";
import type { Exercise, ImageAsset } from "../../../shared/exercises";
import "./exercise-image.css";

type Props = {
  exercise: Pick<Exercise, "id" | "name" | "imageUrl" | "images">;
  variant: "card" | "detail" | "preview" | "row";
  loading?: "eager" | "lazy";
  decorative?: boolean;
};

function ImageContent({ asset, srcSet, sizes, name, loading, decorative }: {
  asset?: ImageAsset;
  srcSet?: string;
  sizes?: string;
  name: string;
  loading: "eager" | "lazy";
  decorative: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!asset?.url || failed) {
    return <span className="exercise-image-fallback" role="img"
      aria-label={`Imagen no disponible para ${name}`} aria-hidden={decorative || undefined}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="4" y="6" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="m5 26 8-9 6 6 5-5 7 8M6 3l25 30" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>Imagen no disponible</span>
    </span>;
  }
  return <img src={asset.url} srcSet={srcSet} sizes={sizes}
    width={asset.width} height={asset.height} alt={decorative ? "" : name}
    loading={loading} decoding="async" onError={() => setFailed(true)} />;
}

export function ExerciseImage({ exercise, variant, loading = "lazy", decorative = false }: Props) {
  const images = exercise.images;
  const asset = images
    ? variant === "row" ? images.thumbnail : variant === "detail" ? images.detail : images.card
    : exercise.imageUrl ? { url: exercise.imageUrl, width: 850, height: 567 } : undefined;
  const responsive = variant !== "row" && images;
  const srcSet = responsive
    ? `${images.card.url} ${images.card.width}w, ${images.detail.url} ${images.detail.width}w`
    : undefined;
  const sizes = variant === "card" ? "(max-width: 600px) calc(100vw - 32px), (max-width: 900px) 45vw, 360px"
    : variant === "preview" ? "(max-width: 540px) calc(100vw - 96px), 280px"
    : "(max-width: 650px) calc(100vw - 80px), 430px";
  return <span className={`exercise-image exercise-image--${variant}`}>
    <ImageContent key={`${exercise.id}:${asset?.url}:${srcSet}`} asset={asset}
      srcSet={srcSet} sizes={responsive ? sizes : undefined} name={exercise.name}
      loading={loading} decorative={decorative} />
  </span>;
}
