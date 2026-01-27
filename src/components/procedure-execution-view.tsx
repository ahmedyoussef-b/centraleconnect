
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Info, ChevronsUpDown } from 'lucide-react';
import type { Procedure, ProcedureStep } from '@/types/db';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addLogEntry } from '@/lib/db-service';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";


function StepRenderer({
  step,
  completedSteps,
  onToggle,
  isTauri
}: {
  step: ProcedureStep;
  completedSteps: Set<string>;
  onToggle: (step: ProcedureStep, isCompleted: boolean) => void;
  isTauri: boolean;
}) {
  const isCompleted = completedSteps.has(step.id);

  if (step.type === 'group') {
    const allSubsteps = step.steps ?? [];
    const completedSubsteps = allSubsteps.filter(s => completedSteps.has(s.id)).length;
    const isGroupCompleted = completedSubsteps === allSubsteps.length && allSubsteps.length > 0;

    return (
      <Collapsible defaultOpen={true} className="rounded-md border">
        <div className={cn("flex items-center space-x-4 p-4 transition-colors", isGroupCompleted ? 'bg-green-500/10' : 'bg-card')}>
           <CollapsibleTrigger asChild>
             <Button variant="ghost" size="sm" className="w-9 p-0">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
           </CollapsibleTrigger>
          <h4 className="text-sm font-semibold">{step.title} ({completedSubsteps}/{allSubsteps.length})</h4>
        </div>
        <CollapsibleContent className="space-y-2 py-2 pl-8 border-l ml-6">
          {allSubsteps.map(subStep => (
            <StepRenderer key={subStep.id} step={subStep} completedSteps={completedSteps} onToggle={onToggle} isTauri={isTauri} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border p-3 pl-4 transition-colors',
        isCompleted ? 'border-transparent bg-muted/60' : 'bg-card'
      )}
    >
      <Checkbox
        id={step.id}
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(step, !!checked)}
        className="mt-1 h-5 w-5"
        disabled={!isTauri}
      />
      <div className="grid gap-1">
        <label
          htmlFor={step.id}
          className={cn(
            'cursor-pointer font-medium',
            isCompleted && 'text-muted-foreground line-through'
          )}
        >
          {step.title}
        </label>
        {step.details && (
          <p className="text-sm text-muted-foreground">{step.details}</p>
        )}
      </div>
    </div>
  );
}


export function ProcedureExecutionView({ procedure }: { procedure: Procedure }) {
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
    const [isTauri, setIsTauri] = useState(false);
    const { toast } = useToast();
    const procedureId = procedure.id;

    useEffect(() => {
        const tauriEnv = !!window.__TAURI__;
        setIsTauri(tauriEnv);

        if (tauriEnv) {
            const savedState = localStorage.getItem(`procedure_${procedureId}_completed`);
            if (savedState) {
                setCompletedSteps(new Set(JSON.parse(savedState)));
            }
        }
    }, [procedureId]);

    const allCheckableSteps = useMemo(() => {
        if (!procedure) return [];
        const steps: ProcedureStep[] = [];
        const collectSteps = (step: ProcedureStep) => {
            if (step.type === 'check') {
                steps.push(step);
            }
            if (step.steps) {
                step.steps.forEach(collectSteps);
            }
        };
        procedure.steps.forEach(collectSteps);
        return steps;
    }, [procedure]);

    const progress = useMemo(() => {
        if (allCheckableSteps.length === 0) return 0;
        const completedCount = allCheckableSteps.filter(s => completedSteps.has(s.id)).length;
        return (completedCount / allCheckableSteps.length) * 100;
    }, [completedSteps, allCheckableSteps]);

    const handleToggleStep = async (step: ProcedureStep, isCompleted: boolean) => {
        const newCompletedSteps = new Set(completedSteps);
        if (isCompleted) {
            newCompletedSteps.add(step.id);
        } else {
            newCompletedSteps.delete(step.id);
        }
        setCompletedSteps(newCompletedSteps);

        localStorage.setItem(`procedure_${procedureId}_completed`, JSON.stringify(Array.from(newCompletedSteps)));
        
        try {
            await addLogEntry({
                type: 'MANUAL',
                source: 'Opérateur 1',
                message: `Procédure '${procedure?.name}': Étape '${step.title}' marquée comme ${isCompleted ? 'terminée' : 'non terminée'}.`
            });
        } catch(e) {
            console.error("Failed to log step change", e);
            toast({
                variant: "destructive",
                title: "Erreur d'enregistrement",
                description: "L'action n'a pas pu être enregistrée dans le journal de bord."
            })
        }
    };
    
    return (
        <>
            <div className="px-6">
                <div className="flex items-center justify-end text-right">
                    <div>
                        <span className="font-bold text-lg">{Math.round(progress)}%</span>
                        <p className="text-sm text-muted-foreground">Terminé</p>
                    </div>
                </div>
                <Progress value={progress} className="mt-2" />
            </div>
            <CardContent className="space-y-2">
                {!isTauri && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                        <Info className="h-5 w-5" />
                        L'enregistrement de la progression est désactivé en mode web. La fonctionnalité complète est disponible dans l'application de bureau.
                    </div>
                )}
                {procedure.steps.map(step => (
                    <StepRenderer key={step.id} step={step} completedSteps={completedSteps} onToggle={handleToggleStep} isTauri={isTauri} />
                ))}
            </CardContent>
        </>
    );
}
