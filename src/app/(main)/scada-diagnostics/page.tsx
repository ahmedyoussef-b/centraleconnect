
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Wrench } from "lucide-react";

export default function ScadaDiagnosticsPage() {
    return (
        <div className="space-y-4">
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity />
                Diagnostic SCADA
            </CardTitle>
            <CardDescription>
                Surveillance de la connexion temps réel, de la source de données et des données brutes.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Fonctionnalité en cours de développement</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        L'intégration complète avec le bus de données SCADA temps réel (OPC UA) est prévue pour une version future.
                    </p>
                </div>
            </CardContent>
        </Card>
        </div>
    );
}
