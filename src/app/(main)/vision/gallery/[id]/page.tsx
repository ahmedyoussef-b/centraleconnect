// Placeholder for src/app/(main)/vision/gallery/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GalleryDetailPage() {
    const params = useParams();
    const id = params.id as string;
    return (
        <Card>
            <CardHeader>
                <CardTitle>Détail de l'image : {id}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Cette page affichera les détails d'une preuve visuelle et permettra l'annotation.</p>
            </CardContent>
        </Card>
    );
}
