import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Reusable ProductImage component with fallback placeholder
 * When `src` is missing, empty, or fails to load (HTTP 404/broken link),
 * it renders a clean neutral dark slate container with Lucide ImageOff icon
 * and a discreet "Sin imagen disponible" text.
 */
export default function ProductImage({
  src,
  alt = 'Producto',
  className = 'w-full h-full object-contain',
  containerClassName = '',
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showText = true,
  fallbackText = 'Sin imagen disponible',
  loading = 'lazy'
}) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isValidSrc = typeof src === 'string' && src.trim().length > 0;

  if (!isValidSrc || hasError) {
    const iconSizes = {
      xs: 'w-4 h-4',
      sm: 'w-5 h-5',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16'
    };

    const textSizes = {
      xs: 'text-[8px]',
      sm: 'text-[9px]',
      md: 'text-[10px] sm:text-xs',
      lg: 'text-xs sm:text-sm',
      xl: 'text-sm font-semibold'
    };

    const currentIconSize = iconSizes[size] || iconSizes.md;
    const currentTextSize = textSizes[size] || textSizes.md;

    return (
      <div
        className={`w-full h-full bg-slate-800 text-slate-400 rounded-md flex flex-col items-center justify-center p-2.5 select-none transition-colors ${containerClassName}`}
        title="Sin imagen disponible"
      >
        <ImageOff
          className={`${currentIconSize} text-slate-400 mb-1 flex-shrink-0`}
          strokeWidth={1.5}
        />
        {showText && (
          <span className={`${currentTextSize} font-medium text-slate-400 text-center tracking-tight leading-tight line-clamp-2`}>
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
    />
  );
}
