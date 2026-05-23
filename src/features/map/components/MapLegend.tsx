import { Layers } from "lucide-react";

export function MapLegend() {
  return (
    <div className="glass-strong rounded-2xl p-4 text-xs space-y-2 border border-border/40 shadow-soft backdrop-blur-md">
      <div className="font-semibold text-foreground flex items-center gap-1.5 border-b border-border/30 pb-1.5 mb-1.5">
        <Layers className="h-3.5 w-3.5 text-accent" />
        <span>Regiones de Impacto</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-coast ring-2 ring-coast/20 animate-pulse-ring" />
          <span className="font-medium">Costa (Litoral)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-sierra ring-2 ring-sierra/20 animate-pulse-ring" />
          <span className="font-medium">Sierra (Andes)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-jungle ring-2 ring-jungle/20 animate-pulse-ring" />
          <span className="font-medium">Selva (Amazonía)</span>
        </div>
      </div>
    </div>
  );
}
