// Placeholder for src/app/(main)/vision/training/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrainingPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Labellisation des données (Admin)</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Cette page permettra l'entraînement et la labellisation des modèles de détection.</p>
            </CardContent>
        </Card>
    );
}
