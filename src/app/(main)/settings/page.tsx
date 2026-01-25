
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings />
                    Paramètres
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
                    <p className="text-center text-muted-foreground">
                        La page des paramètres sera implémentée prochainement.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
