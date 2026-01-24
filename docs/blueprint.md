# **App Name**: CentraleConnect

## Core Features:

- Architecture Hybride: Application installable (Tauri/PWA) avec synchro bidirectionnelle sécurisée (Next.js API) et version web optionnelle (Vercel).
- Base de Données Statique Locale: Stockage des données immuables (équipements, alarmes, paramètres) en tables relationnelles, mises à jour versionnées.
- Auto-Provisionnement Multimédia Intelligent: Capture via caméra, OCR, QR code, reconnaissance d’objets pour enrichissement BDD locale. Affichage contextuel des données.
- Assistant Vocal Industriel: Interaction vocale mains-libres (STT/TTS) pour requêtes techniques liées à la BDD et aux données SCADA. Use the LLM as a tool to understand technical jargon and the appropriate piece of information to return.
- Supervision Temps Réel SCADA: Affichage des données critiques (GT, HRSG, TV, CR1/CR2) sur schémas P&ID interactifs et courbes historiques via Ably ou WebSockets.
- Procédures Guidées Interactives: Workflows structurés (démarrage, arrêt) avec checklists dynamiques, validation manuelle, timers, et vérifications SCADA.
- Journal de Bord Numérique & Traçabilité Réglementaire: Enregistrement automatique et manuel d’événements, horodatage serveur, lien avec entités et tags normatifs, export PDF/CSV conforme.

## Style Guidelines:

- Primary color: Deep blue (#1E3A8A), representing stability and reliability, essential in an industrial monitoring context.
- Background color: Dark gray (#2D3748), offering a high contrast, low-glare environment suitable for continuous monitoring.
- Accent color: Teal (#319795), providing a modern, technological highlight to draw attention to key metrics and interactive elements.
- Body font: 'Inter', a grotesque-style sans-serif with a modern, machined, objective, neutral look; suitable for body text
- Headline font: 'Space Grotesk', a proportional sans-serif with a computerized, techy, scientific feel; suitable for headlines. When paired use Inter for the body.
- Code font: 'Source Code Pro' for displaying code snippets or configuration details.
- Use clear, minimalist icons to represent equipment and statuses. Standardized symbols are critical for quick recognition across language barriers.
- Dashboard layout should be modular and customizable, allowing users to prioritize key data based on their role and responsibilities.
- Subtle animations to indicate real-time data updates and alerts. Animations should be functional and not distracting.