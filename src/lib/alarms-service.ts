import alarmsData from '@/assets/master-data/alarms.json';
import type { Alarm as DbAlarm } from '@/types/db';

export type Alarm = DbAlarm;

export function getAlarms(): Alarm[] {
  // The JSON data has a slightly different structure than the Alarm type.
  // We map the fields here to match the type definition.
  return (alarmsData as any[]).map(alarm => ({
    code: alarm.code,
    equipmentId: alarm.componentTag,
    severity: alarm.severity,
    description: alarm.message,
    standardRef: alarm.standardRef,
    parameter: alarm.parameter,
    resetProcedure: alarm.reset_procedure,
  }));
}

export function getAlarmsForComponent(componentTag: string): Alarm[] {
  return getAlarms().filter(a => a.equipmentId === componentTag);
}
