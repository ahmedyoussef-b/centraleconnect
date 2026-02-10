// src/hooks/use-equipment-data.ts
import { useState, useEffect } from 'react';
import { Component, Equipment } from '@/types/db';
import { PrismaClient } from '@prisma/client';

// ⚠️ Pour le client-side, utilisez une API route au lieu de Prisma directement
export function useEquipmentData() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [components, setComponents] = useState<Component[]>([]);

  useEffect(() => {
    // Charger les données via une API route
    fetch('/api/equipments')
      .then(res => res.json())
      .then(data => setEquipments(data));
      
    fetch('/api/components')
      .then(res => res.json())
      .then(data => setComponents(data));
  }, []);

  const getComponentsByEquipmentId = (externalId: string): Component[] => {
    return components.filter(c => c.equipmentId === externalId);
  };

  const getEquipmentById = (externalId: string): Equipment | undefined => {
    return equipments.find(e => e.externalId === externalId);
  };

  return {
    equipments,
    components,
    getComponentsByEquipmentId,
    getEquipmentById,
  };
}