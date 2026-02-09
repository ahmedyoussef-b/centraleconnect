'use client';
import { useState } from 'react';
import type { Component } from '@/types/db';

// Placeholder data and functions to make the component valid
const components: Component[] = [];
const updateComponentPath = (path: string) => { console.log('updateComponentPath:', path) };
const saveShape = () => { console.log('saveShape'); };

export default function ShapeEditor() {
    const [activeComponent, setActiveComponent] = useState<Component | null>(null);
    
    return (
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
        <h3 className="text-white font-bold mb-3">Éditeur de Formes P&ID</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Visual editor */}
          <div className="relative">
            <img 
              src="/assets/synoptics/IMG_20260207_071515_602.svg" 
              alt="Schematic for shape editing" 
              className="brightness-125 contrast-110"
            />
            {activeComponent && activeComponent.ui?.path && (
              <svg className="absolute top-0 left-0 w-full h-full">
                <path
                  d={activeComponent.ui.path}
                  fill="none"
                  stroke="#4299E1"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>
            )}
          </div>
          
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1">Sélectionnez un composant</label>
              <select 
                className="w-full bg-slate-700 text-white p-2 rounded"
                onChange={(e) => {
                  const component = components.find(c => c.id === e.target.value);
                  setActiveComponent(component || null);
                }}
              >
                <option value="">Sélectionner</option>
                {components.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.type}
                  </option>
                ))}
              </select>
            </div>
            
            {activeComponent && activeComponent.ui?.path && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Éditeur de chemin</label>
                  <textarea
                    value={activeComponent.ui.path}
                    onChange={(e) => updateComponentPath(e.target.value)}
                    className="w-full bg-slate-700 text-white p-2 rounded font-mono h-32"
                    placeholder="M120,85 L120,145 L260,145 L260,85 Z"
                  />
                </div>
                
                <button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                  onClick={saveShape}
                >
                  Enregistrer la forme
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
