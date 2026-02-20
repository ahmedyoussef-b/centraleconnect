
'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getEquipmentById, getParametersForComponent, getLogEntriesForNode, getDocumentsForComponent, getEquipments } from '@/lib/db-service';
import { getAlarmsForComponent } from '@/lib/alarms-service';
import { EquipmentDetailView } from '@/components/equipment-detail-view';
import type { Equipment, Parameter, LogEntry, Document } from '@/types/db';
import type { Alarm } from '@/lib/alarms-service';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export async function generateStaticParams() {
  const equipments = await getEquipments();
  return equipments.map((eq) => ({
    id: encodeURIComponent(eq.externalId),
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
