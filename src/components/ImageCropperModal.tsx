"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move } from "lucide-react";

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropperModal({
  imageSrc,
  onCropComplete,
  onCancel,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep offsetRef synchronized with offset state
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Crop preview circle size: responsive for small mobile screens
  const [cropSize, setCropSize] = useState(240);

  useEffect(() => {
    const updateCropSize = () => {
      if (typeof window !== "undefined") {
        const available = Math.min(window.innerWidth - 48, 260);
        setCropSize(Math.max(180, Math.min(260, available)));
      }
    };
    updateCropSize();
    window.addEventListener("resize", updateCropSize);
    return () => window.removeEventListener("resize", updateCropSize);
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;

    // Calculate minimum zoom so image covers the crop circle in both dimensions
    const scaleX = cropSize / img.naturalWidth;
    const scaleY = cropSize / img.naturalHeight;
    const baseScale = Math.max(scaleX, scaleY);

    setMinZoom(baseScale);
    setZoom(baseScale);
    setOffset({ x: 0, y: 0 });
    setImageLoaded(true);
  };

  // Clamp offset so the image doesn't expose empty space inside the crop circle
  const clampOffset = useCallback(
    (newX: number, newY: number, currentZoom: number) => {
      if (!imgRef.current) return { x: newX, y: newY };
      const currentWidth = imgRef.current.naturalWidth * currentZoom;
      const currentHeight = imgRef.current.naturalHeight * currentZoom;

      const maxX = Math.max(0, (currentWidth - cropSize) / 2);
      const maxY = Math.max(0, (currentHeight - cropSize) / 2);

      return {
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      };
    },
    [cropSize]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const rawX = e.clientX - dragStartRef.current.x;
      const rawY = e.clientY - dragStartRef.current.y;
      setOffset(clampOffset(rawX, rawY, zoom));
    },
    [isDragging, zoom, clampOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch event handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - offsetRef.current.x,
        y: e.touches[0].clientY - offsetRef.current.y,
      };
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const rawX = e.touches[0].clientX - dragStartRef.current.x;
      const rawY = e.touches[0].clientY - dragStartRef.current.y;
      setOffset(clampOffset(rawX, rawY, zoom));
    },
    [isDragging, zoom, clampOffset]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Adjust zoom and re-clamp
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(minZoom, Math.min(minZoom * 4, newZoom));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom));
  };

  const handleReset = () => {
    setZoom(minZoom);
    setOffset({ x: 0, y: 0 });
  };

  // Perform crop on canvas and return high-res cropped JPEG Blob
  const handleConfirmCrop = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const canvas = document.createElement("canvas");
      const OUTPUT_SIZE = 600; // 600x600 high-res output
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // In the DOM, the image center relative to container center is (offset.x, offset.y).
      // The crop window is centered at (0, 0) relative to container center.
      // cropWindow Top-Left in rendered image coordinates:
      const cropLeftInRendered = (img.naturalWidth * zoom) / 2 - offset.x - cropSize / 2;
      const cropTopInRendered = (img.naturalHeight * zoom) / 2 - offset.y - cropSize / 2;

      // Convert rendered coords to natural image coords:
      const sourceX = cropLeftInRendered / zoom;
      const sourceY = cropTopInRendered / zoom;
      const sourceSize = cropSize / zoom;

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw cropped area into output canvas
      ctx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(img.naturalWidth, sourceSize),
        Math.min(img.naturalHeight, sourceSize),
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      canvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            onCropComplete(blob);
          } else {
            alert("Failed to process cropped image. Please try again.");
          }
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Crop error:", err);
      setIsProcessing(false);
      alert("Failed to crop image.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-white flex items-center gap-2">
              Crop & Position Photo
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Drag to reposition, use slider to zoom in or out
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Canvas / Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="relative w-full h-72 sm:h-96 bg-black flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          {/* Rendered image to position and preview */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Source"
            onLoad={handleImageLoad}
            className="pointer-events-none select-none max-w-none transition-none"
            style={{
              display: imageLoaded ? "block" : "none",
              position: "absolute",
              top: "50%",
              left: "50%",
              width: imgRef.current ? `${imgRef.current.naturalWidth * zoom}px` : "auto",
              height: imgRef.current ? `${imgRef.current.naturalHeight * zoom}px` : "auto",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              willChange: "transform",
            }}
            draggable={false}
          />

          {!imageLoaded && (
            <div className="text-slate-400 text-xs flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              Loading image...
            </div>
          )}

          {/* Mask Overlay: Dark dim outside, transparent circle inside */}
          {imageLoaded && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer darkened vignette with transparent circular cut-out */}
              <div
                className="rounded-full ring-[9999px] ring-black/70 border-2 border-sky-400 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                style={{
                  width: `${cropSize}px`,
                  height: `${cropSize}px`,
                }}
              >
                {/* Crosshair guidelines inside crop area */}
                <div className="w-full h-full relative opacity-30">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/60 -translate-y-1/2" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/60 -translate-x-1/2" />
                </div>
              </div>
            </div>
          )}

          {/* Quick drag helper tag */}
          {imageLoaded && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] text-slate-300 pointer-events-none flex items-center gap-1.5 border border-white/10">
              <Move className="w-3 h-3 text-sky-400" /> Drag to move
            </div>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-3.5 sm:p-5 bg-slate-900 border-t border-slate-800 space-y-3 sm:space-y-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - minZoom * 0.2)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={minZoom}
              max={minZoom * 3.5}
              step={minZoom * 0.02}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + minZoom * 0.2)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-0.5 sm:ml-1"
              title="Reset Position & Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 text-center sm:text-left">
              Photo will be cropped to a clean circular avatar.
            </span>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={!imageLoaded || isProcessing}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cropping...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Crop & Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
