import fs from 'fs';
import path from 'path';

const MASTER_DATA_DIR = path.resolve(__dirname, '../src/assets/master-data');
const OUTPUT_FILE = path.resolve(__dirname, '../../public/scada-mapping.json');

const FILES_TO_PROCESS = [
  'components.json',
  'pid-assets.json',
  'A0.json',
  'B0.json',
  'B1.json',
  'B2.json',
  'B3.json',
  'C0.json',
];

interface MappingEntry {
  external_id: string;
  name: string;
  scada_tag_candidate: string;
  source_file: string;
}

async function generateMapping() {
  console.log('🚀 Démarrage de la génération du mapping SCADA...');
  const mapping = new Map<string, MappingEntry>();

  for (const fileName of FILES_TO_PROCESS) {
    const filePath = path.join(MASTER_DATA_DIR, fileName);
    console.log(`Processing ${fileName}...`);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      let items: any[] = [];
      if (fileName === 'pid-assets.json' && data.nodes) {
        items = data.nodes;
      } else if (Array.isArray(data)) {
        items = data;
      } else {
        console.warn(`Skipping ${fileName}: format non reconnu.`);
        continue;
      }

      for (const item of items) {
        const external_id = item.external_id || item.tag;
        if (!external_id || mapping.has(external_id)) {
          continue;
        }

        let scada_tag_candidate = 'NOT_FOUND';
        if (item.tag && typeof item.tag === 'string') {
          scada_tag_candidate = item.tag;
        } else if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
          scada_tag_candidate = item.tags[0];
        } else {
          if (external_id.match(/^[A-Z0-9.-]+$/)) {
              scada_tag_candidate = external_id;
          }
        }
        
        mapping.set(external_id, {
          external_id,
          name: item.name || item.label_fr || 'N/A',
          scada_tag_candidate,
          source_file: fileName,
        });
      }
    } catch (error) {
      console.error(`❌ Erreur lors du traitement du fichier ${fileName}:`, error);
    }
  }

  const mappingArray = Array.from(mapping.values());
  const outputData = {
    generated_at: new Date().toISOString(),
    total_mappings: mappingArray.length,
    mappings: mappingArray,
  };

  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
    console.log(`✅ Mapping généré avec succès ! Fichier sauvegardé dans : ${OUTPUT_FILE}`);
    console.log(`📊 ${mappingArray.length} mappings uniques ont été créés.`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'écriture du fichier de mapping :', error);
  }
}

generateMapping();
