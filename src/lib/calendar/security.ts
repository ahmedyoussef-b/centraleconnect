// src/lib/calendar/security.ts
import * as React from "react"
import { IndustrialLogger, LogLevel } from "@/lib/logger"

/**
 * Valide qu'une date est dans une plage autorisée
 * @param date Date à valider
 * @param minDate Date minimale autorisée
 * @param maxDate Date maximale autorisée
 * @returns true si la date est dans la plage
 */
export function validateDateRange(date: Date, minDate: Date, maxDate: Date): boolean {
  return date >= minDate && date <= maxDate
}

/**
 * Nettoie et valide une entrée de date
 * @param dateInput Entrée de date (string ou Date)
 * @returns Date validée
 * @throws Error si le format est invalide
 */
export function sanitizeDateInput(dateInput: string | Date): Date {
  if (typeof dateInput === 'string') {
    // Valider le format ISO (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      throw new Error('Format de date invalide. Utilisez le format YYYY-MM-DD')
    }
    
    const date = new Date(dateInput)
    
    // Vérifier que la date est valide (pas NaN)
    if (isNaN(date.getTime())) {
      throw new Error('Date invalide')
    }
    
    return date
  }
  
  // Vérifier que l'objet Date est valide
  if (isNaN(dateInput.getTime())) {
    throw new Error('Date invalide')
  }
  
  return dateInput
}

/**
 * Hook personnalisé pour la gestion sécurisée des dates en environnement industriel
 * @param initialDate Date initiale optionnelle
 * @returns [date, setSafeDate] - La date courante et la fonction pour la mettre à jour de façon sécurisée
 */
export function useIndustrialDate(initialDate?: Date) {
  const [date, setDate] = React.useState<Date | undefined>(initialDate)
  const logger = IndustrialLogger.getInstance()
  
  const setSafeDate = React.useCallback((newDate: Date | undefined) => {
    if (newDate) {
      try {
        // Sanitizer l'entrée
        const sanitizedDate = sanitizeDateInput(newDate)
        
        // Validation industrielle : 5 ans dans le passé jusqu'à maintenant
        const now = new Date()
        const fiveYearsAgo = new Date()
        fiveYearsAgo.setFullYear(now.getFullYear() - 5)
        
        if (!validateDateRange(sanitizedDate, fiveYearsAgo, now)) {
          logger.log(LogLevel.WARN, 'Date hors limite', {
            date: sanitizedDate.toISOString(),
            min: fiveYearsAgo.toISOString(),
            max: now.toISOString()
          })
          return
        }
        
        setDate(sanitizedDate)
        logger.log(LogLevel.DEBUG, 'Date mise à jour', { date: sanitizedDate.toISOString() })
      } catch (error) {
        logger.log(LogLevel.ERROR, 'Erreur de validation de date', { error })
      }
    } else {
      setDate(undefined)
      logger.log(LogLevel.DEBUG, 'Date réinitialisée')
    }
  }, [logger])
  
  return [date, setSafeDate] as const
}

/**
 * Formate une date pour l'affichage en français
 * @param date Date à formater
 * @returns Date formatée (ex: "15 janvier 2024")
 */
export function formatDateFrench(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formate une date pour l'API (ISO)
 * @param date Date à formater
 * @returns Date au format ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtient le début et la fin d'un mois
 * @param date Date dans le mois
 * @returns {start, end} Dates de début et fin du mois
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Vérifie si deux dates sont le même jour
 * @param date1 Première date
 * @param date2 Deuxième date
 * @returns true si les dates sont le même jour
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString()
}

/**
 * Ajoute des jours à une date
 * @param date Date de départ
 * @param days Nombre de jours à ajouter (peut être négatif)
 * @returns Nouvelle date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}