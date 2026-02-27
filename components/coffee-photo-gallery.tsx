"use client";

import { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Camera, Plus, X, ImageIcon, Loader2 } from "lucide-react";

interface CoffeePhoto {
  id: string;
  coffeeId: string;
  url: string;
  caption: string | null;
  photoType: string;
  createdAt: string;
}

interface CoffeePhotoGalleryProps {
  coffeeId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const photoTypeLabels: Record<string, string> = {
  label: "Label",
  bag: "Bag",
  beans: "Beans",
  latte_art: "Latte Art",
  brew: "Brew",
  other: "Other",
};

export function CoffeePhotoGallery({ coffeeId }: CoffeePhotoGalleryProps) {
  const { data: photos, isLoading } = useSWR<CoffeePhoto[]>(
    `/api/coffees/${coffeeId}/photos`,
    fetcher
  );

  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [photoType, setPhotoType] = useState("other");
  const [viewingPhoto, setViewingPhoto] = useState<CoffeePhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload to Blob
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const { url } = await uploadRes.json();

      // Save to database
      await fetch(`/api/coffees/${coffeeId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, caption, photoType }),
      });

      mutate(`/api/coffees/${coffeeId}/photos`);
      toast.success("Photo uploaded!");
      resetUploadDialog();
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: CoffeePhoto) => {
    try {
      await fetch(`/api/coffees/${coffeeId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id, url: photo.url }),
      });

      mutate(`/api/coffees/${coffeeId}/photos`);
      setViewingPhoto(null);
      toast.success("Photo deleted");
    } catch {
      toast.error("Failed to delete photo");
    }
  };

  const resetUploadDialog = () => {
    setShowUploadDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setPhotoType("other");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Camera className="size-4" />
          Photos
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="size-4 mr-1" />
          Add Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setViewingPhoto(photo)}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 ring-primary transition-all"
            >
              <Image
                src={photo.url}
                alt={photo.caption || "Coffee photo"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 150px"
              />
              {photo.photoType !== "other" && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1.5 py-0.5 rounded">
                  {photoTypeLabels[photo.photoType]}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-8 text-muted-foreground border-dashed">
          <ImageIcon className="size-8 mb-2 opacity-50" />
          <p className="text-sm">No photos yet</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => fileInputRef.current?.click()}
          >
            Add your first photo
          </Button>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={resetUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo</DialogTitle>
          </DialogHeader>

          {previewUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="photo-type">Photo Type</Label>
              <Select value={photoType} onValueChange={setPhotoType}>
                <SelectTrigger id="photo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="label">Label</SelectItem>
                  <SelectItem value="bag">Bag</SelectItem>
                  <SelectItem value="beans">Beans</SelectItem>
                  <SelectItem value="latte_art">Latte Art</SelectItem>
                  <SelectItem value="brew">Brew</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUploadDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Photo Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {viewingPhoto?.photoType &&
                  photoTypeLabels[viewingPhoto.photoType]}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => viewingPhoto && handleDelete(viewingPhoto)}
              >
                <X className="size-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {viewingPhoto && (
            <>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <Image
                  src={viewingPhoto.url}
                  alt={viewingPhoto.caption || "Coffee photo"}
                  fill
                  className="object-contain"
                />
              </div>
              {viewingPhoto.caption && (
                <p className="text-sm text-muted-foreground text-center">
                  {viewingPhoto.caption}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
