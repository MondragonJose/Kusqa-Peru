import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { Proposal } from "@/services/proposalContract";

interface ProposalImagesCarouselProps {
  proposal: Proposal;
}

export function ProposalImagesCarousel({ proposal }: ProposalImagesCarouselProps) {
  const images = (proposal.images ?? []).filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % images.length);

  return (
    <section className="px-5 sm:px-8 pt-5 border-b border-border/40 pb-5">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted/40 group">
        {images[activeIndex] ? (
          <img
            src={images[activeIndex]}
            alt={`Imagen ${activeIndex + 1} de ${images.length} de la propuesta`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Ir a imagen ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
