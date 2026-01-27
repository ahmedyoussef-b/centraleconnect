'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Represents a simplified alarm structure for navigation purposes.
 */
export interface PidAlarm {
  equipmentId: string; // e.g., 'TG1', 'A0.CAA.HV183'
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

/**
 * A mapping from an equipment ID (from master data) to the ID of the corresponding
 * element within an SVG diagram.
 * e.g., { 'A0.CAA.HV183': 'equipment-hv183' }
 */
export type EquipmentSvgMap = Record<string, string>;


/**
 * Configuration for the usePidNavigation hook.
 */
export interface PidNavigationConfig {
  /** A list of currently active alarms in the system. */
  activeAlarms: PidAlarm[];
  /** A map linking equipment IDs to their corresponding SVG element IDs. */
  equipmentSvgMap: EquipmentSvgMap;
}

/**
 * This hook provides logic to link SCADA data (like alarms) to interactive SVG elements.
 * It determines which elements should be highlighted based on active alarms and provides
 * handlers for user interactions like clicks.
 *
 * @param config - The configuration object for the hook.
 * @returns An object containing `highlightedElements` and an `onElementClick` handler.
 */
export function usePidNavigation({ activeAlarms, equipmentSvgMap }: PidNavigationConfig) {
  const router = useRouter();
  const [highlightedElements, setHighlightedElements] = useState<Record<string, string>>({});

    // Create a reverse map for efficient lookups in click handlers
  const svgToEquipmentMap = useMemo(() => {
    return Object.entries(equipmentSvgMap).reduce((acc, [equipId, svgId]) => {
      acc[svgId] = equipId;
      return acc;
    }, {} as Record<string, string>);
  }, [equipmentSvgMap]);


  useEffect(() => {
    const newHighlights: Record<string, string> = {};

    for (const alarm of activeAlarms) {
      const svgId = equipmentSvgMap[alarm.equipmentId];
      if (svgId) {
        // Here, we map alarm severity to utility classes for styling SVG elements.
        // The `!` prefix makes the style important to override defaults.
        const highlightClass = alarm.severity === 'CRITICAL' 
          ? 'animate-pulse !fill-destructive/30 !stroke-destructive'
          : '!fill-orange-400/30 !stroke-orange-400';
        newHighlights[svgId] = highlightClass;
      }
    }
    setHighlightedElements(newHighlights);
  }, [activeAlarms, equipmentSvgMap]);

  /**
   * Handles click events on an SVG element.
   * It uses the equipment-to-SVG map to find the corresponding equipment ID
   * and navigates to that equipment's detail page.
   */
  const handleElementClick = useCallback((svgElementId: string) => {
    const equipmentId = svgToEquipmentMap[svgElementId];

    if (equipmentId) {
      console.log(`Navigating to equipment: ${equipmentId}`);
      // This page doesn't exist yet, but the hook is ready for it.
      // e.g. router.push(`/equipments/${equipmentId}`);
    }
  }, [router, svgToEquipmentMap]);
  
  return {
    highlightedElements,
    onElementClick: handleElementClick,
  };
}
