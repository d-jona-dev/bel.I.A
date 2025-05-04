
// src/app/avatars/layout.tsx
"use client"; // Add 'use client' directive

import * as React from 'react';
import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Upload, Settings, HomeIcon, Scroll, UserCircle, Users2 } from 'lucide-react';

export default function AvatarsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ref for file input (can be null if not needed on this specific layout)
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Placeholder handlers if needed, otherwise pass null or undefined
  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Load triggered from avatars layout", event.target.files);
     // TODO: Implement actual load logic if needed here, or manage globally
  };


  return (
    <>
      {/* Left Sidebar: Global Actions & Navigation */}
       <Sidebar side="left" variant="sidebar" collapsible="icon">
         <SidebarHeader className="p-4 border-b border-sidebar-border">
           <h1 className="text-xl font-semibold text-sidebar-foreground">Aventurier Textuel</h1>
         </SidebarHeader>
         <ScrollArea className="flex-1">
            <SidebarContent className="p-4 space-y-4">
               {/* Navigation Links */}
               <nav className="space-y-2">
                  <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Link href="/">
                           <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Aventure Actuelle">
                             <HomeIcon className="h-5 w-5" />
                             <span className="ml-2 group-data-[collapsible=icon]:hidden">Aventure</span>
                           </Button>
                         </Link>
                       </TooltipTrigger>
                        <TooltipContent side="right" align="center">Aventure Actuelle</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/histoires">
                             <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Histoires Sauvegardées">
                                <Scroll className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">Histoires</span>
                             </Button>
                          </Link>
                       </TooltipTrigger>
                        <TooltipContent side="right" align="center">Gérer les Histoires</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                 <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/avatars">
                            <Button variant="secondary" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Avatars Joueur"> {/* Active style */}
                                <UserCircle className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">Avatars</span>
                             </Button>
                          </Link>
                       </TooltipTrigger>
                       <TooltipContent side="right" align="center">Gérer les Avatars Joueur</TooltipContent>
                     </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Link href="/personnages">
                            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Personnages Secondaires">
                                <Users2 className="h-5 w-5" />
                                <span className="ml-2 group-data-[collapsible=icon]:hidden">Personnages</span>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">Gérer les Personnages Secondaires</TooltipContent>
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
                             <span className="ml-2 group-data-[collapsible=icon]:hidden">Charger</span>
                         </Button>
                     </TooltipTrigger>
                     <TooltipContent side="right" align="center">Charger une Aventure/Personnage (JSON)</TooltipContent>
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
                   <span className="ml-2 group-data-[collapsible=icon]:hidden">Paramètres (Future)</span>
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="right" align="center">Paramètres Globaux (non implémenté)</TooltipContent>
             </Tooltip>
            </TooltipProvider>
         </SidebarFooter>
       </Sidebar>

       {/* Main Content Area */}
       <SidebarInset className="flex flex-col h-screen">
         <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center space-x-2">
              <SidebarTrigger /> {/* Trigger for Left Sidebar */}
              <span className="font-semibold">Avatars</span> {/* Updated title */}
            </div>
           {/* Add header actions if needed */}
         </header>
         <main className="flex-1 overflow-auto"> {/* Changed to overflow-auto */}
             {children} {/* The content of /avatars/page.tsx will be rendered here */}
         </main>
       </SidebarInset>

       {/* No right sidebar needed for this layout, or add if necessary */}
     </>
  );
}
