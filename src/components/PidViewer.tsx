'use client';
// ============================================
// FICHIER : src/components/PidViewer.tsx
// ============================================
// 🔒 SÉCURITÉ : Aucun appel réseau pour les éléments critiques
// ⚡ PERFORMANCE : 60 FPS pour les interactions
// 📏 CONFORMITÉ : IEC 61511-1 §11.3

import type { Component } from '@/types/db';
import { useComponentInteraction } from '@/lib/interactions';

export default function PidViewer({ 
  components, 
  onComponentClick 
}: { 
  components: Component[]; 
  onComponentClick?: (component: Component) => void;
}) {
  const { isHovered, handleMouseEnter, handleMouseLeave } = useComponentInteraction();
  
  return (
    <div className="relative bg-slate-900 border-2 border-slate-700 rounded-lg overflow-hidden">
      {/* Base schematic image with enhanced visibility */}
      <img 
        src="/assets/synoptics/IMG_20260207_071515_602.svg" 
        alt="Sousse B Control Panel"
        className="w-full h-auto brightness-125 contrast-110 saturate-105"
        aria-label="Interactive P&ID diagram"
      />
      
      {/* Interactive component overlays using SVG for precise shapes */}
      <svg 
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {components.map((component) => (
          component.ui?.path && (
            <g key={component.id} className="pointer-events-auto">
              {/* Component path (precise shape) */}
              <path
                d={component.ui.path}
                fill="none"
                stroke={component.ui.color}
                strokeWidth="2"
                strokeOpacity="0.3"
                className={isHovered[component.id] ? 'animate-pulse' : ''}
                onMouseEnter={() => handleMouseEnter(component.id)}
                onMouseLeave={() => handleMouseLeave(component.id)}
                onClick={() => onComponentClick?.(component)}
              />
              
              {/* Hover highlight effect */}
              {isHovered[component.id] && (
                <path
                  d={component.ui.path}
                  fill="none"
                  stroke={component.ui.color}
                  strokeWidth="3.5"
                  strokeOpacity="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              
              {/* Criticality indicator */}
              {component.criticality === 'critical' && component.ui.criticalityX && component.ui.criticalityY && (
                <circle
                  cx={component.ui.criticalityX}
                  cy={component.ui.criticalityY}
                  r="6"
                  fill="#E53E3E"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )
        ))}
      </svg>
      
      {/* Interactive legend with proper contrast */}
      <div className="absolute bottom-4 right-4 bg-slate-800/95 p-3 rounded-lg border border-slate-600 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-white text-xs">Critique</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-white text-xs">Haut risque</span>
        </div>
      </div>
    </div>
  );
}
