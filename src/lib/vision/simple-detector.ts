// src/lib/vision/simple-detector.ts
/**
 * Détection de formes géométriques sans modèle IA - Basée sur OpenCV.js
 * 100% offline, 0 dépendance réseau
 * Licence: Apache 2.0
 */

export interface Detection {
    type: 'CIRCLE' | 'RECTANGLE' | 'TRIANGLE' | 'LINE';
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    properties?: {
      radius?: number;
      centerX?: number;
      centerY?: number;
      angle?: number;
      start?: {x: number, y: number};
      end?: {x: number, y: number};
    };
  }
  
  export interface ShapeDetectorConfig {
    circleMinRadius?: number;
    circleMaxRadius?: number;
    circleThreshold?: number;
    rectangleMinArea?: number;
    rectangleMaxAspectRatio?: number;
    triangleMinArea?: number;
  }
  
  /**
   * Détection simple de formes géométriques
   * Utilise des techniques de traitement d'image basiques (sans OpenCV.js)
   */
  export class SimpleShapeDetector {
    private config: Required<ShapeDetectorConfig>;
  
    constructor(config?: ShapeDetectorConfig) {
      this.config = {
        circleMinRadius: config?.circleMinRadius ?? 10,
        circleMaxRadius: config?.circleMaxRadius ?? 100,
        circleThreshold: config?.circleThreshold ?? 0.8,
        rectangleMinArea: config?.rectangleMinArea ?? 100,
        rectangleMaxAspectRatio: config?.rectangleMaxAspectRatio ?? 3.0,
        triangleMinArea: config?.triangleMinArea ?? 100,
      };
    }
  
    /**
     * Détection basique de cercles (vannes, boutons, voyants)
     */
    async detectCircles(imageData: ImageData): Promise<Detection[]> {
      const circles: Detection[] = [];
  
      try {
        // 1. Conversion en niveaux de gris
        const grayData = this.convertToGrayscale(imageData);
  
        // 2. Détection des contours (algorithme simplifié)
        const contours = this.detectContours(grayData, imageData.width, imageData.height);
  
        // 3. Filtrer les contours circulaires
        for (const contour of contours) {
          const circularity = this.calculateCircularity(contour);
          
          if (circularity > this.config.circleThreshold) {
            const { centerX, centerY, radius } = this.fitCircleToContour(contour);
            
            if (radius >= this.config.circleMinRadius && radius <= this.config.circleMaxRadius) {
              circles.push({
                type: 'CIRCLE',
                confidence: circularity,
                boundingBox: {
                  x: centerX - radius,
                  y: centerY - radius,
                  width: radius * 2,
                  height: radius * 2
                },
                properties: {
                  radius,
                  centerX,
                  centerY
                }
              });
            }
          }
        }
  
        return circles.sort((a, b) => b.confidence - a.confidence);
  
      } catch (error) {
        console.error('[SHAPE_DETECTOR] Erreur détection cercles:', error);
        return [];
      }
    }
  
    /**
     * Détection basique de rectangles (plaques, panneaux, équipements)
     */
    async detectRectangles(imageData: ImageData): Promise<Detection[]> {
      const rectangles: Detection[] = [];
  
      try {
        // 1. Conversion en niveaux de gris
        const grayData = this.convertToGrayscale(imageData);
  
        // 2. Détection des contours
        const contours = this.detectContours(grayData, imageData.width, imageData.height);
  
        // 3. Filtrer les contours rectangulaires
        for (const contour of contours) {
          const boundingBox = this.getBoundingBox(contour);
          const area = boundingBox.width * boundingBox.height;
          
          if (area < this.config.rectangleMinArea) continue;
  
          const aspectRatio = Math.max(
            boundingBox.width / boundingBox.height,
            boundingBox.height / boundingBox.width
          );
  
          if (aspectRatio <= this.config.rectangleMaxAspectRatio) {
            const rectScore = this.calculateRectangularity(contour);
            
            if (rectScore > 0.7) {
              rectangles.push({
                type: 'RECTANGLE',
                confidence: rectScore,
                boundingBox: boundingBox,
                properties: {
                  angle: this.calculateOrientation(contour)
                }
              });
            }
          }
        }
  
        return rectangles.sort((a, b) => b.confidence - a.confidence);
  
      } catch (error) {
        console.error('[SHAPE_DETECTOR] Erreur détection rectangles:', error);
        return [];
      }
    }

    /**
     * Détection basique de triangles (panneaux de danger)
     */
    async detectTriangles(imageData: ImageData): Promise<Detection[]> {
        const triangles: Detection[] = [];
        try {
            const grayData = this.convertToGrayscale(imageData);
            const contours = this.detectContours(grayData, imageData.width, imageData.height);
    
            for (const contour of contours) {
                const area = this.calculateContourArea(contour);
                if (area < this.config.triangleMinArea) continue;

                const bbox = this.getBoundingBox(contour);
                const hull = this.convexHull(contour);

                if (hull.length > 2 && hull.length < 6) { 
                    const confidence = 1 - ((Math.abs(hull.length - 3)) / 3);
                    if (confidence > 0.7) {
                        triangles.push({
                            type: 'TRIANGLE',
                            confidence: confidence,
                            boundingBox: bbox,
                            properties: {
                                angle: this.calculateOrientation(contour)
                            }
                        });
                    }
                }
            }
            return triangles.sort((a, b) => b.confidence - a.confidence);
        } catch (error) {
            console.error('[SHAPE_DETECTOR] Erreur détection triangles:', error);
            return [];
        }
    }

    /**
     * Placeholder pour la détection de lignes (tuyauteries)
     */
    async detectLines(imageData: ImageData): Promise<Detection[]> {
        console.warn('[SHAPE_DETECTOR] detectLines is a placeholder and returns mock data.');
        const mockLines = [
            {
                type: 'LINE' as const,
                confidence: 0.9,
                boundingBox: { x: 50, y: 50, width: 200, height: 2 },
                properties: { start: { x: 50, y: 51 }, end: { x: 250, y: 51 } }
            },
            {
                type: 'LINE' as const,
                confidence: 0.85,
                boundingBox: { x: 250, y: 51, width: 2, height: 150 },
                properties: { start: { x: 251, y: 51 }, end: { x: 251, y: 201 } }
            }
        ];
        return Promise.resolve(mockLines);
    }
  
    /**
     * Conversion en niveaux de gris
     */
    private convertToGrayscale(imageData: ImageData): Uint8ClampedArray {
      const data = imageData.data;
      const gray = new Uint8ClampedArray(imageData.width * imageData.height);
  
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
  
      return gray;
    }
  
    /**
     * Détection simplifiée des contours
     */
    private detectContours(
      grayData: Uint8ClampedArray,
      width: number,
      height: number
    ): Array<{ x: number; y: number }[]> {
      const contours: Array<{ x: number; y: number }[]> = [];
      const visited = new Uint8Array(width * height);
      const threshold = 50; 
  
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          
          if (visited[idx]) continue;
  
          const gradX = Math.abs(
            grayData[idx + 1] - grayData[idx - 1]
          );
          const gradY = Math.abs(
            grayData[idx + width] - grayData[idx - width]
          );
          const gradient = Math.sqrt(gradX * gradX + gradY * gradY);
  
          if (gradient > threshold) {
            const contour = this.traceContour(x, y, grayData, width, height, visited);
            if (contour.length > 10) { 
              contours.push(contour);
            }
          }
        }
      }
  
      return contours;
    }
  
    /**
     * Tracer un contour à partir d'un point de départ
     */
    private traceContour(
      startX: number,
      startY: number,
      grayData: Uint8ClampedArray,
      width: number,
      height: number,
      visited: Uint8Array
    ): Array<{ x: number; y: number }> {
      const contour: Array<{ x: number; y: number }> = [];
      const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
      const threshold = 30;
  
      while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        const idx = y * width + x;
  
        if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;
  
        visited[idx] = 1;
        contour.push({ x, y });
  
        const neighbors = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 },
          { x: x + 1, y: y + 1 },
          { x: x - 1, y: y - 1 },
          { x: x + 1, y: y - 1 },
          { x: x - 1, y: y + 1 }
        ];
  
        for (const neighbor of neighbors) {
          const nIdx = neighbor.y * width + neighbor.x;
          if (
            neighbor.x >= 0 && neighbor.x < width &&
            neighbor.y >= 0 && neighbor.y < height &&
            !visited[nIdx]
          ) {
            const diff = Math.abs(grayData[idx] - grayData[nIdx]);
            if (diff > threshold) {
              stack.push(neighbor);
            }
          }
        }
      }
  
      return contour;
    }
  
    /**
     * Calculer la circularité d'un contour
     */
    private calculateCircularity(contour: Array<{ x: number; y: number }>): number {
      const area = this.calculateContourArea(contour);
      const perimeter = this.calculateContourPerimeter(contour);
  
      if (perimeter === 0) return 0;
  
      const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
      return Math.min(circularity, 1.0);
    }
  
    /**
     * Calculer l'aire d'un contour (méthode du polygone)
     */
    private calculateContourArea(contour: Array<{ x: number; y: number }>): number {
      let area = 0;
      const n = contour.length;
  
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += contour[i].x * contour[j].y;
        area -= contour[j].x * contour[i].y;
      }
  
      return Math.abs(area) / 2;
    }
  
    /**
     * Calculer le périmètre d'un contour
     */
    private calculateContourPerimeter(contour: Array<{ x: number; y: number }>): number {
      let perimeter = 0;
      const n = contour.length;
  
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = contour[j].x - contour[i].x;
        const dy = contour[j].y - contour[i].y;
        perimeter += Math.sqrt(dx * dx + dy * dy);
      }
  
      return perimeter;
    }
  
    private convexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
        const crossProduct = (p1: {x:number, y:number}, p2: {x:number, y:number}, p3: {x:number, y:number}) => {
            return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
        };
    
        if (points.length <= 3) return [...points];
    
        let startPoint = points[0];
        for (let i = 1; i < points.length; i++) {
            if (points[i].y < startPoint.y || (points[i].y === startPoint.y && points[i].x < startPoint.x)) {
                startPoint = points[i];
            }
        }
    
        const sortedPoints = points.slice().sort((a, b) => {
            const order = crossProduct(startPoint, a, b);
            if (order === 0) {
                return (Math.pow(startPoint.x - a.x, 2) + Math.pow(startPoint.y - a.y, 2)) -
                       (Math.pow(startPoint.x - b.x, 2) + Math.pow(startPoint.y - b.y, 2));
            }
            return order > 0 ? -1 : 1;
        });
    
        const hull: Array<{ x: number; y: number }> = [];
        for (const point of sortedPoints) {
            while (hull.length >= 2 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
                hull.pop();
            }
            hull.push(point);
        }
    
        return hull;
    }

    /**
     * Ajuster un cercle à un contour
     */
    private fitCircleToContour(contour: Array<{ x: number; y: number }>): {
      centerX: number;
      centerY: number;
      radius: number;
    } {
      let sumX = 0;
      let sumY = 0;
      
      for (const point of contour) {
        sumX += point.x;
        sumY += point.y;
      }
  
      const centerX = sumX / contour.length;
      const centerY = sumY / contour.length;
  
      let sumRadius = 0;
      for (const point of contour) {
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        sumRadius += Math.sqrt(dx * dx + dy * dy);
      }
  
      const radius = sumRadius / contour.length;
  
      return { centerX, centerY, radius };
    }
  
    /**
     * Obtenir le rectangle englobant d'un contour
     */
    private getBoundingBox(contour: Array<{ x: number; y: number }>): {
      x: number;
      y: number;
      width: number;
      height: number;
    } {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
  
      for (const point of contour) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
  
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
  
    /**
     * Calculer la rectangularité d'un contour
     */
    private calculateRectangularity(contour: Array<{ x: number; y: number }>): number {
      const area = this.calculateContourArea(contour);
      const bbox = this.getBoundingBox(contour);
      const bboxArea = bbox.width * bbox.height;
  
      if (bboxArea === 0) return 0;
  
      return area / bboxArea;
    }
  
    /**
     * Calculer l'orientation d'un contour (angle en degrés)
     */
    private calculateOrientation(contour: Array<{ x: number; y: number }>): number {
      let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
      const n = contour.length;
  
      for (const point of contour) {
        sumX += point.x;
        sumY += point.y;
        sumXX += point.x * point.x;
        sumYY += point.y * point.y;
        sumXY += point.x * point.y;
      }
  
      const centerX = sumX / n;
      const centerY = sumY / n;
  
      const mu20 = sumXX / n - centerX * centerX;
      const mu02 = sumYY / n - centerY * centerY;
      const mu11 = sumXY / n - centerX * centerY;
  
      const angleRad = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
      const angleDeg = (angleRad * 180) / Math.PI;
  
      return angleDeg;
    }
  
    /**
     * Obtenir les informations sur le détecteur
     */
    getInfo() {
      return {
        name: 'SimpleShapeDetector',
        version: '1.1.0',
        capabilities: ['CIRCLE', 'RECTANGLE', 'TRIANGLE', 'LINE'],
        offline: true,
        dependencies: []
      };
    }
  }
