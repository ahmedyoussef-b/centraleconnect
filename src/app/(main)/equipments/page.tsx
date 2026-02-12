'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEquipments } from '@/lib/db-service';
import type { Equipment } from '@/types/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Cog } from 'lucide-react';


export default function EquipmentsPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getEquipments();
        setEquipments(data);
      } catch (error) {
        console.error('Erreur chargement équipements:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database /> Liste des Équipements</CardTitle>
            <CardDescription>Chargement des données depuis la source locale ou distante...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database /> Liste des Équipements</CardTitle>
        <CardDescription>Liste de tous les équipements de la base de données. Cliquez sur un élément pour voir les détails.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {equipments.map(eq => (
            <div
              key={eq.externalId}
              className="flex items-center gap-4 p-3 border rounded-md cursor-pointer hover:bg-muted transition-colors"
              onClick={() => router.push(`/equipments/${encodeURIComponent(eq.externalId)}`)}
            >
                <Cog className="h-6 w-6 text-accent-foreground" />
                <div className="flex-grow">
                    <p className="font-semibold">{eq.name}</p>
                    <p className="text-sm text-muted-foreground">
                        ID: <span className="font-mono">{eq.externalId}</span> | Système: {eq.systemCode ?? 'N/A'} | Statut: {eq.status ?? 'N/A'}
                    </p>
                </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
