// src/components/logbook/LogbookView.tsx
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { IndustrialCalendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IndustrialLogger, LogLevel } from "@/lib/logger"
import { formatDateFrench } from "@/lib/calendar/security"

interface LogbookEvent {
  id: string
  date: string
  type: 'maintenance' | 'incident' | 'operation'
  description: string
  operator: string
}

export function LogbookView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [maintenanceDays, setMaintenanceDays] = useState<Date[]>([])
  const [incidentDays, setIncidentDays] = useState<Date[]>([])
  const [events, setEvents] = useState<LogbookEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const logger = IndustrialLogger.getInstance()

  // Charger les jours avec événements
  useEffect(() => {
    async function loadEvents() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/logbook/events')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        setMaintenanceDays(
          (data.maintenance || []).map((d: string) => new Date(d))
        )
        setIncidentDays(
          (data.incidents || []).map((d: string) => new Date(d))
        )
        
        logger.log(LogLevel.INFO, 'Calendar events loaded successfully', {
          maintenanceCount: data.maintenance?.length || 0,
          incidentCount: data.incidents?.length || 0
        })
      } catch (error) {
        logger.log(LogLevel.ERROR, 'Failed to load calendar events', { error })
        
        // Fallback: données de test en mode développement
        if (process.env.NODE_ENV === 'development') {
          setMaintenanceDays([
            new Date(2024, 0, 15),
            new Date(2024, 1, 10),
          ])
          setIncidentDays([
            new Date(2024, 0, 5),
          ])
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    loadEvents()
  }, [logger])

  // Charger les détails des événements pour une date sélectionnée
  useEffect(() => {
    async function loadDayEvents() {
      if (!selectedDate) return
      
      try {
        const dateStr = selectedDate.toISOString().split('T')[0]
        const response = await fetch(`/api/logbook/events?date=${dateStr}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setEvents(data.events || [])
        
        logger.log(LogLevel.DEBUG, 'Day events loaded', {
          date: dateStr,
          count: data.events?.length || 0
        })
      } catch (error) {
        logger.log(LogLevel.ERROR, 'Failed to load day events', { error })
        setEvents([])
      }
    }
    
    loadDayEvents()
  }, [selectedDate, logger])

  // CORRECTION: Ce handler correspond maintenant à ce qu'attend IndustrialCalendar
  const handleDayClick = (date: Date, modifiers: any, e: React.MouseEvent) => {
    // Extraire les informations de nos modifieurs personnalisés
    const hasMaintenance = modifiers?.maintenance || false
    const hasIncident = modifiers?.incident || false
    
    setSelectedDate(date)
    logger.log(LogLevel.INFO, 'Logbook date selected', {
      date: date.toISOString(),
      hasMaintenance,
      hasIncident
    })
  }

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'maintenance':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Maintenance</span>
      case 'incident':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Incident</span>
      default:
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Opération</span>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal de Bord - Sélecteur de Date</CardTitle>
      </CardHeader>
      <CardContent>
        <IndustrialCalendar
          mode="single"
          selected={selectedDate}
          onDayClick={handleDayClick}  // Maintenant le type correspond
          maintenanceDays={maintenanceDays}
          incidentDays={incidentDays}
          className="rounded-md border"
        />
        
        {selectedDate && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <h3 className="font-semibold mb-2">
                {formatDateFrench(selectedDate)}
              </h3>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  Maintenance: {maintenanceDays.some(d => d.toDateString() === selectedDate.toDateString()) ? '✓' : '✗'}
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Incident: {incidentDays.some(d => d.toDateString() === selectedDate.toDateString()) ? '✓' : '✗'}
                </div>
              </div>
            </div>
            
            {/* Liste des événements */}
            {events.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">Événements enregistrés :</h4>
                {events.map((event) => (
                  <div key={event.id} className="p-3 border rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      {getEventTypeBadge(event.type)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Opérateur: {event.operator}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground border rounded-md">
                Aucun événement enregistré pour cette date
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}