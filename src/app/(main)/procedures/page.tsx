
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function ProceduresPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck />
                    Procédures
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
                    <p className="text-center text-muted-foreground">
                        La fonctionnalité de procédures guidées interactives sera implémentée prochainement.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
