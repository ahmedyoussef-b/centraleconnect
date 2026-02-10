// src/lib/image-hashing.ts
'use client';

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

/**
 * Computes a perceptual hash (dHash) for a given image source.
 * @param imageSrc The source of the image (URL or data URI).
 * @returns A promise that resolves to a 16-character hex string representing the hash.
 */
export function computePHash(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = HASH_WIDTH;
      canvas.height = HASH_HEIGHT;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject('Could not get canvas context');

      ctx.drawImage(img, 0, 0, HASH_WIDTH, HASH_HEIGHT);
      
      const grayscaleValues = await getGrayscale(ctx);
      
      let hash = '';
      for (let y = 0; y < HASH_HEIGHT; y++) {
        for (let x = 0; x < HASH_WIDTH - 1; x++) {
          const left = grayscaleValues[y * HASH_WIDTH + x];
          const right = grayscaleValues[y * HASH_WIDTH + x + 1];
          hash += left < right ? '1' : '0';
        }
      }
      
      // Convert binary hash to hex
      let hexHash = '';
      for (let i = 0; i < hash.length; i += 4) {
        const binaryChunk = hash.substring(i, i + 4);
        const hexChunk = parseInt(binaryChunk, 2).toString(16);
        hexHash += hexChunk;
      }
      
      resolve(hexHash);
    };
    img.onerror = (err) => reject(`Image load error: ${err}`);
    img.src = imageSrc;
  });
}

/**
 * Converts the canvas image data to an array of grayscale values.
 * @param ctx The 2D context of the canvas.
 * @returns A promise that resolves to an array of grayscale numbers.
 */
function getGrayscale(ctx: CanvasRenderingContext2D): Promise<number[]> {
    return new Promise((resolve, reject) => {
        try {
            const imageData = ctx.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT).data;
            const grayscale: number[] = [];
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                // Using luminance formula for better accuracy
                grayscale.push(0.299 * r + 0.587 * g + 0.114 * b);
            }
            resolve(grayscale);
        } catch(e) {
            reject(e);
        }
    });
}

/**
 * Calculates the Hamming distance between two hex hashes.
 * @param hash1 First hash string.
 * @param hash2 Second hash string.
 * @returns A number representing the difference (0 = identical).
 */
export function compareHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return Infinity;
  }
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const h1 = parseInt(hash1[i], 16);
    const h2 = parseInt(hash2[i], 16);
    // XOR finds differing bits, then we count them
    let xor = h1 ^ h2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  
  return distance;
}
