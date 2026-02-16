// src/lib/scada/client/ably-client.ts
import type { Types } from 'ably';

const ABLY_API_KEY = process.env.NEXT_PUBLIC_ABLY_API_KEY;

let ablyClientInstance: Types.RealtimePromise | null = null;

/**
 * Renvoie une instance singleton du client Ably.
 * Cette fonction garantit que le client n'est créé qu'une seule fois, et uniquement côté client.
 * Utilise un import dynamique pour éviter les problèmes de SSR avec Next.js.
 * @returns {Promise<Types.RealtimePromise>} - Une promesse qui se résout avec l'instance du client Ably.
 */
export const getAblyClient = async (): Promise<Types.RealtimePromise> => {
    if (typeof window === 'undefined') {
        throw new Error('Le client Ably ne peut être initialisé que du côté client.');
    }
    
    if (ablyClientInstance) {
        return ablyClientInstance;
    }

    if (!ABLY_API_KEY) {
        throw new Error('NEXT_PUBLIC_ABLY_API_KEY n\'est pas défini dans vos variables d\'environnement.');
    }
    
    // Import dynamique pour la compatibilité SSR
    const Ably = await import('ably');
    
    // Correction : l'accès via `.default` n'est pas correct avec la manière dont `ably` exporte ses modules.
    // On doit utiliser directement `Ably.Realtime.Promise`.
    ablyClientInstance = new Ably.Realtime.Promise({ key: ABLY_API_KEY });
    return ablyClientInstance;
};
