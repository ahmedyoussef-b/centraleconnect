// src/lib/scada/hooks/use-scada-data.ts
'use client';
import { useScadaContext } from '../providers/scada-provider';
// Ré-exporter pour un accès facile depuis les composants consommateurs
export { ScadaStatus as ScadaConnectionStatus } from '../interfaces';

/**
 * Hook pour accéder aux données SCADA temps réel.
 * Doit être utilisé à l'intérieur d'un <ScadaProvider>.
 * @returns {object} - L'état actuel des données SCADA.
 * @returns {Record<string, number>} .latestData - Les dernières valeurs reçues.
 * @returns {any[]} .history - L'historique récent des valeurs.
 * @returns {ScadaConnectionStatus} .status - L'état de la connexion temps réel.
 */
export function useScadaData() {
    return useScadaContext();
}
