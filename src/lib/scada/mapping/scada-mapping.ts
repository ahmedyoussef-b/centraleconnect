// src/lib/scada/mapping/scada-mapping.ts

interface MappingEntry {
    external_id: string;
    name: string;
    scada_tag_candidate: string;
    source_file: string;
}

interface ScadaMappingFile {
    generated_at: string;
    total_mappings: number;
    mappings: MappingEntry[];
}

let mappingCache: ScadaMappingFile | null = null;

/**
 * Charge et met en cache le fichier de mapping SCADA depuis le dossier public.
 * @returns Un objet contenant les mappings SCADA.
 */
export async function getScadaMapping(): Promise<ScadaMappingFile> {
    if (mappingCache) {
        return mappingCache;
    }

    try {
        // En environnement client, on utilise fetch.
        // En environnement serveur (comme le script de génération), on pourrait utiliser fs.
        const response = await fetch('/scada-mapping.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch scada-mapping.json: ${response.statusText}`);
        }
        const mapping: ScadaMappingFile = await response.json();
        mappingCache = mapping;
        return mapping;
    } catch (error) {
        console.error("Error loading SCADA mapping:", error);
        // Retourne un objet vide en cas d'erreur pour éviter de planter l'application.
        return {
            generated_at: new Date().toISOString(),
            total_mappings: 0,
            mappings: [],
        };
    }
}
