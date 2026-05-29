import { Compass, Locate, ZoomIn, ZoomOut } from "lucide-react";

type MapControlsProps = {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  onCenterUser?: () => void;
  userLocationLoading?: boolean;
  hasUserLocation?: boolean;
};

export function MapControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  onCenterUser,
  userLocationLoading = false,
  hasUserLocation = false,
}: MapControlsProps) {
  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Zoom and view Controls */}
      <div className="flex flex-col rounded-2xl border border-border/40 bg-surface/85 shadow-soft overflow-hidden backdrop-blur-md">
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            className="p-2.5 lg:p-3 text-foreground hover:bg-secondary/60 active:bg-secondary transition-colors border-b border-border/20 flex items-center justify-center"
            title="Acercar"
          >
            <ZoomIn className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
        )}
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            className="p-2.5 lg:p-3 text-foreground hover:bg-secondary/60 active:bg-secondary transition-colors border-b border-border/20 flex items-center justify-center"
            title="Alejar"
          >
            <ZoomOut className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
        )}
        {onResetView && (
          <button
            onClick={onResetView}
            className="p-2.5 lg:p-3 text-foreground hover:bg-secondary/60 active:bg-secondary transition-colors flex items-center justify-center"
            title="Ver todo el Perú"
          >
            <Compass className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
        )}
      </div>

      {/* User Location Control */}
      {onCenterUser && (
        <button
          onClick={onCenterUser}
          disabled={userLocationLoading}
          className={`p-3 rounded-2xl border border-border/40 bg-surface/85 shadow-soft backdrop-blur-md transition-all flex items-center justify-center text-foreground hover:bg-secondary/60 active:bg-secondary disabled:opacity-50 ${
            hasUserLocation ? "text-accent border-accent/30" : ""
          }`}
          title="Centrar en mi ubicación"
        >
          <Locate
            className={`h-4 w-4 ${
              userLocationLoading ? "animate-spin text-accent" : hasUserLocation ? "text-accent fill-accent/10" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}
