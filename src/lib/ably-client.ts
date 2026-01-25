
'use client';

import Ably, { type Types } from 'ably';

const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

let ably: Types.RealtimePromise;

// This function ensures the Ably client is a singleton and only created on the client side.
const getAblyClient = (): Types.RealtimePromise => {
    if (ably) {
        return ably;
    }

    if (!apiKey || apiKey === 'YOUR_ABLY_API_KEY') {
      console.warn(`
    *****************************************************************
    * Ably API key not configured. Real-time data will be disabled. *
    *                                                               *
    * 1. Go to https://ably.com/signup to get an API key.           *
    * 2. Create a .env.local file in the project root.              *
    * 3. Add: NEXT_PUBLIC_ABLY_API_KEY="YOUR_API_KEY"               *
    *****************************************************************
  `);

      // Create a mock client that does nothing to prevent the app from crashing.
      const mockChannel = {
        subscribe: () => {},
        unsubscribe: () => {},
        publish: async () => {},
      };

      ably = {
        channels: {
          get: () => mockChannel,
        },
        connection: {
          on: () => {},
          off: () => {},
          state: 'failed',
          close: () => {},
        },
      } as any;
      
    } else {
      // Use the real Ably client if the API key is provided
      ably = new Ably.Realtime.Promise({
        key: apiKey,
        clientId: `ccpp-monitor-client-${Math.random().toString(36).substr(2, 9)}`,
      });
    }
    
    return ably;
};


export { getAblyClient };
