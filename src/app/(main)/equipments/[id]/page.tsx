
import { notFound } from 'next/navigation';

import { getEquipments, getEquipmentById, getParametersForComponent, getLogEntriesForNode, getDocumentsForComponent } from '@/lib/db-service';
import { getAlarmsForComponent } from '@/lib/alarms-service';
import { EquipmentDetailView } from '@/components/equipment-detail-view';

export async function generateStaticParams() {
    const equipments = await getEquipments();
    return equipments.map((equip) => ({
      id: encodeURIComponent(equip.externalId),
    }));
}

export default async function EquipmentDetailPage({ params }: { params: { id: string } }) {
    const equipmentId = decodeURIComponent(params.id);
    
    const nodeData = await getEquipmentById(equipmentId);
    if (!nodeData) {
        notFound();
    }

    // Fetch related data in parallel
    const [paramsData, alarmsData, logsData, docsData] = await Promise.all([
        getParametersForComponent(equipmentId),
        Promise.resolve(getAlarmsForComponent(equipmentId)), // This one is synchronous
        getLogEntriesForNode(equipmentId),
        getDocumentsForComponent(equipmentId),
    ]);

    return (
        <EquipmentDetailView 
            node={nodeData}
            parameters={paramsData}
            alarms={alarmsData}
            logEntries={logsData}
            documents={docsData}
        />
    );
}
