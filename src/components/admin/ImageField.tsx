import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/services/mediaService";

/** File picker with a thumbnail preview of the current or newly chosen image. */
export function ImageField({
  currentUrl,
  file,
  onFileChange,
  accept = "image/*",
}: {
  currentUrl?: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  accept?: string;
}) {
  const resolvedCurrent = currentUrl ? resolveMediaUrl(currentUrl) : undefined;
  const [preview, setPreview] = useState<string | undefined>(resolvedCurrent);

  useEffect(() => {
    if (!file) {
      setPreview(resolvedCurrent);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, resolvedCurrent]);

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            {preview ? "Change image" : "Upload image"}
            <input
              type="file"
              accept={accept}
              className="sr-only"
              onChange={(e) => {
                onFileChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
        {file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onFileChange(null)}>
            <X className="size-4" /> Undo
          </Button>
        )}
      </div>
    </div>
  );
}
