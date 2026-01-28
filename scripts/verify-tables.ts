// scripts/verify-tables.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDatabase() {
  console.log('🔍 VÉRIFICATION DE LA BASE DE DONNÉES')
  console.log('=====================================\n')

  try {
    // 1. Vérifier la connexion
    console.log('1. 🔗 Test de connexion...')
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('   ✅ Connexion OK\n')

    // 2. Vérifier toutes les tables
    console.log('2. 🗃️  Tables disponibles dans la base...')
    const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_%'
      ORDER BY name
    `
    
    console.log(`   📊 Nombre de tables : ${tables.length}\n`)
    
    for (const table of tables) {
      console.log(`   📋 Table : ${table.name}`)
      
      // Compter les enregistrements
      try {
        const countResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*) as count FROM "${table.name}"
        `
        console.log(`     📈 Enregistrements : ${countResult[0].count}`)
        
        // Afficher les premières colonnes
        const columns = await prisma.$queryRaw<Array<{ name: string }>>`
          PRAGMA table_info("${table.name}")
        `
        const columnNames = columns.map(c => c.name).slice(0, 5)
        console.log(`     🔧 Colonnes (premières 5) : ${columnNames.join(', ')}${columns.length > 5 ? '...' : ''}`)
        
      } catch (error) {
        console.log(`     ⚠️  Erreur de lecture`)
      }
      console.log()
    }

    // 3. Vérifier les tables critiques
    console.log('3. 🎯 Tables critiques (doivent exister)...')
    const criticalTables = [
      'functional_nodes',
      'parameters', 
      'alarms',
      'log_entries',
      'annotations',
      'procedures',
      'procedure_steps',
      'scada_data',
      'alarm_events',
      'documents'
    ]
    
    let allCriticalOk = true
    for (const tableName of criticalTables) {
      const exists = tables.some(t => t.name === tableName)
      if (exists) {
        console.log(`   ✅ ${tableName}`)
      } else {
        console.log(`   ❌ ${tableName} - MANQUANTE !`)
        allCriticalOk = false
      }
    }
    
    console.log()
    if (allCriticalOk) {
      console.log('🎉 TOUTES LES TABLES CRITIQUES SONT PRÉSENTES !')
    } else {
      console.log('⚠️  Certaines tables critiques manquent')
    }

    // 4. Vérifier les index
    console.log('\n4. 📈 Index disponibles...')
    const indices = await prisma.$queryRaw<Array<{ name: string, tbl_name: string }>>`
      SELECT name, tbl_name FROM sqlite_master 
      WHERE type='index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `
    
    console.log(`   📊 Nombre d'index : ${indices.length}`)
    
    // Grouper par table
    const indicesByTable: Record<string, string[]> = {}
    indices.forEach(idx => {
      if (!indicesByTable[idx.tbl_name]) {
        indicesByTable[idx.tbl_name] = []
      }
      indicesByTable[idx.tbl_name].push(idx.name)
    })
    
    for (const [tableName, tableIndices] of Object.entries(indicesByTable)) {
      console.log(`   📋 ${tableName} : ${tableIndices.length} index`)
      tableIndices.forEach(idx => console.log(`       • ${idx}`))
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de la vérification :', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verifyDatabase()