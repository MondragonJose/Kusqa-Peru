import { createFileRoute, useNavigate, useSearch, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  MapPin,
  Users,
  Camera,
  Tag,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  getPlaceSuggestions,
  type PlaceSuggestion,
  PERU_LOCAL_PLACES,
} from "@/services/googleMaps";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { useCreateProposal, useAllProposals } from "@/features/proposals";
import type { ProposalResult } from "@/features/proposals";
import { supabase } from "@/lib/supabase";
import { useCurrentUser, getAuthSnapshot } from "@/features/auth";
import { toast } from "sonner";
import { calculateDistance } from "@/domain/territorial";
import { detectSimilarProposals } from "@/domain/proposalGovernance";
import type { ExistingProposal } from "@/domain/proposalGovernance";

export const Route = createFileRoute("/app/crear")({
  beforeLoad: async () => {
    const { state, user } = await getAuthSnapshot();
    if (state === "unauthenticated" || !user) {
      throw redirect({ to: "/app" });
    }
  },
  component: CreateProject,
});

const STEPS = [
  { n: 1, name: "Idea", icon: Sparkles },
  { n: 2, name: "Lugar", icon: MapPin },
  { n: 3, name: "Equipo", icon: Users },
  { n: 4, name: "Detalles", icon: Tag },
  { n: 5, name: "Listo", icon: Check },
];

const CATS = ["Medio ambiente", "Educación", "Arte & cultura", "Comunidad", "Salud", "Tecnología"];

