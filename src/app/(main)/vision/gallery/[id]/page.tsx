// Placeholder for src/app/(main)/vision/gallery/[id]/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GalleryDetailPage({ params }: { params: { id: string } }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Détail de l'image : {params.id}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Cette page affichera les détails d'une preuve visuelle et permettra l'annotation.</p>
            </CardContent>
        </Card>
    );
}
