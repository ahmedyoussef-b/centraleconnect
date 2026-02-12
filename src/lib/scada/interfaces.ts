// src/lib/scada/interfaces.ts
/**
 * Ce fichier définit les interfaces et types fondamentaux pour la couche d'abstraction SCADA.
 * Il sert de contrat commun pour toutes les implémentations de client (OPC UA, Démo, WebSocket).
 */

/**
 * Représente l'état de la connexion à la source de données SCADA.
 * Cet enum est partagé entre le provider et les composants consommateurs.
 */
export enum ScadaStatus {
  INITIALIZING = 'INITIALIZING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  SUSPENDED = 'SUSPENDED',
  FAILED = 'FAILED',
}

/**
 * Représente une valeur unique provenant du système SCADA, avec sa qualité et son horodatage.
 */
export interface ScadaValue {
  tag: string;
  value: any;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  timestamp: Date;
}

/**
 * Représente une souscription active à des mises à jour de données SCADA.
 * L'implémentation doit permettre de se désabonner des notifications.
 */
export interface Subscription {
  /**
   * Se désabonne des mises à jour pour les tags de cette souscription.
   */
  unsubscribe(): void;
}


/**
 * Interface unique pour tous les clients SCADA (OPC UA, Demo, etc.).
 * Elle garantit que le reste de l'application interagit avec n'importe quelle
 * source de données de la même manière, que ce soit côté client ou serveur.
 */
export interface IScadaClient {
  /**
   * Établit la connexion avec la source de données.
   */
  connect(): Promise<void>;

  /**
   * Se désabonne de la source de données et nettoie les ressources.
   */
  disconnect(): Promise<void>;

  /**
   * S'abonne à une liste de tags pour recevoir des mises à jour en temps réel.
   * @param tags Un tableau de tags/identifiants à surveiller.
   * @param callback La fonction à appeler à chaque mise à jour de valeur.
   * @returns Une promesse qui se résout avec un objet de souscription.
   */
  subscribe(tags: string[], callback: (value: ScadaValue) => void): Promise<Subscription>;

  /**
   * Lit la valeur actuelle d'un seul tag de manière asynchrone.
   * @param tag Le tag à lire.
   * @returns Une promesse qui se résout avec la valeur du tag.
   */
  read(tag: string): Promise<ScadaValue>;

  /**
   * Retourne l'état actuel de la connexion.
   */
  getStatus(): ScadaStatus;

  /**
   * Permet de s'abonner aux changements d'état de la connexion.
   * @param callback La fonction à appeler avec le nouvel état.
   */
  onStatusChange(callback: (status: ScadaStatus) => void): void;
}
