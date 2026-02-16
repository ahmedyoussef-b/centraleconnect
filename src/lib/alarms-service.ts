
import type { Alarm as DbAlarm } from '@/types/db';

export type Alarm = DbAlarm;

export async function getAlarms(): Promise<Alarm[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  
  if (isTauri) {
      const { getAlarms: getAlarmsTauri } = await import('@/lib/tauri-client');
      const rawAlarms: any[] = await getAlarmsTauri();

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

  // Web Fallback
  try {
    console.log('[Service] Fetching alarms from web API...');
    const response = await fetch('/api/alarms');
    if (!response.ok) {
        throw new Error(`Failed to fetch alarms from web API: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
      console.error(error);
      return [];
  }
}

export async function getAlarmsForComponent(componentTag: string): Promise<Alarm[]> {
  const alarms = await getAlarms();
  return alarms.filter(a => a.equipmentId === componentTag);
}