function CreateProject() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const searchRecord = useSearch({ from: "/app/crear" }) as Record<string, unknown>;
  const districtFromSearch =
    typeof searchRecord.district === "string" ? searchRecord.district : undefined;
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("Medio ambiente");
  const [district, setDistrict] = useState(districtFromSearch ?? currentUser?.district ?? "");
  const [region, setRegion] = useState<"costa" | "sierra" | "selva">(
    (currentUser?.region as "costa" | "sierra" | "selva") || "costa",
  );
  const [team, setTeam] = useState(15);
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState("");
  const [why, setWhy] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowState, setFlowState] = useState<
    "idle" | "uploading_images" | "saving" | "success" | "partial_success" | "error"
  >("idle");
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const createProposal = useCreateProposal();
  const { data: allProposals = [] } = useAllProposals();

  const similarProposals =
    title.trim() && district.trim()
      ? detectSimilarProposals(
          title,
          district.split(",")[0].trim(),
          allProposals.map(
            (p): ExistingProposal => ({
              id: p.id,
              title: p.title,
              district: p.district,
            }),
          ),
        )
      : [];

  const validateStep = (stepNum: number): string | null => {
    switch (stepNum) {
      case 1:
        if (!title.trim()) return "El título de la propuesta es obligatorio";
        return null;
      case 2:
        if (!district.trim()) return "Selecciona un distrito para tu propuesta";
        return null;
      case 3:
        if (team < 3 || team > 80) return "El equipo debe tener entre 3 y 80 personas";
        return null;
      case 4:
        return null;
      case 5:
        return null;
      default:
        return null;
    }
  };

  const handleNextStep = () => {
    const error = validateStep(step);
    if (error) {
      setStepErrors((prev) => ({ ...prev, [step]: error }));
      setTouched((prev) => ({ ...prev, [`step-${step}`]: true }));
      return;
    }
    setStepErrors((prev) => ({ ...prev, [step]: "" }));
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const {
    suggestions,
    containerRef: autocompleteContainerRef,
    clearSuggestions,
  } = useAutocomplete<PlaceSuggestion>({
    query: district.split(",")[0].trim(),
    fetcher: getPlaceSuggestions,
    delay: 400,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const validFiles = files.filter((f) => validTypes.includes(f.type));

    if (validFiles.length !== files.length) {
      toast.error("Formato no válido", {
        description: "Solo se permiten imágenes (JPEG, PNG, WebP, GIF)",
      });
      return;
    }

    // Validate file sizes (5MB max)
    const maxSize = 5 * 1024 * 1024;
    const sizeValidFiles = validFiles.filter((f) => f.size <= maxSize);

    if (sizeValidFiles.length !== validFiles.length) {
      toast.error("Archivo demasiado grande", {
        description: "Algunas imágenes exceden el límite de 5MB",
      });
      return;
    }

    // Create previews
    const previews = sizeValidFiles.map((file) => URL.createObjectURL(file));
    setImageFiles((prev) => [...prev, ...sizeValidFiles]);
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    if (import.meta.env.DEV) {
      console.log("[KUSQA STORAGE TRACE] Uploading images:", imageFiles.length);
    }
    setIsUploadingImages(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user for image upload");
      }
      const userId = user.id;

      const uploadPromises = imageFiles.map(async (file, index) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}-${index}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from("proposal-images")
          .upload(filePath, file);

        if (error) {
          if (import.meta.env.DEV) {
            console.error("[KUSQA STORAGE TRACE] Error uploading image:", error);
          }
          throw error;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("proposal-images").getPublicUrl(filePath);

        if (import.meta.env.DEV) {
          console.log("[KUSQA STORAGE TRACE] Image uploaded:", publicUrl);
        }
        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      if (import.meta.env.DEV) {
        console.log("[KUSQA STORAGE TRACE] All images uploaded successfully");
      }
      return urls;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA STORAGE TRACE] Error uploading images:", error);
      }
      throw error;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Título requerido", {
        description: "Por favor ingresa un título para tu misión",
      });
      return;
    }

    setIsSubmitting(true);
    const warnings: string[] = [];

    // Validación coords vs distrito (warning UX, no bloqueo)
    if (coords && district) {
      const districtName = district.split(",")[0].trim().toLowerCase();
      const matchedPlace = PERU_LOCAL_PLACES.find(
        (p) =>
          p.district.toLowerCase().includes(districtName) ||
          districtName.includes(p.district.toLowerCase()),
      );

      if (matchedPlace) {
        const distance = calculateDistance(coords, matchedPlace.coords);
        if (distance > 50) {
          warnings.push(
            `Las coordenadas parecen estar a ${distance.toFixed(0)} km del distrito seleccionado. Verifica la ubicación.`,
          );
        }
      }
    }

    // STEP 1: Upload images — BEST-EFFORT, never blocks proposal creation
    setFlowState("uploading_images");
    let imageUrls: string[] = [];
    try {
      imageUrls = await uploadImages();
    } catch (storageError) {
      warnings.push("Las imágenes no se pudieron subir");
      console.warn(
        "[KUSQA STORAGE TRACE] Image upload failed — continuing without images:",
        storageError,
      );
    }

    // STEP 2: Create proposal — CRITICAL PATH (returns ProposalResult, never throws)
    setFlowState("saving");
    const dto = {
      title: title.trim(),
      description: description.trim() || undefined,
      summary: summary.trim() || undefined,
      why: why.trim() || undefined,
      locationLabel: locationLabel.trim() || undefined,
      category: cat,
      district: district.trim(),
      region,
      teamSize: team,
      latitude: coords?.lat,
      longitude: coords?.lng,
      images: imageUrls,
    };

    if (import.meta.env.DEV) {
      console.log("[KUSQA PROPOSAL TRACE] UI → mutation with DTO:", JSON.stringify(dto, null, 2));
    }
    const result = await createProposal.mutateAsync(dto);

    // STEP 3: Handle deterministic result
    if (result.status === "error") {
      setFlowState("error");
      if (import.meta.env.DEV) {
        console.error("[KUSQA PROPOSAL TRACE] Proposal creation failed:", result.error);
      }
      toast.error("Error al publicar", {
        description: result.error || "Por favor intenta nuevamente",
      });
      setIsSubmitting(false);
      return;
    }

    // Success or partial_success
    if (warnings.length > 0) {
      setFlowState("partial_success");
      if (import.meta.env.DEV) {
        console.log("[KUSQA PROPOSAL TRACE] Proposal created with warnings:", warnings);
      }
    } else {
      setFlowState("success");
      if (import.meta.env.DEV) {
        console.log("[KUSQA PROPOSAL TRACE] Proposal created successfully, id:", result.data.id);
      }
    }

    setIsSubmitting(false);
    toast.success("Propuesta publicada", {
      description: "Tu iniciativa ya aparece en el feed y el mapa.",
    });
    navigate({ to: "/app" });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl">Propuesta ciudadana</h1>
          <p className="text-sm text-muted-foreground">
            Plantea una idea que necesite apoyo de la comunidad.
          </p>
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Paso {step} / {STEPS.length}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div
                className={`h-9 w-9 rounded-xl grid place-items-center text-sm font-bold transition-smooth shrink-0 ${
                  done
                    ? "bg-jungle text-white"
                    : active
                      ? "bg-primary text-white shadow-sm"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-[2px] w-full rounded transition-all duration-500 ${done ? "bg-jungle" : "bg-border/60"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Steps Content */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 shadow-lift mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-bold text-xl">
                    ¿De qué trata tu expedición cívica?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dale un nombre que inspire acción y selecciona su causa principal.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold">Nombre de la propuesta</label>
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setTouched((prev) => ({ ...prev, title: true }));
                        if (e.target.value.trim()) {
                          setStepErrors((prev) => ({ ...prev, [1]: "" }));
                        }
                      }}
                      className={`mt-2 w-full rounded-xl border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 ${
                        touched.title && !title.trim()
                          ? "border-red-400 dark:border-red-500/50"
                          : "border-border"
                      }`}
                      placeholder="Ej: Reforestación del acantilado en Barranco..."
                    />
                    {touched.title && !title.trim() && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> El título es obligatorio
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Causa principal</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-2">
                      {CATS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCat(c)}
                          className={`px-4 py-3 rounded-xl border text-xs font-bold text-center transition-smooth cursor-pointer ${
                            cat === c
                              ? "bg-foreground text-background border-foreground"
                              : "border-border/60 bg-secondary/30 hover:bg-secondary/60 text-muted-foreground"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-bold text-xl">¿Dónde ocurrirá la acción?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Busca el distrito. Identificaremos la región geográfica para tu insignia
                    territorial.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(["costa", "sierra", "selva"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={`relative aspect-[4/3] rounded-2xl border p-4 text-left flex flex-col justify-between transition-smooth overflow-hidden cursor-pointer ${
                        region === r
                          ? "border-accent bg-accent/5 text-accent shadow-soft"
                          : "border-border/60 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
                      }`}
                    >
                      <div className="text-3xl mb-auto">
                        {r === "costa" ? "🌊" : r === "sierra" ? "⛰️" : "🌿"}
                      </div>
                      <div className="absolute bottom-4 left-4 font-display font-bold capitalize">
                        {r}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="relative" ref={autocompleteContainerRef}>
                  <label className="text-sm font-semibold">Distrito</label>
                  <input
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setTouched((prev) => ({ ...prev, district: true }));
                      if (e.target.value.trim()) {
                        setStepErrors((prev) => ({ ...prev, [2]: "" }));
                      }
                    }}
                    className={`mt-2 w-full rounded-xl border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 ${
                      touched.district && !district.trim()
                        ? "border-red-400 dark:border-red-500/50"
                        : "border-border"
                    }`}
                    placeholder="Busca y selecciona un distrito en Perú..."
                  />
                  {touched.district && !district.trim() && (
                    <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Selecciona un distrito válido
                    </p>
                  )}
                  {suggestions.length > 0 && (
                    <div className="absolute top-[108%] left-0 right-0 bg-card border border-border/40 rounded-xl shadow-lift overflow-hidden z-50">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setDistrict(s.description);
                            setRegion(s.region);
                            setCoords(s.coords);
                            clearSuggestions();
                          }}
                          className="w-full text-left px-4 py-3 text-xs text-foreground hover:bg-secondary/60 active:bg-secondary border-b border-border/10 last:border-b-0 cursor-pointer transition-colors"
                        >
                          {s.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold">Lugar específico (opcional)</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Un nombre humano del punto de encuentro. Aparecerá en la ficha.
                  </p>
                  <input
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    maxLength={200}
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
                    placeholder="Ej: Plaza de Armas de Cusco, Local comunal de Surquillo…"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-accent font-semibold">
                  Paso 3
                </div>
                <h2 className="font-display font-bold text-3xl mt-2">¿Cuántos seremos?</h2>
                <p className="text-muted-foreground mt-2">
                  Define el tamaño del equipo para esta iniciativa.
                </p>
                <div className="mt-8 text-center">
                  <div className="font-display font-bold text-7xl text-gradient-sunrise">
                    {team}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">personas en el equipo</div>
                </div>
                <input
                  type="range"
                  min="3"
                  max="80"
                  value={team}
                  onChange={(e) => {
                    setTeam(Number(e.target.value));
                    setStepErrors((prev) => ({ ...prev, [3]: "" }));
                  }}
                  className="mt-6 w-full accent-accent"
                />
                <div className="mt-6 grid grid-cols-4 gap-2">
                  {[5, 15, 30, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setTeam(n);
                        setStepErrors((prev) => ({ ...prev, [3]: "" }));
                      }}
                      className="rounded-xl border border-border py-3 text-sm font-semibold hover:bg-secondary transition-smooth"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-accent font-semibold">
                  Paso 4
                </div>
                <h2 className="font-display font-bold text-3xl mt-2">Detalles finales</h2>
                <p className="text-muted-foreground mt-2">Cuenta más sobre tu propuesta.</p>

                <label className="mt-6 block text-sm font-semibold">
                  Resumen{" "}
                  <span className="text-muted-foreground font-normal">
                    (opcional, máx. 280 caracteres)
                  </span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Aparece en tarjetas y feeds. Si lo dejas vacío, usamos la descripción.
                </p>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value.slice(0, 280))}
                  maxLength={280}
                  placeholder="Una línea que enganche: qué van a hacer y por qué importa."
                  className="mt-2 w-full rounded-2xl border border-border bg-surface p-4 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 resize-none"
                />
                <div className="mt-1 text-[10px] text-muted-foreground text-right">
                  {summary.length}/280
                </div>

                <label className="mt-4 block text-sm font-semibold">
                  Por qué importa en tu distrito{" "}
                  <span className="text-muted-foreground font-normal">(opcional, máx. 600)</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Tu voz: qué problema local resuelve, qué te mueve a impulsarla.
                </p>
                <textarea
                  rows={4}
                  value={why}
                  onChange={(e) => setWhy(e.target.value.slice(0, 600))}
                  maxLength={600}
                  placeholder="Ej: En Surquillo los domingos se acumula basura en la Av. Angamos. Queremos cerrar la jornada con un trueque de reciclables por plantones."
                  className="mt-2 w-full rounded-2xl border border-border bg-surface p-4 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 resize-none"
                />
                <div className="mt-1 text-[10px] text-muted-foreground text-right">
                  {why.length}/600
                </div>

                <label className="mt-4 block text-sm font-semibold">
                  Descripción completa{" "}
                  <span className="text-muted-foreground font-normal">(opcional, máx. 2000)</span>
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  placeholder="Detalla logística, materiales, frecuencia, aliados. Esta información se puede desplegar en la ficha."
                  className="mt-2 w-full rounded-2xl border border-border bg-surface p-4 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 resize-none"
                />
                <div className="mt-1 text-[10px] text-muted-foreground text-right">
                  {description.length}/2000
                </div>

                {/* Image Upload */}
                <div className="mt-4">
                  <input
                    type="file"
                    id="image-upload"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`rounded-2xl border-2 border-dashed border-border p-6 text-center hover:bg-secondary/40 transition-colors cursor-pointer block ${imagePreviews.length > 0 ? "hidden" : ""}`}
                  >
                    <Camera className="h-7 w-7 mx-auto text-muted-foreground" />
                    <div className="mt-2 font-semibold text-sm">Agrega fotos inspiradoras</div>
                    <div className="text-xs text-muted-foreground">PNG o JPG, hasta 5MB</div>
                  </label>

                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {imagePreviews.map((preview, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-xl overflow-hidden border border-border"
                        >
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {imagePreviews.length < 5 && (
                        <label
                          htmlFor="image-upload"
                          className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:bg-secondary/40 transition-colors cursor-pointer"
                        >
                          <div className="text-center">
                            <Camera className="h-6 w-6 mx-auto text-muted-foreground" />
                            <div className="text-xs text-muted-foreground mt-1">Agregar más</div>
                          </div>
                        </label>
                      )}
                    </div>
                  )}

                  {isUploadingImages && (
                    <div className="mt-3 text-center text-xs text-muted-foreground">
                      Subiendo imágenes...
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto h-24 w-24 rounded-3xl bg-primary grid place-items-center text-5xl shadow-sm"
                >
                  ✨
                </motion.div>
                <h2 className="font-display font-bold text-3xl mt-6">¡Tu propuesta está lista!</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                  Aparecerá en el mapa de{" "}
                  <span className="font-semibold text-foreground">{district}</span> y notificaremos
                  a tu red cívica.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm">
                  Has ganado <span className="font-bold text-accent">+150 XP</span> por tu liderazgo
                  🚀
                </div>
                {similarProposals.length > 0 && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 px-4 py-3 text-left">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">Propuesta similar detectada:</span> "
                      {similarProposals[0].title}" en {similarProposals[0].district}.
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {stepErrors[step] && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-4 py-2.5"
          >
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              {stepErrors[step]}
            </span>
          </motion.div>
        )}
      </div>

      <div className="mt-6 flex justify-between gap-3">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
        >
          <ArrowLeft className="h-4 w-4" /> Atrás
        </button>
        <button
          onClick={step === STEPS.length ? handlePublish : handleNextStep}
          disabled={isSubmitting || (step < STEPS.length && !!validateStep(step))}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-6 py-3 font-semibold shadow-sm hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {flowState === "uploading_images"
            ? "Subiendo imágenes..."
            : flowState === "saving"
              ? "Guardando propuesta..."
              : isSubmitting
                ? "Publicando..."
                : step === STEPS.length
                  ? "Publicar propuesta"
                  : "Continuar"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
