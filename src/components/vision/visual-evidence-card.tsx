// src/components/vision/visual-evidence-card.tsx
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Document } from '@/types/db';

interface Props {
    evidence: Document;
    onClick: () => void;
}

export function VisualEvidenceCard({ evidence, onClick }: Props) {
  const hasAnomaly = evidence.analysis?.anomalies && evidence.analysis.anomalies.length > 0;
  const mainAnomaly = hasAnomaly ? evidence.analysis.anomalies[0] : null;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
      onClick={onClick}
    >
      <div className="relative aspect-video">
        <img
          src={evidence.imageData} // Use base64 data directly
          alt={evidence.description || 'Evidence Thumbnail'}
          className="w-full h-full object-cover rounded-t-lg transition-transform group-hover:scale-105"
        />
        
        {/* Badge anomalie */}
        {mainAnomaly && (
          <div className={cn(
            "absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold shadow-md",
            mainAnomaly.severity === 'CRITIQUE' && "bg-red-600 text-white",
            mainAnomaly.severity === 'URGENT' && "bg-orange-500 text-white",
            mainAnomaly.severity === 'AVERTISSEMENT' && "bg-yellow-500 text-black"
          )}>
            {mainAnomaly.type}
          </div>
        )}
        
        {/* Équipement associé */}
        {evidence.equipmentId && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
            {evidence.equipmentId}
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium">
              {format(new Date(evidence.createdAt), 'd MMM yyyy, HH:mm', { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground">
              Par {evidence.createdBy?.name || 'Opérateur'}
            </p>
          </div>
          <Badge variant="outline">
            {evidence.annotations?.length || 0} annotations
          </Badge>
        </div>
        
        {/* Résumé analyse IA */}
        {hasAnomaly && (
          <div className="mt-2 text-xs text-muted-foreground">
            {evidence.analysis?.anomalies?.map((a, i) => (
              <span key={i} className="mr-2">
                • {a.type} ({Math.round(a.confidence)}%)
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
