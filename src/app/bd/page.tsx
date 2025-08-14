
"use client";
import React from 'react';

export default function ComicLibraryPage() {

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Bibliothèque de Bandes Dessinées</h1>
      <p className="text-muted-foreground mb-6">
        Cette section est en cours de refonte pour améliorer la stabilité.
      </p>
      <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">Bientôt disponible</h2>
          <p className="text-muted-foreground mt-2">La possibilité de créer et de gérer vos bandes dessinées sera réintroduite prochainement.</p>
      </div>
    </div>
  );
}
