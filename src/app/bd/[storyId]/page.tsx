
"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StoryComicEditorPage() {

  return (
    <div className="p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/bd"><ArrowLeft className="h-4 w-4"/></Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Éditeur de BD</h1>
                <p className="text-muted-foreground">Cette section est en cours de développement.</p>
            </div>
        </div>
         <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">Bientôt disponible</h2>
            <p className="text-muted-foreground mt-2">L'éditeur de bandes dessinées pour cette histoire sera bientôt disponible ici.</p>
        </div>
    </div>
  );
}
