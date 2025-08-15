
"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Download, X, Edit, Trash2, ArrowLeft, ArrowRight, BookPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Bubble, Panel } from "@/types";

// This type is now defined locally as it's only used here.
export interface ComicPage {
    id: string;
    panels: Panel[];
    gridCols: number;
};

/* Util */
const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);

export const createNewPage = (cols = 2, numPanels = 4): ComicPage => ({
    id: uid(),
    gridCols: cols,
    panels: Array.from({ length: numPanels }, () => ({ id: uid(), imageUrl: null, bubbles: [] }))
});


/* Drawing logic helpers (now exported) */
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });

const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
};

const drawBubble = (ctx: CanvasRenderingContext2D, b: Bubble, scale = 1) => {
    const dash = b.type === "pensée" ? [6, 4] : b.type === "chuchotement" ? [2, 3] : [];
    const color = b.type === "cri" ? "#b00" : "#000";
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = color;
    ctx.lineWidth = (b.type === "cri" ? 4 : 2) * scale;
    if (dash.length) ctx.setLineDash(dash);
    roundRectPath(ctx, b.x, b.y, b.w, b.h, 12 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#000";
    const fontSize = Math.max(12, Math.min(18, b.w / 10)) * scale;
    ctx.font = `${fontSize}px sans-serif`;
    wrapText(ctx, b.text, b.x + 8 * scale, b.y + 22 * scale, b.w - 16 * scale, (fontSize + 4) * scale);
    ctx.restore();
};

const renderPanelToCanvas = async (panel: Panel, width: number, height: number): Promise<HTMLCanvasElement> => {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    if (panel.imageUrl) {
      try {
        const img = await loadImage(panel.imageUrl);
        const scale = Math.max(width / img.width, height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      } catch (e) {
         console.error("Failed to load image for panel:", panel.imageUrl, e);
         ctx.fillStyle = "#eee";
         ctx.fillRect(0, 0, width, height);
         ctx.fillStyle = "#999";
         ctx.textAlign = "center";
         ctx.fillText("Image error", width / 2, height / 2);
      }
    } else {
      ctx.fillStyle = "#eee";
      ctx.fillRect(0, 0, width, height);
    }
    panel.bubbles.forEach((b) => drawBubble(ctx, b));
    return c;
  };

export const exportPageAsJpeg = async (page: ComicPage, pageIndex: number, toast: (options: any) => void, pageWidth = 1200, pageHeight = 1700, scale = 2) => {
    toast({ title: "Exportation en cours...", description: `Génération de votre planche en JPEG.` });
    
    const gutterWidth = 10;
    const rows = Math.ceil(page.panels.length / page.gridCols);
    
    const totalGutterWidth = (page.gridCols - 1) * gutterWidth;
    const totalGutterHeight = (rows - 1) * gutterWidth;

    const panelW = Math.floor((pageWidth - totalGutterWidth) / page.gridCols);
    const panelH = Math.floor((pageHeight - totalGutterHeight) / rows);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = pageWidth * scale;
    outCanvas.height = pageHeight * scale;
    const outCtx = outCanvas.getContext("2d")!;
    outCtx.scale(scale, scale);
    outCtx.fillStyle = "#fff";
    outCtx.fillRect(0, 0, pageWidth, pageHeight);

    for (let i = 0; i < page.panels.length; i++) {
      const panel = page.panels[i];
      const r = Math.floor(i / page.gridCols);
      const c = i % page.gridCols;
      
      const x = c * (panelW + gutterWidth);
      const y = r * (panelH + gutterWidth);
      
      try {
        const panelCanvas = await renderPanelToCanvas(panel, panelW, panelH);
        outCtx.drawImage(panelCanvas, x, y, panelW, panelH);
        
        outCtx.strokeStyle = "#222";
        outCtx.lineWidth = 2;
        outCtx.strokeRect(x, y, panelW, panelH);
        
      } catch (e) {
        console.error(`Error rendering panel ${i}`, e);
        outCtx.fillStyle = "red";
        outCtx.fillRect(x,y, panelW, panelH);
        outCtx.fillStyle = "white";
        outCtx.fillText(`Erreur panneau ${i+1}`, x + 10, y + 20);
      }
    }

    const mimeType = 'image/jpeg';
    const link = document.createElement("a");
    link.download = `planche_bd_${pageIndex + 1}.jpeg`;
    link.href = outCanvas.toDataURL(mimeType, 0.9);
    link.click();
    toast({ title: "Exportation terminée", description: `La planche ${pageIndex + 1} a été téléchargée en JPEG.` });
};


/* Component */
export default function ComicPageEditor({
  pages: initialPages,
  onPagesChange,
  pageWidth = 1200,
  pageHeight = 1700,
}: {
  pages: ComicPage[];
  onPagesChange: (pages: ComicPage[]) => void;
  pageWidth?: number;
  pageHeight?: number;
}) {
  const { toast } = useToast();
  // No longer maintains its own state, works directly with props
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

  const currentPage = initialPages[currentPageIndex];

  const updateCurrentPage = (updater: (page: ComicPage) => ComicPage) => {
     const newPages = initialPages.map((page, index) => 
        index === currentPageIndex ? updater(page) : page
    );
    onPagesChange(newPages);
  }

  const setPanelImage = (panelId: string, url: string | null) => {
    updateCurrentPage(page => ({
        ...page,
        panels: page.panels.map((x) => (x.id === panelId ? { ...x, imageUrl: url, bubbles: [] } : x))
    }));
  };

  /* UI handlers */
  const handleFileForPanel = (panelId: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPanelImage(panelId, e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const selectedPanelData = currentPage?.panels.find((p) => p.id === selectedPanelId);

  if (!currentPage) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground">Aucune planche à afficher.</p>
            <Button onClick={() => onPagesChange([createNewPage()])} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Créer la première planche
            </Button>
        </div>
    );
  }

  const rows = Math.ceil(currentPage.panels.length / currentPage.gridCols);
  const previewW = Math.floor(600 / currentPage.gridCols);
  const previewH = Math.floor(850 / rows);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentPageIndex(p => Math.max(0, p-1))} disabled={currentPageIndex === 0}><ArrowLeft className="h-4 w-4"/></Button>
            <span className="text-sm font-medium w-24 text-center">Planche {currentPageIndex+1} / {initialPages.length}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentPageIndex(p => Math.min(initialPages.length-1, p+1))} disabled={currentPageIndex === initialPages.length - 1}><ArrowRight className="h-4 w-4"/></Button>
          </div>
           <div className="flex items-center gap-2">
            <Label htmlFor="grid-cols-input">Colonnes :</Label>
            <Input
              id="grid-cols-input"
              type="number"
              min={1} max={4}
              value={currentPage.gridCols}
              onChange={(e) => updateCurrentPage(p => ({...p, gridCols: Math.max(1, Math.min(4, Number(e.target.value)))}))}
              className="w-20"
            />
          </div>
          <Button onClick={() => updateCurrentPage(p => ({...p, panels: [...p.panels, { id: uid(), imageUrl: null, bubbles: [] }] }))}>
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter panneau
          </Button>
           <Button onClick={() => onPagesChange([...initialPages, createNewPage(initialPages[initialPages.length-1]?.gridCols || 2)])}>
            <BookPlus className="mr-2 h-4 w-4" /> Ajouter planche vierge
          </Button>
          <Button onClick={() => exportPageAsJpeg(currentPage, currentPageIndex, toast)} variant="secondary">
            <Download className="mr-2 h-4 w-4" /> Exporter Planche (JPEG)
          </Button>
        </CardContent>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${currentPage.gridCols}, 1fr)`, gap: 16 }}>
        {currentPage.panels.map((panel, index) => (
          <Card key={panel.id} className="overflow-hidden">
            <CardContent className="p-2 space-y-2">
              <div style={{ height: previewH, position: "relative", background: "#f8f8f8", borderRadius: '4px' }}>
                <PanelPreview panel={panel} width={previewW} height={previewH} />
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files?.[0]) handleFileForPanel(panel.id, target.files[0]);
                    };
                    input.click();
                 }}>Importer Image</Button>
                <Button variant="secondary" size="sm" onClick={() => { setSelectedPanelId(panel.id); setIsEditorOpen(true); }}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => updateCurrentPage(p => ({...p, panels: p.panels.filter((x) => x.id !== panel.id)}))}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[90vw] w-full h-[90vh]">
          <DialogHeader>
            <DialogTitle>Éditeur de Panneau</DialogTitle>
            <DialogDescription>
              Ajoutez et modifiez les bulles de dialogue pour ce panneau. Cliquez sur "Sauvegarder" pour appliquer les changements.
            </DialogDescription>
          </DialogHeader>
          {selectedPanelData && (
            <PanelEditor
              panel={selectedPanelData}
              onClose={() => setIsEditorOpen(false)}
              onChange={(updated) =>
                updateCurrentPage(p => ({...p, panels: p.panels.map((pl) => (pl.id === updated.id ? updated : pl))}))
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* PanelPreview: lightweight canvas drawing in a small canvas */
function PanelPreview({ panel, width, height }: { panel: Panel; width: number; height: number }) {
  const isValidUrl = panel.imageUrl && (panel.imageUrl.startsWith('/') || panel.imageUrl.startsWith('http') || panel.imageUrl.startsWith('data:image'));

  if (!isValidUrl) {
    return <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">Aucune image</div>;
  }
  return (
    <div className="w-full h-full relative">
        <img 
            src={panel.imageUrl} 
            alt="Aperçu du panneau" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }}
        />
    </div>
  );
}



/* PanelEditor: full editor for a panel (move bubbles and edit text) */
function PanelEditor({ panel, onClose, onChange }: { panel: Panel; onClose: () => void; onChange: (p: Panel) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [workingPanel, setWorkingPanel] = useState<Panel>({ ...panel });
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);

  const drag = useRef<{ idx: number | null; offsetX: number; offsetY: number }>({ idx: null, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    (async () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d")!;
      const w = canvasRef.current.width = 900;
      const h = canvasRef.current.height = 1200;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      if (workingPanel.imageUrl) {
        try {
          const img = await loadImage(workingPanel.imageUrl);
          const scale = Math.max(w / img.width, h / img.height);
          ctx.drawImage(img, 0,0, img.width, img.height, (w-img.width*scale)/2, (h-img.height*scale)/2, img.width*scale, img.height*scale);
        } catch { ctx.fillStyle = "#eee"; ctx.fillRect(0, 0, w, h); }
      } else { ctx.fillStyle = "#eee"; ctx.fillRect(0, 0, w, h); }

      workingPanel.bubbles.forEach((b) => {
        drawBubble(ctx, b);
        if (b.id === activeBubbleId) {
            ctx.save();
            ctx.strokeStyle = "rgba(0,100,255,0.7)";
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
            ctx.restore();
        }
      });
    })();
  }, [workingPanel, activeBubbleId]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
    const idx = workingPanel.bubbles.findIndex((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (idx >= 0) {
      drag.current.idx = idx;
      drag.current.offsetX = x - workingPanel.bubbles[idx].x;
      drag.current.offsetY = y - workingPanel.bubbles[idx].y;
      setActiveBubbleId(workingPanel.bubbles[idx].id);
    } else {
      drag.current.idx = null;
      setActiveBubbleId(null);
    }
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (drag.current.idx === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
    setWorkingPanel(p => ({
        ...p,
        bubbles: p.bubbles.map((b, i) =>
          i === drag.current.idx ? { ...b, x: x - drag.current.offsetX, y: y - drag.current.offsetY } : b
        )
    }));
  };
  const onMouseUp = () => { drag.current.idx = null; };

  const updateBubble = (id: string, newBubble: Partial<Bubble>) => {
      setWorkingPanel(p => ({ ...p, bubbles: p.bubbles.map(b => b.id === id ? {...b, ...newBubble} : b)}));
  }

  const activeBubbleData = workingPanel.bubbles.find(b => b.id === activeBubbleId);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100%-4rem)]">
      <div className="flex-1 min-h-0">
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", border: "1px solid #ccc", cursor: drag.current.idx !== null ? 'grabbing' : 'default' }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} />
      </div>
      <div className="w-full md:w-80 space-y-4">
        {activeBubbleData ? (
            <Card>
                <CardContent className="p-4 space-y-3">
                    <Label htmlFor="bubble-text">Texte de la bulle</Label>
                    <Textarea id="bubble-text" value={activeBubbleData.text} onChange={(e) => updateBubble(activeBubbleId!, { text: e.target.value })} className="h-24" />
                    <Label>Style</Label>
                    <Select value={activeBubbleData.type || 'parole'} onValueChange={(val: Bubble['type']) => updateBubble(activeBubbleId!, {type: val})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="parole">Parole</SelectItem>
                            <SelectItem value="pensée">Pensée</SelectItem>
                            <SelectItem value="cri">Cri</SelectItem>
                            <SelectItem value="chuchotement">Chuchotement</SelectItem>
                        </SelectContent>
                    </Select>
                     <Button variant="destructive" size="sm" className="w-full" onClick={() => setWorkingPanel(p => ({...p, bubbles: p.bubbles.filter(b => b.id !== activeBubbleId)}))}>
                        <Trash2 className="mr-2 h-4 w-4"/>Supprimer la bulle
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">Sélectionnez une bulle pour l'éditer.</p>
        )}
        <Button className="w-full" onClick={() => setWorkingPanel(p => ({...p, bubbles: [...p.bubbles, { id: uid(), x: 60, y: 60, w: 180, h: 60, text: "Nouvelle...", type: "parole" }] }))}>
            <PlusCircle className="mr-2 h-4 w-4"/> Ajouter une bulle
        </Button>
         <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => { onChange(workingPanel); onClose(); }}>Sauvegarder et Fermer</Button>
        </DialogFooter>
      </div>
    </div>
  );
}
