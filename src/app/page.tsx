import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Save, Upload, Image as ImageIcon, Bot, Languages, Users, Map, Wand2, Settings } from 'lucide-react';
import { AdventureForm } from '@/components/adventure-form';
import { AdventureDisplay } from '@/components/adventure-display';
import { ModelLoader } from '@/components/model-loader';
import { LanguageSelector } from "@/components/language-selector";

// Import AI functions here in the Server Component
import { generateAdventure } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";

export default function Home() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Aventurier Textuel</h1>
        </SidebarHeader>
        <ScrollArea className="flex-1">
           <SidebarContent className="p-4 space-y-4">
            <ModelLoader />
            <AdventureForm />
            <div>
              <Label htmlFor="inventory">Inventaire (Future)</Label>
              <Card className="mt-2">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Fonctionnalité d'inventaire à venir...
                </CardContent>
              </Card>
            </div>
             <div>
              <Label htmlFor="characters">Personnages (Future)</Label>
              <Card className="mt-2">
                <CardContent className="p-4 text-sm text-muted-foreground">
                 Gestion des personnages à venir...
                </CardContent>
              </Card>
            </div>
          </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                  <Settings className="h-5 w-5" />
                  <span className="ml-2 group-data-[collapsible=icon]:hidden">Paramètres</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">Paramètres</TooltipContent>
            </Tooltip>
           </TooltipProvider>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            {/* Pass translateText function as prop */}
            <LanguageSelector translateTextAction={translateText} />
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Save className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                 <TooltipContent>Sauvegarder l'aventure (Future)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>
        <main className="flex-1 overflow-hidden flex flex-col p-4">
           {/* Pass AI functions as props */}
          <AdventureDisplay
            generateAdventureAction={generateAdventure}
            generateSceneImageAction={generateSceneImage}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
