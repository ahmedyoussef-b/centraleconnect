import type { Alarm as DbAlarm } from '@/types/db';

export type Alarm = DbAlarm;

export async function getAlarms(): Promise<Alarm[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  
  if (isTauri) {
      const { getAlarms: getAlarmsTauri } = await import('@/lib/tauri-client');
      // The Rust command already returns data in the correct camelCase format.
      return getAlarmsTauri();
  }

  // Web fallback is disabled. Return empty data.
  console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getAlarms.');
  return [];
}

export async function getAlarmsForComponent(componentTag: string): Promise<Alarm[]> {
  const alarms = await getAlarms();
  return alarms.filter(a => a.equipmentId === componentTag);
}
