// src/lib/scada/client/ably-client.ts
import Ably, { type Types } from 'ably';

const ABLY_API_KEY = process.env.NEXT_PUBLIC_ABLY_API_KEY;

let ablyClientInstance: Types.RealtimePromise | null = null;

/**
 * Renvoie une instance singleton du client Ably.
 * Cette fonction garantit que le client n'est créé qu'une seule fois, et uniquement côté client.
 * @returns {Types.RealtimePromise} - L'instance du client Ably.
 */
export const getAblyClient = (): Types.RealtimePromise => {
    if (typeof window === 'undefined') {
        throw new Error('Le client Ably ne peut être initialisé que du côté client.');
    }
    
    if (ablyClientInstance) {
        return ablyClientInstance;
    }

    if (!ABLY_API_KEY) {
        throw new Error('NEXT_PUBLIC_ABLY_API_KEY n\'est pas défini dans vos variables d\'environnement.');
    }
    
    ablyClientInstance = new Ably.Realtime.Promise({ key: ABLY_API_KEY });
    return ablyClientInstance;
};
