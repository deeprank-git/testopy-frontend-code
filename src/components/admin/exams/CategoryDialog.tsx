import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageField } from "@/components/admin/ImageField";
import { apiError } from "@/lib/admin/ui-helpers";
import * as categoryService from "@/services/categoryService";

type Category = { _id: string; name: string; description?: string; image?: string };

export function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Reset the form every time the dialog opens (create or a different category).
  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setImageFile(null);
  }, [open, category]);

  const save = useMutation({
    mutationFn: () => {
      const input = { name: name.trim(), description: description.trim(), imageFile };
      return category
        ? categoryService.updateCategory(category._id, input)
        : categoryService.createCategory(input);
    },
    onSuccess: () => {
      toast.success(category ? "Category updated" : "Category created");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      if (category) qc.invalidateQueries({ queryKey: ["admin", "category", category._id] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e, "Could not save category")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) save.mutate();
          }}
          className="space-y-5"
        >
          <DialogHeader>
            <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              Categories group test series by exam body, e.g. SSC, Banking or Railways.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SSC"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown to students on the exams page"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <ImageField currentUrl={category?.image} file={imageFile} onFileChange={setImageFile} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || save.isPending}>
              {save.isPending ? "Saving…" : category ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
