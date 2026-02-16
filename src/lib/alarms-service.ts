import type { Alarm as DbAlarm } from '@/types/db';

export type Alarm = DbAlarm;

export async function getAlarms(): Promise<Alarm[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  
  if (isTauri) {
      const { getAlarms: getAlarmsTauri } = await import('@/lib/tauri-client');
      const rawAlarms: any[] = await getAlarmsTauri();

      // Mappage robuste pour garantir que le format des données est correct pour le frontend.
      // Cela corrige directement le type de problème décrit dans DEBUG_ALARMS_PAGE.md
      return rawAlarms.map(alarm => ({
        code: alarm.code,
        equipmentId: alarm.equipmentId || alarm.equipment_id, // Gère les deux cas de nommage
        severity: alarm.severity,
        description: alarm.description,
        parameter: alarm.parameter,
        resetProcedure: alarm.resetProcedure || alarm.reset_procedure,
        standardRef: alarm.standardRef || alarm.standard_ref,
      }));
  }

  // Le fallback web est désactivé. Retourne des données vides.
  console.warn('[Service] Pas dans un environnement Tauri. Le fallback API Web est désactivé pour getAlarms.');
  return [];
}

export async function getAlarmsForComponent(componentTag: string): Promise<Alarm[]> {
  const alarms = await getAlarms();
  return alarms.filter(a => a.equipmentId === componentTag);
}
