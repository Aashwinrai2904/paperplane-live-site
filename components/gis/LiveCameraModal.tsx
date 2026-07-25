"use client";

import { useState } from "react";
import { CameraOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TrafficCameraLocation } from "@/lib/gisData";

interface LiveCameraModalProps {
  camera: TrafficCameraLocation | null;
  onClose: () => void;
}

const CAMERA_URL_TEMPLATE = process.env.NEXT_PUBLIC_TRAFFIC_CAMERA_URL_TEMPLATE;

export default function LiveCameraModal({ camera, onClose }: LiveCameraModalProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = camera && CAMERA_URL_TEMPLATE ? CAMERA_URL_TEMPLATE.replace("{id}", camera.id) : null;

  return (
    <Sheet open={Boolean(camera)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{camera?.name ?? "Traffic Camera"}</SheetTitle>
          <SheetDescription>Live camera feed</SheetDescription>
        </SheetHeader>
        <div className="px-6 pb-6">
          {imageUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`${camera?.name} live camera`}
              className="w-full rounded-lg border border-border/50"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 bg-secondary/30 py-12 text-center">
              <CameraOff className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-foreground">Live camera feed unavailable</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Configure <code className="rounded bg-secondary px-1 py-0.5">NEXT_PUBLIC_TRAFFIC_CAMERA_URL_TEMPLATE</code>{" "}
                to point this layer at a camera provider.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
