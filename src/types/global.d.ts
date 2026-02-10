//src/types/global.d.ts
declare global {
  interface Window {
    __TAURI__?: object;
  }
}

// This empty export is needed to make this file a module.
export {};
