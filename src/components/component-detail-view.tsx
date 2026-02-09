'use client';

import PidViewer from '@/components/PidViewer';
import type { Component } from '@/types/db';

export function ComponentDetailView({ component }: { component: Component }) {
  return (
    <div className="bg-slate-950 min-h-screen p-6">
      {/* Critical header */}
      <div
        className={`mb-6 p-4 rounded-lg border-l-4 ${
          component.criticality === 'critical'
            ? 'border-red-500 bg-red-950/20'
            : component.criticality === 'high'
            ? 'border-yellow-500 bg-yellow-950/20'
            : 'border-slate-500 bg-slate-950/20'
        }`}
      >
        <h1 className="text-2xl font-bold text-white">{component.name}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${
              component.criticality === 'critical'
                ? 'bg-red-500/20 text-red-300'
                : component.criticality === 'high'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-slate-500/20 text-slate-300'
            }`}
          >
            {component.criticality.toUpperCase()}
          </span>
          <span className="text-slate-400">{component.type}</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Interactive P&ID */}
        <div className="lg:col-span-2">
          <PidViewer components={[component]} />

          {/* Quick actions */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors"
              onClick={() => {
                /* Procédure de démarrage */
              }}
            >
              Démarrage
            </button>
            <button
              className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors"
              onClick={() => {
                /* Procédure d'arrêt */
              }}
            >
              Arrêt
            </button>
          </div>
        </div>

        {/* Right column: Component details */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-2">
              Caractéristiques techniques
            </h3>
            <ul className="text-slate-300 space-y-1">
              <li>
                <span className="text-slate-400">Description:</span>{' '}
                {component.description}
              </li>
              <li>
                <span className="text-slate-400">Équipement:</span>{' '}
                {component.equipmentId}
              </li>
              <li>
                <span className="text-slate-400">Référence:</span>{' '}
                {component.externalId}
              </li>
            </ul>
          </div>

          {/* Critical procedures */}
          {component.criticality !== 'low' && (
            <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-lg">
              <h3 className="text-red-400 font-bold mb-2">
                Procédures critiques
              </h3>
              <ul className="text-red-300 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span>Procédure de remède pour les alarmes critiques</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">⏱️</span>
                  <span>
                    Temps de réponse maximal: {component.maxResponseTime}{' '}
                    secondes
                  </span>
                </li>
              </ul>
            </div>
          )}

          {/* Document access */}
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-2">Documents associés</h3>
            <ul className="text-slate-300 space-y-1">
              <li>
                <a href="#" className="text-blue-400 hover:underline">
                  Fiche technique (PDF)
                </a>
              </li>
              <li>
                <a href="#" className="text-blue-400 hover:underline">
                  Schéma P&ID détaillé
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
