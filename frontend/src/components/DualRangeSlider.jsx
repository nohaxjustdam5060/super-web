import React from 'react';

export default function DualRangeSlider({
  min = 0,
  max = 20000,
  step = 50,
  valueMin,
  valueMax,
  onChange
}) {
  const parsedMin = valueMin !== '' && valueMin !== undefined && !isNaN(valueMin)
    ? Math.max(min, Math.min(Number(valueMin), max))
    : min;

  const parsedMax = valueMax !== '' && valueMax !== undefined && !isNaN(valueMax)
    ? Math.min(max, Math.max(Number(valueMax), min))
    : max;

  // Calculate percentages for track highlighting
  const minPercent = Math.min(100, Math.max(0, ((parsedMin - min) / (max - min)) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((parsedMax - min) / (max - min)) * 100));

  const handleMinChange = (e) => {
    const val = Number(e.target.value);
    const newMin = Math.min(val, parsedMax - step);
    onChange(newMin <= min ? '' : String(newMin), valueMax);
  };

  const handleMaxChange = (e) => {
    const val = Number(e.target.value);
    const newMax = Math.max(val, parsedMin + step);
    onChange(valueMin, newMax >= max ? '' : String(newMax));
  };

  return (
    <div className="space-y-1.5 pt-2 pb-1">
      <div className="relative w-full h-5 flex items-center select-none touch-none">
        {/* Inactive Track */}
        <div className="absolute w-full h-1.5 bg-gray-200 rounded-full pointer-events-none" />

        {/* Active Highlight Track */}
        <div
          className="absolute h-1.5 bg-brand-red rounded-full pointer-events-none"
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(0, maxPercent - minPercent)}%`
          }}
        />

        {/* Min Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={parsedMin}
          onChange={handleMinChange}
          aria-label="Precio mínimo"
          className="range-slider-thumb absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none cursor-pointer focus:outline-none"
          style={{ zIndex: parsedMin > max - 100 ? 50 : 30 }}
        />

        {/* Max Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={parsedMax}
          onChange={handleMaxChange}
          aria-label="Precio máximo"
          className="range-slider-thumb absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none cursor-pointer focus:outline-none z-40"
        />
      </div>

      <div className="flex justify-between items-center text-[10px] font-extrabold text-gray-400 px-0.5">
        <span>S/ {min.toLocaleString()}</span>
        <span>S/ {max.toLocaleString()}</span>
      </div>
    </div>
  );
}
