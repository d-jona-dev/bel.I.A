
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Upload, Settings, HomeIcon, Scroll, UserCircle, Users2, PawPrint, Clapperboard, Bot } from 'lucide-react';
import { GlobalNav } from '@/components/global-nav'; // NEW: Import the global nav
import { i18n, type Language } from '@/lib/i18n'; // NEW: Import i18n

export default function CreationAssisteeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This state will be managed by GlobalNav but we can still read from it if needed
  const [currentLanguage, setCurrentLanguage] = React.useState<Language>('fr');
  const lang = i18n[currentLanguage] || i18n.fr;

  return (
    <>
      {/* NEW: Use the centralized GlobalNav component */}
      <GlobalNav 
        activePath="/histoires" 
        currentLanguage={currentLanguage} 
        setCurrentLanguage={setCurrentLanguage} 
        showAssistedCreation={false}
      />

      <SidebarInset className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <SidebarTrigger />
            <span className="font-semibold">{lang.assistedCreationTitle}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
            {children}
        </main>
      </SidebarInset>
    </>
  );
}

    