// src/lib/database.ts
export async function getComponentById(id: string) {
    // 🔒 Validation des permissions avant accès
    if (!hasPermission('component:read')) {
      throw new Error("Accès refusé - niveau d'autorisation insuffisant");
    }
    
    // ⚠️ Pas de données non validées dans l'UI critique
    const component = await prisma.component.findUnique({
      where: { id },
      include: { 
        alarms: { where: { isValidated: true } },
        procedures: { where: { isValidated: true } }
      }
    });
  
    // 🔐 Validation de l'intégrité des données
    if (!component || !component.isValidated) {
      throw new Error('Données non validées - accès interdit');
    }
  
    return component;
  }
