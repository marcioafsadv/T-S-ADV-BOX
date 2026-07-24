'use client';

import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  maxHeight?: string;
}

export default function Logo({ className = "h-20 w-20", showText = true, maxHeight = "220px" }: LogoProps) {
  const [processedSrc, setProcessedSrc] = useState<string>('');

  const logoFile = showText ? '/logo1.jpg' : '/logo2.jpg';

  useEffect(() => {
    // Reset state before loading new logo type
    setProcessedSrc('');

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoFile;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessedSrc(logoFile);
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Increased threshold to 78 to successfully clear out grey vignette corners
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // If the pixel is dark grey/black
          if (r < 78 && g < 78 && b < 78) {
            data[i + 3] = 0; // Make transparent
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setProcessedSrc(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error("Erro no processamento da imagem via canvas:", e);
        setProcessedSrc(logoFile); // fallback to original file
      }
    };

    img.onerror = () => {
      setProcessedSrc(logoFile); // fallback
    };
  }, [logoFile]);

  // While loading, display a placeholder to keep layout stable and elegant
  if (!processedSrc) {
    return (
      <div className="flex items-center justify-center">
        <div 
          className="animate-pulse bg-slate-800/40 rounded-lg"
          style={showText ? { height: maxHeight, width: '280px' } : { height: '40px', width: '40px' }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <img
        src={processedSrc}
        alt="Torres & Silva"
        className={showText ? "max-w-full h-auto object-contain" : `${className} object-contain rounded-full`}
        style={showText ? { maxHeight: maxHeight } : undefined}
      />
    </div>
  );
}
