"use client";

import * as React from 'react';
import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Upload, Settings, HomeIcon, Scroll, UserCircle, Users2, PawPrint, Clapperboard, Bot } from 'lucide-react';

export default function CreationAssisteeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder for future implementation
  };

  return (
    <>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Aventurier Textuel</h1>
        </SidebarHeader>
        <ScrollArea className="flex-1">
          <SidebarContent className="p-4 space-y-4">
            <nav className="space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/">
                      <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                        <HomeIcon className="h-5 w-5" />
                        <span className="ml-2 group-data-[collapsible=icon]:hidden">Aventure</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">Aventure Actuelle</TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/histoires">
                        <Button variant="secondary" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                          <Scroll className="h-5 w-5" />
                          <span className="ml-2 group-data-[collapsible=icon]:hidden">Histoires</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">Gérer les Histoires</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Other nav items can be added here, they are removed for brevity in this example */}
            </nav>
          </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-4 border-t border-sidebar-border flex flex-col space-y-2">
          {/* Footer items like Load/Settings can be added here */}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <SidebarTrigger />
            <span className="font-semibold">Création Assistée par IA</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
            {children}
        </main>
      </SidebarInset>
    </>
  );
}
