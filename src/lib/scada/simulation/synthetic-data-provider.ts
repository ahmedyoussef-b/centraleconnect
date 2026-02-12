// src/lib/scada/simulation/synthetic-data-provider.ts
/**
 * Moteur de données synthétiques pour le mode démo côté client.
 * Ce module est un fallback si le backend Tauri/Rust n'est pas disponible.
 */

export interface SyntheticDataOptions {
    intervalMs?: number;
    fluctuation?: number;
}

export class SyntheticDataProvider {
    private intervalId: NodeJS.Timeout | null = null;
    private options: Required<SyntheticDataOptions>;
    private baseValues = {
        TG1: 132.0,
        TG2: 135.0,
        TV: 180.0,
    };

    constructor(options?: SyntheticDataOptions) {
        this.options = {
            intervalMs: options?.intervalMs ?? 2000,
            fluctuation: options?.fluctuation ?? 0.5,
        };
    }

    /**
     * Démarre la génération de données et appelle le callback fourni.
     * @param onData - La fonction à appeler à chaque nouvelle donnée générée.
     */
    start(onData: (data: any) => void): void {
        if (this.intervalId) {
            this.stop();
        }

        this.intervalId = setInterval(() => {
            // Simuler des fluctuations réalistes
            this.baseValues.TG1 += (Math.random() - 0.5) * this.options.fluctuation;
            this.baseValues.TG2 += (Math.random() - 0.5) * this.options.fluctuation;
            this.baseValues.TV += (Math.random() - 0.5) * this.options.fluctuation * 2;

            // S'assurer que les valeurs restent dans une plage plausible
            this.baseValues.TG1 = Math.max(120, Math.min(145, this.baseValues.TG1));
            this.baseValues.TG2 = Math.max(125, Math.min(150, this.baseValues.TG2));
            this.baseValues.TV = Math.max(160, Math.min(200, this.baseValues.TV));
            
            const dataPoint = {
                timestamp: new Date().toISOString(),
                source: "DEMO_CLIENT",
                values: {
                    TG1: this.baseValues.TG1 + (Math.random() - 0.5) * 0.2,
                    TG2: this.baseValues.TG2 + (Math.random() - 0.5) * 0.2,
                    TV: this.baseValues.TV + (Math.random() - 0.5) * 0.5,
                }
            };
            onData(dataPoint);
        }, this.options.intervalMs);
    }

    /**
     * Arrête la génération de données.
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
