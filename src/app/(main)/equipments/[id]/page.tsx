
'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getEquipmentById, getParametersForComponent, getLogEntriesForNode, getDocumentsForComponent } from '@/lib/db-service';
import { getAlarmsForComponent } from '@/lib/alarms-service';
import { EquipmentDetailView } from '@/components/equipment-detail-view';
import type { Equipment, Parameter, LogEntry, Document } from '@/types/db';
import type { Alarm } from '@/lib/alarms-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

// Importation directe des données JSON pour une génération statique robuste
import componentsData from '@/assets/master-data/components.json';
import pidAssetsData from '@/assets/master-data/pid-assets.json';
import b0Data from '@/assets/master-data/B0.json';
import b1Data from '@/assets/master-data/B1.json';
import b2Data from '@/assets/master-data/B2.json';
import b3Data from '@/assets/master-data/B3.json';
import c0Data from '@/assets/master-data/C0.json';
import tg1Data from '@/assets/master-data/TG1.json';
import tg2Data from '@/assets/master-data/TG2.json';

export async function generateStaticParams() {
  // Combinaison de toutes les sources de données, comme dans le script de seed
  const allDataItems: any[] = [
      ...componentsData,
      ...pidAssetsData.nodes,
      ...b0Data,
      ...b1Data,
      ...b2Data,
      ...b3Data,
      ...c0Data,
      ...tg1Data,
      ...tg2Data
    ];

  const equipmentIds = new Set<string>();
  allDataItems.forEach(item => {
    // Gère les différents formats d'ID ('externalId', 'tag', 'external_id')
    const id = item.externalId || item.tag || item.external_id;
    if (id) {
        equipmentIds.add(id);
    }
  });

  return Array.from(equipmentIds).map(id => ({
    id: encodeURIComponent(id),
  }));
}

function EquipmentDetailSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
}

export default function EquipmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const equipmentId = decodeURIComponent(params.id as string);

    const [node, setNode] = useState<Equipment | null>();
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!equipmentId) return;
        
        async function loadData() {
            setLoading(true);
            try {
                const nodeData = await getEquipmentById(equipmentId);
                if (!nodeData) {
                    notFound();
                    return;
                }
                setNode(nodeData);

                const [paramsData, alarmsData, logsData, docsData] = await Promise.all([
                    getParametersForComponent(equipmentId),
                    getAlarmsForComponent(equipmentId),
                    getLogEntriesForNode(equipmentId),
                    getDocumentsForComponent(equipmentId),
                ]);
                
                setParameters(paramsData);
                setAlarms(alarmsData);
                setLogEntries(logsData);
                setDocuments(docsData);

            } catch (error) {
                console.error("Failed to load equipment details:", error);
                // Optionally show a toast or error message
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [equipmentId]);

    if (loading) {
        return <EquipmentDetailSkeleton />;
    }

    if (!node) {
        return notFound();
    }

    return (
        <EquipmentDetailView 
            node={node}
            parameters={parameters}
            alarms={alarms}
            logEntries={logEntries}
            documents={documents}
        />
    );
}
