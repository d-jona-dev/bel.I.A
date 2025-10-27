// src/app/histoires/layout.tsx
"use client"; // Add 'use client' directive

import * as React from 'react';
import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Upload, Settings, HomeIcon, Scroll, UserCircle, Users2, PawPrint, Clapperboard, Shirt } from 'lucide-react';
import { i18n, type Language } from '@/lib/i18n';

export default function HistoiresLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
  const lang = i18n[currentLanguage] || i18n.fr;

  React.useEffect(() => {
    const savedLanguage = localStorage.getItem('adventure_language') as Language;
    if (savedLanguage && i18n[savedLanguage]) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Load triggered from histoires layout", event.target.files);
     // TODO: Implement actual load logic if needed here, or manage globally
  };


  return (
    <>
      {/* Left Sidebar: Global Actions & Navigation */}
       <Sidebar side="left" variant="sidebar" collapsible="icon">
         <SidebarHeader className="p-4 border-b border-sidebar-border">
           <h1 className="text-xl font-semibold text-sidebar-foreground">Bel.I.A.</h1>
         </SidebarHeader>
         <ScrollArea className="flex-1">
            <SidebarContent className="p-4 space-y-4">
               {/* Navigation Links */}
               <nav className="space-y-2">
                  <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Link href="/">
                           <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label={lang.currentAdventureTooltip}>
                             <HomeIcon className="h-5 w-5" />
                             <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.adventurePageTitle}</span>
                           </Button>
                         </Link>
                       </TooltipTrigger>
                        <TooltipContent side="right" align="center">{lang.currentAdventureTooltip}</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/histoires">
                             <Button variant="secondary" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label={lang.manageStoriesTooltip}> {/* Active style */}
                                <Scroll className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.manageStoriesTooltip}</span>
                             </Button>
                          </Link>
                       </TooltipTrigger>
                        <TooltipContent side="right" align="center">{lang.manageStoriesTooltip}</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/bd">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label={lang.comicEditorTooltip}>
                                <Clapperboard className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.comicEditorTooltip}</span>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">{lang.comicEditorTooltip}</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                 <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/penderie">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label={lang.wardrobeTooltip}>
                                <Shirt className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.wardrobeTooltip}</span>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">{lang.wardrobeTooltip}</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                 <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/avatars">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label={lang.playerAvatarsTooltip}>
                                <UserCircle className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.playerAvatarsTooltip}</span>
                             </Button>
                          </Link>
                       </TooltipTrigger>
                       <TooltipContent side="right" align="center">{lang.playerAvatarsTooltip}</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/personnages">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label={lang.secondaryCharactersTooltip}>
                                <Users2 className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.secondaryCharactersTooltip}</span>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">{lang.secondaryCharactersTooltip}</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
               </nav>

           </SidebarContent>
         </ScrollArea>
         <SidebarFooter className="p-4 border-t border-sidebar-border flex flex-col space-y-2">
             {/* Load Button */}
             <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                          <Button variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center" onClick={() => fileInputRef.current?.click()}>
                             <Upload className="h-5 w-5" />
                             <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.loadButtonLabel}</span>
                         </Button>
                     </TooltipTrigger>
                     <TooltipContent side="right" align="center">{lang.loadAdventureTooltip}</TooltipContent>
                  </Tooltip>
             </TooltipProvider>
             {/* Hidden file input */}
             <input
                 type="file"
                 ref={fileInputRef}
                 accept=".json"
                 onChange={handleLoad}
                 className="hidden"
             />
            {/* Settings Button (placeholder) */}
            <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" disabled>
                   <Settings className="h-5 w-5" />
                   <span className="ml-2 group-data-[collapsible=icon]:hidden">{lang.settingsButtonLabel}</span>
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="right" align="center">{lang.globalSettingsTooltip}</TooltipContent>
             </Tooltip>
            </TooltipProvider>
         </SidebarFooter>
       </Sidebar>

       {/* Main Content Area */}
       <SidebarInset className="flex flex-col h-screen">
         <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center space-x-2">
              <SidebarTrigger /> {/* Trigger for Left Sidebar */}
              <span className="font-semibold">{lang.manageStoriesTooltip}</span> {/* Updated title */}
            </div>
           {/* Add header actions if needed */}
         </header>
         <main className="flex-1 overflow-auto"> {/* Changed to overflow-auto */}
             {children} {/* The content of /histoires/page.tsx will be rendered here */}
         </main>
       </SidebarInset>

       {/* No right sidebar needed for this layout, or add if necessary */}
     </>
  );
}
