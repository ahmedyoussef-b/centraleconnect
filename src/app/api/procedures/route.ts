// src/app/api/procedures/route.ts - Version diagnostic
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  console.log('📡 [API] GET /api/procedures - Début');
  
  try {
    // Étape 1: Vérifier la connexion
    console.log('🔄 Test connexion DB...');
    await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log('✅ Connexion DB OK');

    // Étape 2: Vérifier que la table existe
    console.log('🔄 Vérification table procedures...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📋 Tables disponibles:', tables);

    // Étape 3: Compter les procédures
    console.log('🔄 Comptage des procédures...');
    const count = await prisma.procedure.count();
    console.log(`📊 Nombre de procédures: ${count}`);

    // Étape 4: Récupérer les procédures
    console.log('🔄 Récupération des procédures...');
    const procedures = await prisma.procedure.findMany({
      orderBy: { name: 'asc' },
    });
    
    console.log(`✅ ${procedures.length} procédures trouvées`);
    
    if (procedures.length > 0) {
      console.log('📝 Première procédure:', {
        id: procedures[0].id,
        name: procedures[0].name,
        category: procedures[0].category,
        stepsType: typeof procedures[0].steps,
        stepsIsArray: Array.isArray(procedures[0].steps)
      });
    }

    return NextResponse.json(procedures, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('❌ [API] Erreur détaillée:');
    
    // Journal d'erreur structuré
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Name:', error.name);
      console.error('   Stack:', error.stack);
      
      // Erreur Prisma spécifique
      if ('code' in error) {
        console.error('   Prisma code:', (error as any).code);
      }
      if ('meta' in error) {
        console.error('   Prisma meta:', (error as any).meta);
      }
    } else {
      console.error('   Erreur inconnue:', error);
    }

    // Vérifier la variable d'environnement (sans afficher le mot de passe)
    const dbUrl = process.env.DATABASE_URL || 'non définie';
    const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':***@');
    console.log('🔑 DATABASE_URL:', maskedUrl);

    return NextResponse.json(
      { 
        error: 'Failed to fetch procedures from remote database.',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Erreur inconnue') : 
          undefined
      },
      { status: 500 }
    );
  }
}
