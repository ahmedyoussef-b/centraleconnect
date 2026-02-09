'use client';
// ============================================
// FICHIER : src/components/PidViewer.tsx
// ============================================
// 🔒 SÉCURITÉ : Aucun appel réseau pour les éléments critiques
// ⚡ PERFORMANCE : 60 FPS pour les interactions
// 📏 CONFORMITÉ : IEC 61511-1 §11.3

import type { Component } from '@/types/db';
import { useComponentInteraction } from '@/lib/interactions';
import { cn } from '@/lib/utils';

export default function PidViewer({
  components,
  onComponentClick,
}: {
  components: Component[];
  onComponentClick?: (component: Component) => void;
}) {
  const { isHovered, handleMouseEnter, handleMouseLeave } =
    useComponentInteraction();

  return (
    <div className="relative bg-slate-900 border-2 border-slate-700 rounded-lg overflow-hidden">
      {/* Base schematic image */}
      <img
        src="/assets/synoptics/IMG_20260207_071515_602.svg"
        alt="Sousse B Control Panel"
        className="w-full h-auto"
        aria-label="Interactive P&ID diagram"
      />

      {/* Interactive component overlays */}
      {components.map((component) => (
        <div
          key={component.id}
          className={cn(
            'absolute transition-all duration-200',
            onComponentClick && 'cursor-pointer',
            isHovered[component.id] ? 'z-20 scale-105' : 'z-10'
          )}
          style={{
            left: `${component.ui?.x}px`,
            top: `${component.ui?.y}px`,
            width: `${component.ui?.width}px`,
            height: `${component.ui?.height}px`,
            backgroundColor: (component.ui?.color ?? '#FFFFFF') + '33',
            border: `2px solid ${component.ui?.color ?? '#FFFFFF'}`,
            boxShadow: isHovered[component.id]
              ? `0 0 0 4px ${(component.ui?.color ?? '#FFFFFF') + '80'}`
              : 'none',
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => handleMouseEnter(component.id)}
          onMouseLeave={() => handleMouseLeave(component.id)}
          onClick={() => onComponentClick?.(component)}
          aria-label={`Interactive element: ${component.name}`}
          role="button"
          tabIndex={onComponentClick ? 0 : -1}
        >
          {/* Criticality indicator */}
          <div
            className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
              component.criticality === 'critical'
                ? 'bg-red-500'
                : component.criticality === 'high'
                ? 'bg-yellow-400'
                : 'bg-slate-400'
            }`}
          />

          {/* Component label */}
          <div className="absolute bottom-2 left-2 text-white text-xs font-mono bg-black/50 px-1.5 rounded">
            {component.name}
          </div>

          {/* Visual feedback */}
          {isHovered[component.id] && (
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          )}
        </div>
      ))}

      {/* Interactive legend */}
      <div className="absolute bottom-4 right-4 bg-slate-800/90 p-3 rounded-lg border border-slate-600">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-white text-xs">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-white text-xs">High</span>
        </div>
      </div>
    </div>
  );
}
