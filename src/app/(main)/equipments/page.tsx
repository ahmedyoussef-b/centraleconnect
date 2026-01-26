
'use client';

import { useEffect, useState } from 'react';
import type { Component as ComponentType } from '@/types/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function ComponentsTable() {
  const [components, setComponents] = useState<ComponentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Check for Tauri environment only on client-side
    setIsTauri(!!window.__TAURI__);

    async function loadData() {
      if (!!window.__TAURI__) {
        try {
          const { getComponents } = await import('@/lib/db-service');
          const data = await getComponents();
          setComponents(data);
        } catch (e) {
          console.error(e);
          setError('Failed to load component data from local database.');
        }
      }
    }
    loadData();
  }, []);

  if (!isTauri) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
        <p className="text-center text-muted-foreground">
          La fonctionnalité de base de données n'est disponible que dans
          l'application de bureau Tauri.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-destructive p-4">
        <p className="text-center text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composants Principaux</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length > 0 ? (
              components.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.id}</TableCell>
                  <TableCell>{eq.name}</TableCell>
                  <TableCell>{eq.description}</TableCell>
                  <TableCell>{eq.type}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Chargement des données...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function EquipmentsPage() {
  return <ComponentsTable />;
}
