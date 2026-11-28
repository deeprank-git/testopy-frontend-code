import { useState } from "react";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCurrentAffairsImageUrl } from "@/services/mediaService";

// Shared image + fallback for CurrentAffairs.image — every article thumbnail
// (Top Stories, Latest Updates, "More in category", the article hero, the
// admin preview) goes through here so they can't drift apart. Absolute
// scraped URLs (gktoday.in, drishtiias.com) render as-is; relative admin
// uploads get the API host prepended (resolveCurrentAffairsImageUrl).
//
// No image (or one that fails to load):
//   - default: a neutral tile with a newspaper icon, which reads cleanly at
//     any size from a 56px thumbnail to a card header
//   - hideWhenMissing: nothing at all (the article page skips the hero)
//
// fit="cover" (default) crops photos to the box; fit="contain" shows the
// whole picture on a soft background — for the article hero, where scraped
// images are often infographics that mustn't be cropped.
export function ArticleImage({
  image,
  alt,
  className,
  fit = "cover",
  hideWhenMissing = false,
}: {
  image?: string | null;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
  hideWhenMissing?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const url = resolveCurrentAffairsImageUrl(image);
  const showImage = !!url && !errored;

  if (!showImage && hideWhenMissing) return null;

  return (
    <div className={cn("relative shrink-0 overflow-hidden", className)}>
      {showImage ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className={cn(
            "h-full w-full",
            fit === "cover" ? "object-cover" : "bg-muted/40 object-contain",
          )}
        />
      ) : (
        <div
          role="img"
          aria-label="No image for this article"
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted"
        >
          <Newspaper
            className="h-[38%] max-h-12 w-[38%] max-w-12 text-primary/35"
            strokeWidth={1.5}
          />
        </div>
      )}
    </div>
  );
}
