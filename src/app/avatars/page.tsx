
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, Edit, UserPlus, CheckCircle } from 'lucide-react';

export default function AvatarsPage() {
  // Placeholder data - replace with actual logic to fetch saved avatars
  const savedAvatars = [
    { id: 'avatar1', name: 'Alexandre le Brave', details: 'Guerrier expérimenté, loyal et juste.', portraitUrl: '/placeholder-avatar-1.png', class: 'Guerrier', level: 5 },
    { id: 'avatar2', name: 'Elara l\'Érudite', details: 'Mage curieuse, spécialisée dans les arcanes.', portraitUrl: null, class: 'Mage', level: 3 },
    { id: 'avatar3', name: 'Kael le Furtif', details: 'Assassin agile et discret.', portraitUrl: '/placeholder-avatar-2.png', class: 'Voleur', level: 7 },
  ];

  const currentAvatarId = 'avatar1'; // Placeholder for the currently selected avatar

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Avatars Joueur</h1>
        <div className="flex gap-2">
           <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Importer un Avatar
          </Button>
          <Button disabled> {/* Implement create/edit functionality */}
            <UserPlus className="mr-2 h-4 w-4" /> Créer un Avatar
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">
        Sélectionnez l'avatar que vous souhaitez incarner dans vos aventures.
      </p>

      <ScrollArea className="h-[calc(100vh-240px)]"> {/* Adjust height as needed */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedAvatars.length > 0 ? (
            savedAvatars.map((avatar) => (
              <Card key={avatar.id} className={avatar.id === currentAvatarId ? 'border-primary' : ''}>
                <CardHeader className="flex flex-row items-center gap-4">
                   <Avatar className="h-16 w-16">
                      {avatar.portraitUrl ? (
                        <AvatarImage src={avatar.portraitUrl} alt={avatar.name} data-ai-hint={`${avatar.name} avatar portrait`} />
                      ) : (
                        <AvatarFallback>{avatar.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                   <div className="flex-1">
                    <CardTitle>{avatar.name}</CardTitle>
                     <CardDescription>
                       {avatar.class} - Niveau {avatar.level}
                     </CardDescription>
                  </div>
                   {avatar.id === currentAvatarId && <CheckCircle className="h-6 w-6 text-primary" />}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{avatar.details}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" disabled> {/* Implement edit */}
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                  <Button variant="destructive" size="sm" disabled> {/* Implement delete */}
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                   {avatar.id !== currentAvatarId && (
                    <Button variant="outline" size="sm" disabled> {/* Implement select */}
                        Sélectionner
                    </Button>
                   )}
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">
              Aucun avatar sauvegardé. Créez votre premier personnage !
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
