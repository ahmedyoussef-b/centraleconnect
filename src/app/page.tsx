
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, Users, Glasses, Eye, ShieldQuestion, DatabaseZap, WifiOff, Target } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link href="/" className="flex items-center justify-center">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="ml-2 font-semibold">CentraleConnect</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button asChild>
            <Link href="/dashboard">
              Accéder à l'application
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    L'Analyse Visuelle, au-delà de l'image.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Transformez chaque photo de terrain en une donnée structurée, analysable et traçable. Capturez l'expertise de vos agents avant qu'elle ne disparaisse.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/dashboard">
                      Lancer une analyse
                    </Link>
                  </Button>
                </div>
              </div>
              <img
                src="https://picsum.photos/seed/industrial-eye/600/400"
                width="600"
                height="400"
                alt="Industrial Vision"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                data-ai-hint="industrial technology"
              />
            </div>
          </div>
        </section>

        {/* Before/After Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Impact sur la Connaissance Industrielle</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">De la Mémoire à la Base de Connaissances</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Ne laissez plus l'expertise critique s'évaporer. Capitalisez sur chaque observation.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-2 mt-12">
              <Card className="bg-red-900/10 border-red-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400"><Users className="h-8 w-8" />AVANT : La Connaissance Orale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-red-200/80">
                  <p>• Expertise concentrée dans la tête des anciens.</p>
                  <p>• "On avait déjà vu ça, mais je ne sais plus quand..."</p>
                  <p>• Départs à la retraite = perte sèche de savoir-faire.</p>
                  <p>• Photo = preuve morte, isolée sur un téléphone.</p>
                </CardContent>
              </Card>
              <Card className="bg-green-900/10 border-green-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-400"><BrainCircuit className="h-8 w-8" />APRÈS : L'Expertise Augmentée</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-green-200/80">
                  <p>• Base de connaissance visuelle, centralisée et RECHERCHABLE.</p>
                  <p>• "Montre-moi toutes les fuites similaires sur CR1 depuis 2019."</p>
                  <p>• L'IA apprend des experts et diffuse l'expertise à tous.</p>
                  <p>• Photo = donnée structurée, contextualisée et traçable.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Commercial Arguments Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
             <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                    <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Argumentaire Stratégique</div>
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Une Valeur Ajoutée pour Chaque Rôle</h2>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Chaque acteur de la centrale bénéficie directement de la vision par ordinateur.
                    </p>
                </div>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3 mt-12">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Target className="w-8 h-8"/>
                  <div>
                    <CardTitle>Directeur Technique</CardTitle>
                    <CardDescription>Pérenniser l'expertise</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">"Vos meilleurs experts partent à la retraite avec leurs yeux. On capture leur regard avant qu'il ne disparaisse."</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Glasses className="w-8 h-8"/>
                  <div>
                    <CardTitle>Responsable Terrain</CardTitle>
                    <CardDescription>Optimiser les interventions</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">"Fini les 'je viens voir'. Votre technicien devient l'œil expert, vous restez au chaud."</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Eye className="w-8 h-8"/>
                  <div>
                    <CardTitle>Opérateur</CardTitle>
                    <CardDescription>Simplifier le quotidien</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">"Tu prends une photo, l'IA te dit ce que c'est. Tu annotes une fois, elle reconnaît toute seule la prochaine."</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <ShieldQuestion className="w-8 h-8"/>
                  <div>
                    <CardTitle>Responsable QHSE</CardTitle>
                    <CardDescription>Assurer la traçabilité</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">"Chaque photo est horodatée, signée, tracée. Plus de WhatsApp, plus de preuves perdues."</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <DatabaseZap className="w-8 h-8"/>
                  <div>
                    <CardTitle>DSI / IT</CardTitle>
                    <CardDescription>Garantir la résilience</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">"Hors-ligne natif. Ça marche même dans les zones blanches du site."</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
