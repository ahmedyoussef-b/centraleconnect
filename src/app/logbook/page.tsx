// src/app/logbook/page.tsx
"use client"

import { useState } from "react"
import { IndustrialCalendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LogbookPage() {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [maintenanceDays] = useState<Date[]>([
    new Date(2024, 0, 15), // 15 Jan 2024
    new Date(2024, 1, 10), // 10 Fev 2024
  ])
  const [incidentDays] = useState<Date[]>([
    new Date(2024, 0, 5), // 5 Jan 2024
  ])

  const handleIndustrialDayClick = (date: Date, events: { hasMaintenance: boolean; hasIncident: boolean }) => {
    setSelectedDate(date)
    console.log('Jour sélectionné:', date.toLocaleDateString('fr-FR'), events)
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Journal de Bord - Calendrier Industriel</CardTitle>
        </CardHeader>
        <CardContent>
          <IndustrialCalendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onIndustrialDayClick={handleIndustrialDayClick}
            maintenanceDays={maintenanceDays}
            incidentDays={incidentDays}
            className="rounded-md border"
          />
          
          {selectedDate && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="font-semibold mb-2">
                Détails du {selectedDate.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <div className="space-y-2">
                {maintenanceDays.some(d => d.toDateString() === selectedDate.toDateString()) && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                    Maintenance planifiée
                  </div>
                )}
                {incidentDays.some(d => d.toDateString() === selectedDate.toDateString()) && (
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="w-3 h-3 rounded-full bg-red-400"></span>
                    Incident enregistré
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}