import React from 'react';

/**
 * ProductDetailSkeleton
 * Skeleton de carga animado de alta fidelidad que replica la disposición exacta
 * de 2 columnas de la página de detalle de producto para evitar layout shifts.
 */
export default function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8 space-y-10 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center space-x-2 text-sm">
        <div className="h-4 w-20 bg-gray-200 dark:bg-zinc-800 rounded-md" />
        <span className="text-gray-300">/</span>
        <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded-md" />
        <span className="text-gray-300">/</span>
        <div className="h-4 w-44 bg-gray-200 dark:bg-zinc-800 rounded-md" />
      </div>

      {/* Main Detail Grid Card Skeleton */}
      <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Gallery Skeleton */}
        <div className="space-y-4">
          {/* Main Image Stage */}
          <div className="w-full h-[340px] sm:h-[440px] md:h-[480px] lg:h-[520px] bg-gray-200 dark:bg-zinc-800 rounded-2xl" />

          {/* Thumbnails Row */}
          <div className="flex items-center space-x-3 pt-1">
            {[...Array(4)].map((_, idx) => (
              <div
                key={idx}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-zinc-800 rounded-xl flex-shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Right Column: Info & Actions Skeleton */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Meta Header: Brand & SKU */}
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded-md" />
            </div>

            {/* Product Title (2 lines) */}
            <div className="space-y-2 pt-1">
              <div className="h-8 w-3/4 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-8 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
            </div>

            {/* Price Box */}
            <div className="bg-gray-50 dark:bg-zinc-800/40 p-4 sm:p-5 rounded-lg border border-gray-100 flex items-center justify-between">
              <div className="h-10 w-44 bg-gray-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-5 w-28 bg-gray-200 dark:bg-zinc-800 rounded-md" />
            </div>

            {/* Highlighted Specs Mini-Cards */}
            <div className="h-24 w-full bg-gray-50 dark:bg-zinc-800/40 rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 border border-gray-100">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-full bg-gray-200 dark:bg-zinc-800 rounded-lg"
                />
              ))}
            </div>
          </div>

          {/* Action Controls */}
          <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-100">
            {/* Urgency Bar Skeleton */}
            <div className="space-y-1.5 pb-1">
              <div className="h-4 w-52 bg-gray-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-2 w-full bg-gray-200 dark:bg-zinc-800 rounded-full" />
            </div>

            {/* Quantity Selector + Add to Cart Button */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-28 bg-gray-200 dark:bg-zinc-800 rounded-xl flex-shrink-0" />
              <div className="h-12 flex-1 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
            </div>

            {/* WhatsApp Purchase Button */}
            <div className="h-12 w-full bg-gray-200 dark:bg-zinc-800 rounded-xl" />

            {/* Service Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="h-9 bg-gray-100 dark:bg-zinc-800/60 rounded-md border border-gray-100" />
              <div className="h-9 bg-gray-100 dark:bg-zinc-800/60 rounded-md border border-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
