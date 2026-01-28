'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon } from 'lucide-react';
import type { FunctionalNode } from '@/types/db';

import PidViewer from '@/components/PidViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// The P&ID node we are testing
const TEST_NODE_ID = "B2.LUB.TPF";

// Mock SCADA data generation functions for demonstration
const MOCK_SCADA_GENERATORS: Record<string, () => number> = {
    'LUB.TEMP': () => 45 + Math.random() * 30,       // Normal < 60, Warning 60-70, Critical > 70
    'LUB.FILTER.DP': () => 0.5 + Math.random() * 2,  // Normal < 1.5, Warning 1.5-2.0, Critical > 2.0
    'LUB.PRESSURE.IN': () => 5 + Math.random() * 2,  // Not alarmed in this demo
};

// Simplified thresholds for this demo
const DEMO_THRESHOLDS: Record<string, { warning: number, critical: number }> = {
    'LUB.TEMP': { warning: 60, critical: 70 },
    'LUB.FILTER.DP': { warning: 1.5, critical: 2.0 },
};

export default function TestPage() {
    const [highlightParameters, setHighlightParameters] = useState<string[]>([]);
    const [scadaData, setScadaData] = useState<Record<string, number>>({});
    const { toast } = useToast();
    const router = useRouter();

    // Simulate real-time data updates
    useEffect(() => {
        const interval = setInterval(() => {
            const newScadaData: Record<string, number> = {};
            const newHighlights: string[] = [];
            
            for (const key in MOCK_SCADA_GENERATORS) {
                const value = MOCK_SCADA_GENERATORS[key]();
                newScadaData[key] = value;
                
                const thresholds = DEMO_THRESHOLDS[key];
                if (thresholds) {
                    // Highlight if value exceeds the warning threshold
                    if (value > thresholds.warning) {
                        newHighlights.push(key);
                    }
                }
            }
            setScadaData(newScadaData);
            setHighlightParameters(newHighlights);
        }, 2000); // Update every 2 seconds

        return () => clearInterval(interval);
    }, []);

    const handleHotspotClick = (node: Partial<FunctionalNode>) => {
        toast({
            title: "Navigation P&ID → Détails",
            description: `Clic sur ${node.name || 'un composant'}. ID: ${node.external_id}. Navigation vers la page de détails de l'équipement...`,
        });
        if (node.external_id) {
            router.push(`/equipments/${encodeURIComponent(node.external_id)}`);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon />
                        Démonstration de Navigation SCADA ↔ P&ID
                    </CardTitle>
                    <CardDescription>
                        Cette page démontre la navigation bidirectionnelle. Les anomalies SCADA (simulées) surlignent les
                        éléments P&ID en temps réel. Un clic sur un hotspot P&ID déclenche une action (ici, une notification).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert className="mb-4">
                        <AlertTitle>Données SCADA Simulées en Temps Réel</AlertTitle>
                        <AlertDescription>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm pt-2">
                                {Object.entries(scadaData).map(([key, value]) => {
                                    const thresholds = DEMO_THRESHOLDS[key];
                                    const color = thresholds && value > thresholds.critical ? 'text-destructive font-bold' : thresholds && value > thresholds.warning ? 'text-yellow-500 font-bold' : 'text-foreground';
                                    return (
                                        <div key={key}>
                                            <span className="font-semibold">{key}: </span>
                                            <span className={color}>{value.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                           </div>
                        </AlertDescription>
                    </Alert>

                    <h2 className="text-xl font-semibold mb-2">Schéma P&ID : Lubrification & Filtration (B2.LUB.TPF)</h2>
                    <p className="text-muted-foreground mb-4">
                        Les hotspots sont surlignés si une valeur simulée dépasse son seuil d'avertissement. Cliquez sur un élément pour simuler la navigation vers sa page de détails.
                    </p>
                    <PidViewer
                        externalId={TEST_NODE_ID}
                        highlightParameters={highlightParameters}
                        onHotspotClick={handleHotspotClick}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
