// src/components/PidViewer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Component } from '@/types/db';
import { useEquipmentData } from '@/hooks/use-equipment-data';

interface PidViewerProps {
  // Option 1 : externalId pour charger les composants dynamiquement
  externalId?: string;
  
  // Option 2 : composants déjà chargés (pour réutilisation)
  components?: Component[];
  
  onComponentClick?: (component: Component) => void;
}

export default function PidViewer({ 
  externalId, 
  components: initialComponents, 
  onComponentClick 
}: PidViewerProps) {
  const [components, setComponents] = useState<Component[]>(initialComponents || []);
  const { getComponentsByEquipmentId } = useEquipmentData();

  // Charger les composants si externalId est fourni
  useEffect(() => {
    if (externalId) {
      const loadedComponents = getComponentsByEquipmentId(externalId);
      setComponents(loadedComponents);
    }
  }, [externalId, getComponentsByEquipmentId]);

  if (!components || components.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Aucun composant trouvé
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Votre implémentation de visualisation P&ID ici */}
      {components.map((component) => (
        <div
          key={component.id}
          onClick={() => onComponentClick?.(component)}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          {/* Affichage du composant */}
          <div>{component.name}</div>
        </div>
      ))}
    </div>
  );
}