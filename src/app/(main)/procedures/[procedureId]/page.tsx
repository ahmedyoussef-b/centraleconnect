
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { getProcedureById } from '@/lib/procedures-service';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProcedureExecutionView } from '@/components/procedure-execution-view';
import type { Procedure } from '@/types/db';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProcedureExecutionPage({ params }: { params: { procedureId: string }}) {
    const procedureId = params.procedureId;
    const [procedure, setProcedure] = useState<Procedure | null | undefined>(undefined);
    
    useEffect(() => {
        if (procedureId) {
            getProcedureById(procedureId).then(proc => {
                setProcedure(proc ?? null);
            });
        }
    }, [procedureId]);
    
    if (procedure === undefined) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <Skeleton className="h-8 w-1/2 mb-2" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (procedure === null) {
        notFound();
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                             <Button variant="ghost" size="sm" className="mb-2" asChild>
                                <Link href="/procedures">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Retour aux procédures
                                </Link>
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck />
                                {procedure.name}
                            </CardTitle>
                            <CardDescription>{procedure.description}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <ProcedureExecutionView procedure={procedure} />
            </Card>
        </div>
    );
}
