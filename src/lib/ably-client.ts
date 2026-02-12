import Ably, { type Types } from 'ably';

const ABLY_API_KEY = process.env.NEXT_PUBLIC_ABLY_API_KEY;

let ablyClientInstance: Types.RealtimePromise | null = null;

/**
 * Returns a singleton instance of the Ably client.
 * This function ensures that the client is only ever created once, and only on the client-side.
 */
export const getAblyClient = (): Types.RealtimePromise => {
    if (ablyClientInstance) {
        return ablyClientInstance;
    }

    if (!ABLY_API_KEY) {
        throw new Error('NEXT_PUBLIC_ABLY_API_KEY is not defined in your environment variables.');
    }
    
    ablyClientInstance = new Ably.Realtime.Promise({ key: ABLY_API_KEY });
    return ablyClientInstance;
};
