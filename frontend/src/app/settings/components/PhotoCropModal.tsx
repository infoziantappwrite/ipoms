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
  const [naturalSize, setNaturalSize] = useState({ width: 280, height: 280 });

  // Viewport size in pixels
  const VIEWPORT_SIZE = 280;

  // Load image & determine natural dimensions
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
    };
  }, [imageSrc]);

  // Base dimensions computed using 'cover' scaling
  const baseScale = Math.max(
    VIEWPORT_SIZE / naturalSize.width,
    VIEWPORT_SIZE / naturalSize.height
  );
  const baseWidth = naturalSize.width * baseScale;
  const baseHeight = naturalSize.height * baseScale;

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

  // Exact 1:1 Pixel-Perfect WYSIWYG Canvas Crop
  const handleApplyCrop = useCallback(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    // High-resolution output (600 x 600)
    const outputSize = 600;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scaleFactor = outputSize / VIEWPORT_SIZE;

    // Center canvas coordinate system
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Render exact image frame with pan offset and zoom
    const drawWidth = baseWidth * scaleFactor * zoom;
    const drawHeight = baseHeight * scaleFactor * zoom;
    const drawX = (offset.x * scaleFactor) - (drawWidth / 2);
    const drawY = (offset.y * scaleFactor) - (drawHeight / 2);

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Export clean JPEG / WebP data URL
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCropComplete(croppedDataUrl);
  }, [baseWidth, baseHeight, offset, rotation, zoom, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn select-none">
      <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200/90 p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Crop Profile Photo</h3>
              <p className="text-[11px] text-slate-500">Drag to position, scroll or slide to zoom</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Interactive Crop Viewport Canvas Area (Exact 280x280 Square) */}
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
            className="w-[280px] h-[280px] rounded-3xl bg-slate-950 overflow-hidden relative border-2 border-primary flex items-center justify-center cursor-grab active:cursor-grabbing shadow-inner"
          >
            {imageLoaded && (
              <div
                style={{
                  width: `${baseWidth}px`,
                  height: `${baseHeight}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
                className="pointer-events-none shrink-0 flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt="Crop Preview"
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />
              </div>
            )}

            {/* Square Rounded Mask Guide (Matches Profile Card Shape Exactly) */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]" />

            {/* Silhouette & Alignment Grid Guide */}
            {showGuide && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-70">
                {/* Subtle Grid Crosshairs */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>
                {/* Head circle */}
                <div className="w-28 h-32 rounded-full border border-dashed border-white/80 mt-2 shadow-sm" />
                {/* Shoulder curve */}
                <div className="w-48 h-16 rounded-t-full border-t border-dashed border-white/80 -mt-2 shadow-sm" />
              </div>
            )}

            {/* Pan Drag Indicator */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] flex items-center gap-1 pointer-events-none font-medium backdrop-blur-xs">
              <Move size={10} /> Drag to Pan
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.15))}
              className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
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
              className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>

            <span className="font-mono text-[11px] text-slate-600 font-bold w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer shadow-xs"
                title="Rotate 90 degrees"
              >
                <RotateCw size={12} />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer shadow-xs"
                title="Reset Position"
              >
                <RefreshCw size={12} />
                <span>Reset</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer shadow-xs ${
                showGuide
                  ? 'bg-blue-50 border-blue-200 text-primary'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
              title="Toggle Face & Shoulder alignment guide"
            >
              <Sparkles size={12} />
              <span>Guide {showGuide ? 'On' : 'Off'}</span>
            </button>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Check size={14} />
            <span>Apply & Save Crop</span>
          </button>
        </div>

      </div>
    </div>
  );
}
