'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { getProcedureById, getProcedures } from '@/lib/procedures-service';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProcedureExecutionView } from '@/components/procedure-execution-view';

// This function tells Next.js which dynamic pages to pre-render at build time.
export async function generateStaticParams() {
    const procedures = getProcedures();
    return procedures.map((proc) => ({
      procedureId: proc.id,
    }));
}


export default function ProcedureExecutionPage({ params }: { params: { procedureId: string }}) {
    const procedureId = params.procedureId;
    const procedure = getProcedureById(procedureId);
    
    if (!procedure) {
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
