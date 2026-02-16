// src/components/vision/visual-evidence-card.tsx
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Document } from '@/types/db';
import { IndustrialLogger, LogLevel } from '@/lib/logger';

interface Props {
    evidence: Document;
    onClick: () => void;
}

export function VisualEvidenceCard({ evidence, onClick }: Props) {
  const logger = IndustrialLogger.getInstance();

  // CORRECTION: Vérifications de sécurité avec optional chaining et nullish coalescing
  const hasAnomaly = evidence.analysis?.anomalies && 
                     evidence.analysis.anomalies.length > 0;
  
  const mainAnomaly = hasAnomaly ? evidence.analysis?.anomalies?.[0] : null;

  // Gestionnaire d'erreur pour le chargement d'image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    logger.log(LogLevel.ERROR, 'Failed to load evidence image', {
      documentId: evidence.id,
      equipmentId: evidence.equipmentId
    });
    e.currentTarget.src = '/placeholder-image.jpg'; // Image de fallback
  };

  // Formater la date de création
  const formattedDate = evidence.createdAt 
    ? format(new Date(evidence.createdAt), 'd MMM yyyy, HH:mm', { locale: fr })
    : 'Date inconnue';

  // Nom de l'opérateur
  const operatorName = evidence.createdBy?.name || 'Opérateur inconnu';

  // Nombre d'annotations
  const annotationCount = evidence.annotations?.length || 0;

  // Déterminer la couleur du badge selon la sévérité
  const getSeverityColor = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITIQUE':
        return "bg-red-600 text-white";
      case 'URGENT':
        return "bg-orange-500 text-white";
      case 'AVERTISSEMENT':
        return "bg-yellow-500 text-black";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted">
        {evidence.imageData ? (
          <img
            src={evidence.imageData}
            alt={evidence.description || 'Evidence visuelle'}
            className="w-full h-full object-cover rounded-t-lg transition-transform group-hover:scale-105"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Aperçu non disponible
          </div>
        )}
        
        {/* Badge anomalie */}
        {mainAnomaly && (
          <div className={cn(
            "absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold shadow-md z-10",
            getSeverityColor(mainAnomaly.severity)
          )}>
            {mainAnomaly.type || 'Anomalie détectée'}
          </div>
        )}
        
        {/* Équipement associé */}
        {evidence.equipmentId && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono z-10">
            {evidence.equipmentId}
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium">
              {formattedDate}
            </p>
            <p className="text-xs text-muted-foreground">
              Par {operatorName}
            </p>
          </div>
          {annotationCount > 0 && (
            <Badge variant="outline">
              {annotationCount} annotation{annotationCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {/* Résumé analyse IA */}
        {evidence.analysis && (
          <div className="mt-2 space-y-1">
            {evidence.analysis.anomalies && evidence.analysis.anomalies.length > 0 ? (
              <div className="text-xs text-muted-foreground">
                {evidence.analysis.anomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span>{anomaly.type || 'Anomalie'} </span>
                    {anomaly.confidence && (
                      <span className="text-muted-foreground">
                        ({Math.round(anomaly.confidence)}% de confiance)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Analyse IA : Aucune anomalie détectée
              </p>
            )}
            
            {/* Métadonnées de l'analyse */}
            {evidence.analysis.metadata && (
              <div className="text-xs text-muted-foreground border-t pt-1 mt-1">
                <span className="font-medium">Analyse: </span>
                {evidence.analysis.metadata.modelName || 'Modèle par défaut'} 
                {evidence.analysis.metadata.processingTime && (
                  <span> • {evidence.analysis.metadata.processingTime}ms</span>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Description si présente */}
        {evidence.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {evidence.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}