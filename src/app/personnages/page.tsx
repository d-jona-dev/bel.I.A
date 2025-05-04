
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus } from 'lucide-react';

export default function PersonnagesPage() {
  // Placeholder data - replace with actual logic to fetch saved NPCs
  const savedNPCs = [
    { id: 'rina-1', name: 'Rina', details: 'Jeune femme de 19 ans, petite amie du PJ.', portraitUrl: '/placeholder-npc-1.png', origin: 'Aventure à Hight School' },
    { id: 'kentaro-1', name: 'Kentaro', details: 'Meilleur ami du PJ, mais semble suspect.', portraitUrl: null, origin: 'Aventure à Hight School' },
    { id: 'goblin-chief', name: 'Chef Gobelin Grung', details: 'Chef brutal d\'une tribu gobeline locale.', portraitUrl: '/placeholder-npc-2.png', origin: 'Exploration de la Forêt' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Personnages Secondaires</h1>
        <div className="flex gap-2">
           <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Importer un Personnage
          </Button>
          <Button disabled> {/* Implement create/edit functionality */}
            <UserPlus className="mr-2 h-4 w-4" /> Créer un Personnage
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Gérez les personnages secondaires que vous avez rencontrés ou créés. Vous pourrez les réutiliser dans d'autres aventures.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]"> {/* Adjust height as needed */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedNPCs.length > 0 ? (
            savedNPCs.map((npc) => (
              <Card key={npc.id}>
                <CardHeader className="flex flex-row items-center gap-4">
                   <Avatar className="h-12 w-12">
                      {npc.portraitUrl ? (
                        <AvatarImage src={npc.portraitUrl} alt={npc.name} data-ai-hint={`${npc.name} npc portrait`} />
                      ) : (
                        <AvatarFallback>{npc.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                   <div className="flex-1">
                    <CardTitle>{npc.name}</CardTitle>
                     <CardDescription>
                        Origine : {npc.origin}
                     </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{npc.details}</p>
                   {/* Add more details if needed, e.g., last known location, relationship */}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" disabled> {/* Implement edit */}
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                  <Button variant="destructive" size="sm" disabled> {/* Implement delete */}
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                  {/* Potentially add a button to "Add to current adventure" if applicable */}
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucun personnage secondaire sauvegardé pour le moment.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
