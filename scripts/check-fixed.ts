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
    
    // 3. Vérifier les tables critiques
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
            subSystem: 'INTEGRITY',
            version: 1,
            isImmutable: false,
          }
        })
        console.log(`   ✅ Équipement créé: ${testEquipment.externalId}`)
        
        // ✅ CORRIGÉ : Plus de champ 'dataType' qui n'existe pas
        const param = await prisma.parameter.create({
          data: {
            equipmentId: testEquipment.externalId,
            name: 'Température de test',
            unit: '°C',
            nominalValue: 100,
            minSafe: 0,
            maxSafe: 150,
            alarmHigh: 120,
            alarmLow: 10,
          }
        })
        console.log(`   ✅ Paramètre créé: ${param.name} (ID: ${param.id})`)
        
        // Nettoyer
        await prisma.parameter.delete({ where: { id: param.id } })
        await prisma.equipment.delete({ where: { externalId: testEquipment.externalId } })
        console.log('   ✅ Tests nettoyés')
        
      } catch (error) {
        if (error instanceof Error) {
          console.log(`   ❌ Erreur de test: ${error.message}`)
        } else {
          console.log(`   ❌ Erreur inconnue:`, error)
        }
      }
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('💥 ERREUR:', error.message)
    } else {
      console.error('💥 ERREUR INCONNUE:', error)
    }
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Déconnexion de la base de données')
  }
}

checkFixed().catch((e) => {
  console.error('💥 Erreur fatale:', e)
  process.exit(1)
})