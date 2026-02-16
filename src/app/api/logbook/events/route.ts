// src/app/api/logbook/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { IndustrialLogger, LogLevel } from '@/lib/logger'

// Simulation de base de données
const mockEvents = {
  '2024-01-05': [
    {
      id: '1',
      date: '2024-01-05T08:30:00',
      type: 'incident',
      description: 'Dépassement du seuil de vibration sur TG1',
      operator: 'J. Dupont'
    }
  ],
  '2024-01-15': [
    {
      id: '2',
      date: '2024-01-15T10:00:00',
      type: 'maintenance',
      description: 'Maintenance préventive CR1 - Changement filtres',
      operator: 'M. Martin'
    }
  ]
}

export async function GET(request: NextRequest) {
  const logger = IndustrialLogger.getInstance()
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')

  try {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 500))

    if (date) {
      // Retourner les événements pour une date spécifique
      const events = mockEvents[date as keyof typeof mockEvents] || []
      
      logger.log(LogLevel.INFO, 'API: Day events fetched', { date, count: events.length })
      
      return NextResponse.json({ events })
    } else {
      // Retourner tous les jours avec événements
      const maintenance = Object.keys(mockEvents).filter(date => 
        mockEvents[date as keyof typeof mockEvents].some(e => e.type === 'maintenance')
      )
      const incidents = Object.keys(mockEvents).filter(date => 
        mockEvents[date as keyof typeof mockEvents].some(e => e.type === 'incident')
      )

      logger.log(LogLevel.INFO, 'API: Calendar events fetched', {
        maintenanceCount: maintenance.length,
        incidentCount: incidents.length
      })

      return NextResponse.json({
        maintenance,
        incidents
      })
    }
  } catch (error) {
    logger.log(LogLevel.ERROR, 'API: Failed to fetch events', { error })
    
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}