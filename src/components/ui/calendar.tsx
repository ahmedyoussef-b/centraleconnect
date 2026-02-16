"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { IndustrialLogger, LogLevel } from "@/lib/logger"

export type IndustrialCalendarProps = React.ComponentProps<typeof DayPicker> & {
  maintenanceDays?: Date[]
  incidentDays?: Date[]
  onIndustrialDayClick?: (date: Date, events: { hasMaintenance: boolean; hasIncident: boolean }) => void
}

function IndustrialCalendar({
  className,
  classNames,
  showOutsideDays = true,
  maintenanceDays = [],
  incidentDays = [],
  onIndustrialDayClick,
  onDayClick,
  ...props
}: IndustrialCalendarProps) {
  const logger = IndustrialLogger.getInstance()

  // Créer les modifieurs pour react-day-picker
  const modifiers = {
    maintenance: maintenanceDays,
    incident: incidentDays,
    ...props.modifiers
  }

  // Styles personnalisés pour les modifieurs
  const modifiersStyles = {
    maintenance: {
      backgroundColor: 'rgba(255, 255, 0, 0.2)',
      color: 'rgb(255, 255, 0)',
      fontWeight: 'bold'
    },
    incident: {
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      color: 'rgb(255, 0, 0)',
      fontWeight: 'bold',
      position: 'relative' as const
    },
    ...props.modifiersStyles
  }

  // Gestionnaire de clic personnalisé
  const handleDayClick = (day: Date, modifiers: any, e: React.MouseEvent) => {
    logger.log(LogLevel.INFO, 'Calendar day clicked', { 
      date: day.toISOString(),
      hasMaintenance: modifiers.maintenance,
      hasIncident: modifiers.incident
    })

    // Appeler le callback personnalisé
    onIndustrialDayClick?.(day, {
      hasMaintenance: modifiers.maintenance || false,
      hasIncident: modifiers.incident || false
    })

    // Appeler le callback original si fourni
    onDayClick?.(day, modifiers, e)
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      modifiers={modifiers}
      modifiersStyles={modifiersStyles}
      onDayClick={handleDayClick}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      // CORRECTION: Dans les versions récentes, on utilise `components` avec `Chevron`
      components={{
        Chevron: ({ orientation }) => (
          orientation === 'left' 
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />
        )
      }}
      {...props}
    />
  )
}

IndustrialCalendar.displayName = "IndustrialCalendar"

export { IndustrialCalendar }