
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Play, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function HistoiresPage() {
  // Placeholder data - replace with actual logic to fetch saved stories
  const savedStories = [
    { id: 'story1', title: 'Aventure à Hight School of Future', date: '2024-05-01', description: 'Le début de l\'intrigue avec Rina et Kentaro...' },
    { id: 'story2', title: 'Exploration de la Forêt Interdite', date: '2024-04-25', description: 'Une quête parallèle dans un monde fantastique...' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Histoires</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Importer une Histoire
          </Button>
          <Link href="/">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Aventure
            </Button>
          </Link>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]"> {/* Adjust height as needed */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedStories.length > 0 ? (
            savedStories.map((story) => (
              <Card key={story.id}>
                <CardHeader>
                  <CardTitle>{story.title}</CardTitle>
                  <CardDescription>Sauvegardée le {story.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{story.description}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                   {/* In a real app, clicking Play would load the story state */}
                   <Button variant="outline" size="sm" disabled>
                    <Play className="mr-2 h-4 w-4" /> Continuer
                  </Button>
                  <Button variant="destructive" size="sm" disabled>
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucune histoire sauvegardée pour le moment. Commencez une nouvelle aventure !
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
