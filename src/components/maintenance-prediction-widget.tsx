
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Wrench, ShieldCheck, Thermometer } from 'lucide-react';
import { PredictiveMaintenance } from '@/lib/predictive/maintenance';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';

interface Prediction {
  failure_probability: number;
  estimated_time_to_failure: number | null;
  recommended_actions: string[];
}

export function MaintenancePredictionWidget({ equipmentId }: { equipmentId: string }) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrediction() {
      if (!equipmentId) return;
      setLoading(true);
      const maintenanceService = new PredictiveMaintenance();
      const result = await maintenanceService.predictFailure(equipmentId);
      setPrediction(result);
      setLoading(false);
    }
    fetchPrediction();
  }, [equipmentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!prediction) {
      return null;
  }

  const healthScore = Math.max(0, 100 - (prediction.failure_probability * 100 * 5)); // Amplify probability for visuals
  let healthColor = "bg-green-500";
  if (healthScore < 75) healthColor = "bg-yellow-500";
  if (healthScore < 50) healthColor = "bg-red-500";
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Thermometer />
            Analyse de Santé Prédictive
        </CardTitle>
        <CardDescription>Analyse de la santé de l'équipement (simulation).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Score de Santé</span>
                <span className={cn("font-bold", healthScore < 50 ? 'text-destructive' : healthScore < 75 ? 'text-yellow-500' : 'text-green-500')}>
                    {healthScore.toFixed(0)}%
                </span>
            </div>
            <Progress value={healthScore} indicatorClassName={cn(healthColor, "transition-colors duration-500")} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-sm border p-3 rounded-md">
                <strong>Probabilité de défaillance (30j):</strong> 
                <p className="font-semibold text-lg mt-1">{(prediction.failure_probability * 100).toFixed(2)}%</p>
            </div>
            {prediction.estimated_time_to_failure && (
                <div className="text-sm border p-3 rounded-md">
                    <strong>Prochaine intervention estimée:</strong> 
                    <p className="font-semibold text-lg mt-1">{prediction.estimated_time_to_failure} heures</p>
                </div>
            )}
        </div>
        <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Wrench /> Actions Recommandées</h4>
            {prediction.recommended_actions.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {prediction.recommended_actions.map((action, index) => (
                        <li key={index}>{action}</li>
                    ))}
                </ul>
            ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-5 w-5 text-green-500" /> 
                    <span>Aucun besoin de maintenance immédiat.</span>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
