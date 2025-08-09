
"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface Bubble {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export default function ImageEditor({
  imageUrl,
}: {
  imageUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubbleIndex, setSelectedBubbleIndex] = useState<number | null>(
    null
  );
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 1. Charger l'image
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous"; // Important pour les images provenant d'autres domaines
    image.src = imageUrl;
    image.onload = () => setImg(image);
    image.onerror = () => console.error("Failed to load image");
  }, [imageUrl]);

  // 2. Dessiner le canvas
  useEffect(() => {
    if (!canvasRef.current || !img) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Adapte la taille du canvas à celle de l'image
    canvas.width = img.width;
    canvas.height = img.height;

    // Dessine l'image de fond
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Dessine chaque bulle
    bubbles.forEach((bubble, index) => {
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;

      // Dessine la bulle
      ctx.beginPath();
      ctx.roundRect(bubble.x, bubble.y, bubble.width, bubble.height, 10);
      ctx.fill();
      ctx.stroke();

      // Dessine le texte
      ctx.fillStyle = "black";
      ctx.font = "16px Arial";
      ctx.textBaseline = "top";
      // Gère le retour à la ligne
      const words = bubble.text.split(' ');
      let line = '';
      let textY = bubble.y + 10;
      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > bubble.width - 20 && n > 0) {
          ctx.fillText(line, bubble.x + 10, textY);
          line = words[n] + ' ';
          textY += 20; // Hauteur de ligne
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, bubble.x + 10, textY);


      // Dessine un contour si la bulle est sélectionnée
      if (index === selectedBubbleIndex) {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(bubble.x, bubble.y, bubble.width, bubble.height);
        ctx.setLineDash([]);
      }
    });
  }, [img, bubbles, selectedBubbleIndex]);

  // 3. Ajouter une bulle
  const addBubble = () => {
    const newBubble: Bubble = {
      x: 50,
      y: 50,
      width: 200,
      height: 80,
      text: "Nouveau texte...",
    };
    setBubbles([...bubbles, newBubble]);
    setSelectedBubbleIndex(bubbles.length);
  };

  // 4. Gérer le clic de la souris
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedBubbleIndex = bubbles.findIndex(
      (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
    );

    if (clickedBubbleIndex !== -1) {
      setSelectedBubbleIndex(clickedBubbleIndex);
      setDragging(true);
      setDragOffset({
        x: x - bubbles[clickedBubbleIndex].x,
        y: y - bubbles[clickedBubbleIndex].y,
      });
    } else {
      setSelectedBubbleIndex(null);
    }
  };

  // 5. Gérer le déplacement
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || selectedBubbleIndex === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const updatedBubbles = [...bubbles];
    updatedBubbles[selectedBubbleIndex].x = x - dragOffset.x;
    updatedBubbles[selectedBubbleIndex].y = y - dragOffset.y;
    setBubbles(updatedBubbles);
  };

  // 6. Gérer le relâchement du clic
  const handleMouseUp = () => {
    setDragging(false);
  };

  // 7. Mettre à jour le texte
  const updateText = (text: string) => {
    if (selectedBubbleIndex === null) return;
    const updatedBubbles = [...bubbles];
    updatedBubbles[selectedBubbleIndex].text = text;
    setBubbles(updatedBubbles);
  };
  
  // 8. Supprimer la bulle
  const deleteBubble = () => {
      if (selectedBubbleIndex === null) return;
      const updatedBubbles = bubbles.filter((_, index) => index !== selectedBubbleIndex);
      setBubbles(updatedBubbles);
      setSelectedBubbleIndex(null);
  }

  // 9. Exporter l'image
  const exportImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "bande_dessinee.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const selectedBubble =
    selectedBubbleIndex !== null ? bubbles[selectedBubbleIndex] : null;

  return (
    <div className="flex flex-col gap-4 items-center p-4 bg-muted/50 rounded-lg">
      <div className="w-full max-w-3xl overflow-auto border rounded-md">
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: dragging ? "grabbing" : "default" }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={addBubble}>➕ Ajouter une bulle</Button>
        <Button onClick={exportImage} variant="default">
          💾 Exporter en PNG
        </Button>
      </div>

      {selectedBubble && (
        <div className="w-full p-3 border rounded-md bg-background space-y-3">
            <h3 className="font-semibold">Éditer la bulle sélectionnée</h3>
            <Textarea
              value={selectedBubble.text}
              onChange={(e) => updateText(e.target.value)}
              placeholder="Écrivez votre dialogue ici..."
              rows={3}
            />
            <Button onClick={deleteBubble} variant="destructive" size="sm">
                🗑️ Supprimer la bulle
            </Button>
        </div>
      )}
    </div>
  );
}
