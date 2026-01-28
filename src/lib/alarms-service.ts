import alarmsData from '@/assets/master-data/alarms.json';
import type { Alarm } from '@/types/db';

type AlarmWithRef = Alarm & { 
    standardRef?: string;
};

export function getAlarms(): AlarmWithRef[] {
  // The JSON data has a slightly different structure than the Alarm type.
  // We map the fields here to match the type definition.
  return (alarmsData as any[]).map(alarm => ({
    code: alarm.code,
    component_id: alarm.componentTag,
    severity: alarm.severity,
    description: alarm.message,
    standardRef: alarm.standardRef,
    parameter: alarm.parameter,
    reset_procedure: alarm.reset_procedure,
  }));
}
