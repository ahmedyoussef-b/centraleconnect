'use client';

/**
 * Fetches the content of an SVG file, using Tauri's invoke method if available,
 * otherwise falling back to a standard web fetch.
 * This allows the component to work in both desktop (offline) and web environments.
 * @param svgPath The path to the SVG file, starting from the public directory (e.g., '/assets/pids/system/file.svg').
 * @returns A promise that resolves to the SVG content as a string.
 */
export async function getPidSvgContent(svgPath: string): Promise<string> {
    const isTauri = !!window.__TAURI__;

    if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        // The path for `invoke` should be relative to the resource root (which is the `public` folder)
        const resourcePath = svgPath.startsWith('/') ? svgPath.substring(1) : svgPath;
        return await invoke('get_pid_svg', { path: resourcePath });
    } else {
        const response = await fetch(svgPath);
        if (!response.ok) {
            throw new Error(`Le fichier SVG n'a pas été trouvé : ${svgPath} (status: ${response.status})`);
        }
        return await response.text();
    }
}
