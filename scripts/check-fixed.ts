// scripts/check-fixed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkFixed() {
  console.log('🔧 VÉRIFICATION DU SCHÉMA CORRIGÉ')
  console.log('==================================\n')
  
  try {
    // 1. Vérifier la connexion
    console.log('1. 🔗 Test de connexion...')
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('   ✅ OK\n')
    
    // 2. Vérifier les tables
    console.log('2. 🗃️  Tables créées...')
    const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
    
    console.log(`   📊 Nombre de tables : ${tables.length}\n`)
    tables.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`)
    })
    
    // 3. Vérifier les tables critiques (basé sur le nouveau schéma)
    console.log('\n3. ✅ Tables critiques...')
    const criticalTables = [
      'equipments', 'parameters', 'alarms', 'alarm_events',
      'documents', 'log_entries', 'annotations', 'procedures',
      'synoptic_items', 'scada_data'
    ]
    
    const tableNames = tables.map(t => t.name)
    let allCriticalOk = true
    
    for (const table of criticalTables) {
      const exists = tableNames.includes(table)
      console.log(`   ${exists ? '✅' : '❌'} ${table}`)
      if (!exists) allCriticalOk = false
    }
    
    if (allCriticalOk) {
      console.log('\n🎉 TOUTES LES TABLES CRITIQUES SONT PRÉSENTES !')
      
      // 4. Tester un insert
      console.log('\n4. 🧪 Test d\'insertion...')
      try {
        const testEquipment = await prisma.equipment.create({
          data: {
            externalId: 'TEST-EQUIP-001',
            name: 'Équipement de Test',
            type: 'TEST_DEVICE',
            systemCode: 'TEST',
            subSystem: 'INTEGRITY'
          }
        })
        console.log(`   ✅ Équipement créé: ${testEquipment.externalId}`)
        
        // Tester une relation
        const param = await prisma.parameter.create({
          data: {
            equipmentId: testEquipment.externalId,
            name: 'Température de test',
            unit: '°C',
            dataType: 'NUMERIC',
            nominalValue: 100,
          }
        })
        console.log(`   ✅ Paramètre créé: ${param.name}`)
        
        // Nettoyer
        await prisma.parameter.delete({ where: { id: param.id } })
        await prisma.equipment.delete({ where: { externalId: testEquipment.externalId } })
        console.log('   ✅ Tests nettoyés')
        
      } catch (error: any) {
        console.log(`   ❌ Erreur de test: ${error.message}`)
      }
    }
    
  } catch (error: any) {
    console.error('💥 ERREUR:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkFixed()
