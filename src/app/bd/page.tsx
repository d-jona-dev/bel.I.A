
"use client";
import ComicPageEditor from "@/components/ComicPageEditor";

export default function Page() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Éditeur de Planche BD</h1>
      <p className="text-muted-foreground mb-4">Composez votre planche de BD en important des images et en ajoutant des bulles de dialogue.</p>
      <ComicPageEditor />
    </div>
  );
}
