'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, User, RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export function PhotoCropModal({ imageSrc, onCropComplete, onCancel }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGuide, setShowGuide] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
    };
  }, [imageSrc]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support for Mobile / Trackpad
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 4));
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset framing
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Execute Canvas Crop
  const handleApplyCrop = useCallback(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    // Output crop size (512 x 512 for high resolution avatar)
    const outputSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Viewport diameter in the UI is 280px
    const viewportSize = 280;
    const scaleFactor = outputSize / viewportSize;

    // Center canvas origin
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate scaled image size based on natural dimensions
    const baseScale = Math.max(viewportSize / img.naturalWidth, viewportSize / img.naturalHeight);
    const drawWidth = img.naturalWidth * baseScale * zoom * scaleFactor;
    const drawHeight = img.naturalHeight * baseScale * zoom * scaleFactor;

    // Account for user pan offset
    const drawX = offset.x * scaleFactor - drawWidth / 2;
    const drawY = offset.y * scaleFactor - drawHeight / 2;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Export as high-quality WebP / JPEG
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedDataUrl);
  }, [offset, rotation, zoom, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn select-none">
      <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200/90 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.04)]">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">Crop Face & Shoulder Portrait</h3>
              <p className="text-[11px] text-fg-subtle">Drag to position, scroll or slide to zoom</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-sunken text-fg-subtle hover:text-fg border border-border flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Interactive Crop Viewport Canvas Area */}
        <div className="flex flex-col items-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="w-[280px] h-[280px] rounded-2xl bg-slate-100 overflow-hidden relative border-2 border-dashed border-slate-300 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[inset_2px_2px_6px_rgba(0,0,0,0.06)]"
          >
            {imageLoaded && (
              <div
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
                className="pointer-events-none flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt="Crop Preview"
                  className="max-w-none select-none"
                  style={{
                    maxHeight: '280px',
                    maxWidth: '280px',
                    objectFit: 'contain',
                  }}
                  draggable={false}
                />
              </div>
            )}

            {/* Circular & Passport Outline Mask with Soft Scrim */}
            <div className="absolute inset-0 pointer-events-none border-[3px] border-primary rounded-full shadow-[0_0_0_9999px_rgba(241,245,249,0.85)]" />

            {/* Face & Shoulder Silhouette Guide */}
            {showGuide && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-70">
                {/* Head circle */}
                <div className="w-24 h-28 rounded-full border border-dashed border-primary mt-4" />
                {/* Shoulder curve */}
                <div className="w-48 h-20 rounded-t-full border-t border-dashed border-primary -mt-2" />
                <span className="absolute bottom-3 text-[10px] text-primary font-bold bg-white/90 shadow-sm border border-primary/20 px-2 py-0.5 rounded-full font-mono">
                  Face & Shoulder Zone
                </span>
              </div>
            )}

            {/* Pan Drag Indicator */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-white/90 shadow-sm border border-border text-fg-subtle text-[10px] flex items-center gap-1 pointer-events-none font-medium">
              <Move size={10} /> Drag
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="space-y-3 bg-surface-sunken p-3.5 rounded-2xl border border-border">
          
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.15))}
              className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-raised text-fg border border-border flex items-center justify-center cursor-pointer transition-colors shadow-sm"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>

            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-primary bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3.5, prev + 0.15))}
              className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-raised text-fg border border-border flex items-center justify-center cursor-pointer transition-colors shadow-sm"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>

            <span className="font-mono text-[11px] text-fg-muted font-bold w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-sunken text-fg text-[11px] font-semibold flex items-center gap-1.5 border border-border transition-colors cursor-pointer shadow-sm"
                title="Rotate 90 degrees"
              >
                <RotateCw size={12} />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-sunken text-fg text-[11px] font-semibold flex items-center gap-1.5 border border-border transition-colors cursor-pointer shadow-sm"
                title="Reset Position"
              >
                <RefreshCw size={12} />
                <span>Reset</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer shadow-sm ${
                showGuide
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-surface border-border text-fg-subtle hover:text-fg'
              }`}
              title="Toggle Face & Shoulder alignment guide"
            >
              <Sparkles size={12} />
              <span>Guide {showGuide ? 'On' : 'Off'}</span>
            </button>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition-all active:scale-[0.98] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Check size={14} />
            <span>Crop & Save Photo</span>
          </button>
        </div>

      </div>
    </div>
  );
}
