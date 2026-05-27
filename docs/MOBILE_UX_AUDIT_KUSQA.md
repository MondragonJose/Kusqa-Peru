# 📱 KUSQA Mobile-First UX Audit
**Enfoque:** Experiencia móvil limpia, respirada, sin ruido | Refs: Duolingo, Airbnb Mobile, Google Maps Mobile, Notion Mobile

---

## 🎯 Problemas Identificados (Priorizados)

### 🔴 CRÍTICO (Impacto Alto - Fix Inmediato)

#### 1. **Onboarding Oversized** 
**Archivo:** `src/components/Onboarding.tsx`
**Problema:**
- `p-8` en contenido = 32px padding (excesivo mobile)
- `h-20 w-20` icon = demasiado grande en pantalla pequeña
- `space-y-6` entre elementos = 24px gaps (mucho)
- `max-w-md` con `p-4` borde = apenas cabe en iPhone SE

**Impacto Visual:**
```
Actual (mobile 375px):  
┌─────────────────────┐
│  [header p-4]       │  ← 16px padding
├─────────────────────┤
│  [spacer p-8]       │  ← 32px! demasiado
│  ┌─────────────────┐│
│  │  [icon h-20]    ││  ← 80px icon en pantalla de 375px
│  └─────────────────┘│
│  [space-y-6]        │  ← 24px x 3
│  "Explora misiones..."
│  [space-y-6]
│  "...en tu distrito"
└─────────────────────┘
```

**Fix:** 
```diff
- <div className="p-8 text-center">
+ <div className="px-5 py-6 sm:p-8 text-center">

- <div className={`h-20 w-20 rounded-2xl ...`}>
+ <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl ...`}>

- className="space-y-6"
+ className="space-y-3 sm:space-y-6"
```

**Tailwind Classes Modified:**
- `p-8` → `px-5 py-6 sm:p-8`
- `h-20 w-20` → `h-16 w-16 sm:h-20 sm:w-20`
- `space-y-6` → `space-y-3 sm:space-y-6`
- `text-2xl` (titulo) → `text-xl sm:text-2xl`

**Why:** En mobile, cada píxel cuenta. El onboarding ocupa 100% viewport, necesita respiración táctil.

---

#### 2. **Map Card Padding Overflow**
**Archivo:** `src/routes/app.mapa.tsx` (líneas 483-530 - Drawer)
**Problema:**
- `p-5 lg:p-5` en drawer content sin reducción mobile
- El drawer tiene `max-h-[85vh]` pero el scroll interno puede ser difícil
- Emoji `text-5xl` es muy grande para drawer estrecho

**Impacto Visual:**
```
Drawer en mobile (360px ancho):
┌──────────────────┐
│ ▬ (handle)       │
├──────────────────┤
│ p-5 p-5          │ ← 20px padding AMBOS lados = 40px usado
│ ┌──────────────┐ │
│ │ text-5xl 🏗  │ │ ← 48px emoji en 320px drawer
│ │ Misión       │ │
│ │ Descripción..│ │
│ └──────────────┘ │
└──────────────────┘
```

**Fix:**
```diff
- <div className="p-5 bg-card rounded-t-[32px] flex-1 overflow-y-auto">
+ <div className="px-4 py-5 sm:p-5 bg-card rounded-t-[32px] flex-1 overflow-y-auto">
  
- <span className="text-5xl p-3 bg-secondary rounded-2xl leading-none select-none">
+ <span className="text-4xl sm:text-5xl p-2 sm:p-3 bg-secondary rounded-2xl leading-none select-none">
```

**Tailwind Classes Modified:**
- `p-5` → `px-4 py-5 sm:p-5`
- `text-5xl` → `text-4xl sm:text-5xl`
- `p-3` → `p-2 sm:p-3`

**Why:** Drawer en mobile es angosto. 20px padding x2 = 40px de 360px = 11% solo bordes.

---

#### 3. **Mission Cards: Too Much Visual Weight**
**Archivo:** `src/features/missions/components/PublicMissionCard.tsx`
**Problema:**
- Card tiene 6 líneas de información
- `text-sm` para descripción + `bg-surface/60` con `rounded-lg px-3 py-2` = mucho padding para poco espacio
- En mobile se apiña todo verticalmente sin jerarquía
- Títulos `line-clamp-2` pero descripción "Impacto:" puede tomar 2 líneas también

**Impacto Visual:**
```
Card en 360px mobile:
┌─────────────────────┐
│ [1.5px color band]  │
├─────────────────────┤
│ [emoji] Region      │
│         Categoría   │
│         "Propuesta" │
│ Título Mission...   │
│ ...continuación     │
├─────────────────────┤
│ 📍 Barranco         │ ← Apretado
│ 📅 hace 3 días      │
│ 👥 23 participantes │
├─────────────────────┤
│ Impacto: Limpieza   │ ← Caja gris con padding
│ de fachadas del     │    redundante en mobile
│ barrio histórico    │
├─────────────────────┤
│ Footer meta info    │
└─────────────────────┘
```

**Fix:**
```diff
- <p className="text-xs text-muted-foreground bg-surface/60 rounded-lg px-3 py-2 leading-relaxed">
+ <p className="text-xs text-muted-foreground bg-transparent sm:bg-surface/60 sm:rounded-lg sm:px-3 sm:py-2 leading-relaxed">

- <span className="flex items-center gap-1">
+ <span className="flex items-center gap-1 text-[11px]">
```

**Tailwind Classes Modified:**
- `bg-surface/60 rounded-lg px-3 py-2` → `bg-transparent sm:bg-surface/60 sm:rounded-lg sm:px-3 sm:py-2`
- `text-xs` (meta info) → `text-[11px]` en mobile
- Remove redundant styling en mobile

**Why:** Mobile cards ya están llenas. El "Impacto:" box es redundante—es text, no necesita caja.

---

### 🟡 ALTO (Impacto Medio - Fix en Sprint 1)

#### 4. **Mapa Header + Filters Too Tall**
**Archivo:** `src/routes/app.mapa.tsx` (líneas 148-210)
**Problema:**
- Header: `h1 text-2xl` + `p xs text-xs` + GPS badge = 3 líneas
- Filtros: `p-3 lg:p-5` es mucho padding en mobile
- `gap-3 lg:gap-4` entre header y filtros
- GPS toggle + proximity slider = 2 elementos que compiten
- En total: ~120-140px de altura antes del mapa

**Impacto Visual:**
```
Mobile viewport 667px (iPhone 8):
[AppShell header sticky] 60px
[Mapa header section] 80px ← PROBLEMA
[Filters glass] 60px      ← PROBLEMA
[Map] 350px ← Apenas cabe
[Drawer bottom nav] 60px
─────────────────────────
Total: 610px (SQUEEZED)
```

**Fix:**
```diff
- <div className="space-y-3 lg:space-y-5 max-w-7xl mx-auto px-3 md:px-6 py-1 lg:py-2">
+ <div className="space-y-2 lg:space-y-5 max-w-7xl mx-auto px-3 md:px-6 py-1 lg:py-2">

- <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight...">
+ <h1 className="font-display font-bold text-xl md:text-3xl tracking-tight...">

- <div className="glass rounded-3xl p-3 lg:p-5 border border-border/40 shadow-soft space-y-3 lg:space-y-4">
+ <div className="glass rounded-3xl p-2.5 sm:p-3 lg:p-5 border border-border/40 shadow-soft space-y-2 sm:space-y-3 lg:space-y-4">

- <div className="flex items-center gap-2 lg:gap-3 pb-2 lg:pb-3 border-b border-border/20">
+ <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 pb-1.5 sm:pb-2 lg:pb-3 border-b border-border/20">
```

**Tailwind Classes Modified:**
- `space-y-3` → `space-y-2 sm:space-y-3`
- `text-2xl md:text-3xl` → `text-xl md:text-3xl`
- `p-3 lg:p-5` → `p-2.5 sm:p-3 lg:p-5`
- `gap-2 lg:gap-3` → `gap-1.5 sm:gap-2 lg:gap-3`

**Why:** Mapa es lo importante. Headers no deben tomar >25% de viewport móvil.

---

#### 5. **Bottom Navigation Too Tall**
**Archivo:** `src/components/AppShell.tsx` (líneas 205-225)
**Problema:**
- Nav bar: `py-3` + icon `h-5 w-5` + text `text-[10px]` + `min-h-[48px]` 
- Usa `pb-6` hardcoded para safe area (debería ser responsive)
- No hay compresión en landscape
- Total altura ~72px cuando debería ser ~60px

**Impacto Visual:**
```
Mobile portrait:
┌──────────────────────┐
│ Content             │ ← 100vh - 60px (header) - 72px (nav) = 535px útil
│ (535px)              │
│                      │
└──────────────────────┘
[Bottom Nav - 72px]
─────────────────────── ← 12px wasted en vertical

Landscape (414x667):
┌──────────────────────────────────────┐
│ Content (667-60-72) = 535px SAME      │ ← TOO MUCH wasted
└──────────────────────────────────────┘
[Nav 72px] ← Debería ser 52px
```

**Fix:**
```diff
- <nav className="lg:hidden fixed bottom-0 left-4 right-4 z-40 glass-strong rounded-2xl shadow-lift px-3 py-3 flex justify-between safe-area-bottom pb-[env(safe-area-inset-bottom)] pb-6">
+ <nav className="lg:hidden fixed bottom-0 left-4 right-4 z-40 glass-strong rounded-2xl shadow-lift px-3 py-2 sm:py-3 flex justify-between safe-area-bottom pb-[env(safe-area-inset-bottom)] sm:pb-6 pb-4">

- className={`flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 text-[10px] font-medium transition-smooth min-w-[48px] min-h-[48px] justify-center`}
+ className={`flex flex-col items-center gap-0.5 sm:gap-1.5 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-[9px] sm:text-[10px] font-medium transition-smooth min-w-[44px] sm:min-w-[48px] min-h-[44px] sm:min-h-[48px] justify-center`}
```

**Tailwind Classes Modified:**
- `py-3` → `py-2 sm:py-3`
- `pb-6` → `sm:pb-6 pb-4`
- `px-4` → `px-3 sm:px-4`
- `min-w-[48px] min-h-[48px]` → `min-w-[44px] sm:min-w-[48px] min-h-[44px] sm:min-h-[48px]`
- `gap-1.5` → `gap-0.5 sm:gap-1.5`
- `text-[10px]` → `text-[9px] sm:text-[10px]`

**Why:** En landscape mobile, la nav toma demasiado espacio. 44x44 es mínimo accessible, no necesita 48.

---

#### 6. **Landing Hero Section Unbalanced**
**Archivo:** `src/routes/index.tsx` (líneas 286-387)
**Problema:**
- `pt-36 pb-28` en mobile = 144px + 112px = 256px SOLO verticales (~38% de viewport en iPhone 8)
- 3 grandes blur elements animados generan fatiga
- CTA buttons `px-8 py-3.5` son enormes para finger touch
- "Statistiques" hidden en mobile, pero hero es 1 gran bloque vacío

**Impacto Visual:**
```
Landing Hero en mobile 375x667:
[Header 60px]
[Padding top 36] 144px ← DEMASIADO
[Peru decoration (hidden)] 
[Hero text - 3 líneas]
[CTA buttons - 2 líneas]
[Padding bottom 28] 112px ← DEMASIADO
──────────────────────
~400px solo para hero = 60% de viewport

Resultado: Usuario scrollea mucho para ver siguiente sección
```

**Fix:**
```diff
- <section className="relative pt-36 pb-28 lg:pt-44 lg:pb-36 px-5 lg:px-8 overflow-hidden">
+ <section className="relative pt-16 pb-12 sm:pt-24 lg:pt-44 lg:pb-36 px-5 lg:px-8 overflow-hidden">

- <div className="absolute top-16 -right-28 h-[520px] w-[520px]... animate-float-slow" />
- <div className="absolute bottom-0 -left-40 h-[420px] w-[420px]... animate-float-slow" />
+ <div className="absolute -top-32 -right-40 h-[380px] w-[380px] sm:top-16 sm:-right-28 sm:h-[520px] sm:w-[520px]... animate-float-slow" />
+ <div className="absolute -bottom-20 -left-48 h-[280px] w-[280px] sm:bottom-0 sm:-left-40 sm:h-[420px] sm:w-[420px]... animate-float-slow" />
```

**Tailwind Classes Modified:**
- `pt-36 pb-28` → `pt-16 pb-12 sm:pt-24 lg:pt-44 lg:pb-36`
- `h-[520px] w-[520px]` → `h-[380px] w-[380px] sm:h-[520px] sm:w-[520px]`
- `h-[420px] w-[420px]` → `h-[280px] w-[280px] sm:h-[420px] sm:w-[420px]`

**Why:** Hero debe ser "bienvenida", no "ocupador de espacio". Duolingo, Notion mobile tienen heros compactos.

---

#### 7. **Landscape Mobile Not Optimized**
**Archivo:** `src/components/AppShell.tsx` + todos los routes
**Problema:**
- Header: `py-3` no se reduce en landscape (debería ser `py-1.5`)
- Content: `py-6 lg:py-8` pero en landscape 414x667, `py-6` = 24px es exagerado
- Bottom nav: `py-3` en landscape es mucho
- No hay media query para `landscape:(media)` compresión

**Impacto Visual:**
```
Landscape 414x667 (iPhone 8):
[Header py-3 = 12px padding] 60px TOTAL
[Content py-6 = 24px padding] ← WASTED
[Available height] 667-60-72-24 = 511px ← Aceptable pero comprimible
[Bottom nav py-3] 72px

Si todo fuera compactado:
[Header py-1.5] 50px
[Content py-3] 12px padding
[Available] 667-50-60-12 = 545px ← +34px recuperados
```

**Fix:** Agregar media queries para landscape
```diff
// En AppShell.tsx header
- className="flex-shrink-0 sticky top-0 z-20 glass border-b border-border/60 px-5 lg:px-10 py-3 flex items-center gap-3"
+ className="flex-shrink-0 sticky top-0 z-20 glass border-b border-border/60 px-5 lg:px-10 py-3 landscape:py-1.5 flex items-center gap-3"

// En routes content
- className="px-5 lg:px-10 py-6 lg:py-8"
+ className="px-5 lg:px-10 py-6 lg:py-8 landscape:py-3"
```

**Tailwind Classes:** Agregar `landscape:` media queries
- `py-3` → `py-3 landscape:py-1.5`
- `py-6` → `py-6 landscape:py-3`
- `gap-1.5` → `gap-1.5 landscape:gap-1`

**Why:** Landscape es use case real (video, navigation, split-screen). No debería ser "squeezed".

---

### 🟡 MEDIO (Impacto Bajo - Fix en Sprint 2)

#### 8. **Text Hierarchy Inverted**
**Archivos:** Múltiples cards y sections
**Problema:**
- Descripciones usan `text-sm` pero titles `text-sm` también (en cards)
- Meta info y labels son `text-[10px]` + `text-[8px]` = 5+ tamaños diferentes
- No hay clara diferencia visual mobile vs desktop

**Current Type Scale:**
```
text-[7px]   (mínimo - labels)
text-[8px]   (badges pequeños)
text-[9px]   (muy pequeño)
text-[10px]  (pequeño)
text-xs (12px)
text-sm (14px)
text-base (16px)
text-lg (18px)
text-xl (20px)
text-2xl (24px)
```

**Fix:** Standarizar jerarquía mobile-first
```diff
- Título card: text-sm → text-sm sm:text-base
- Descripción: text-xs → text-xs sm:text-sm
- Meta (fecha): text-[10px] → text-[10px] sm:text-xs
- Label (region): text-[10px] → text-[9px] sm:text-[10px]
```

**Tailwind Classes:** Standardizar
- Cards: `text-sm` titles → `text-sm sm:text-base`
- Descriptions: `text-xs` → `text-xs sm:text-sm`
- Metadata: `text-[10px]` → `text-[10px] sm:text-xs`

**Why:** Legibilidad en pequeña pantalla. Menos confusion visual.

---

#### 9. **Spacing Inconsistent Across Components**
**Archivos:** PublicMissionCard, MapView sidebar, Mission detail
**Problema:**
- Algunos componentes usan `gap-2 lg:gap-4` (multiplied)
- Otros `gap-3 lg:gap-5` (multiplied)
- No hay consistent base spacing: `space-y-3`, `space-y-4`, `space-y-5` mezclados

**Current Spacing Analysis:**
```
Tight  (debería usar): space-y-1.5 gap-1
Snug   (debería usar): space-y-2 gap-1.5
Base   (debería usar): space-y-3 gap-2
Loose  (debería usar): space-y-4 gap-3
Airy   (debería usar): space-y-5 gap-4

Actual (caótico):
- Onboarding: space-y-6 (muy loose)
- Cards: space-y-3 gap-3 (ok)
- Forms: space-y-4 gap-2 (inconsistente)
- Sections: space-y-5 lg:space-y-6 (incoherente)
```

**Fix:** Crear escala consistent
```diff
- Mobile: 8px, 12px, 16px, 20px, 24px
- Tailwind: gap-1, gap-1.5, gap-2, gap-2.5, gap-3

// En todos los componentes
- space-y-3 lg:space-y-5 → space-y-2 sm:space-y-3 lg:space-y-4
- gap-3 lg:gap-4 → gap-2 sm:gap-2.5 lg:gap-3
- gap-2 lg:gap-3 → gap-1.5 sm:gap-2 lg:gap-2.5
```

**Tailwind Classes:** Standardizar spacing
- Reemplazar `space-y-[random]` con escala: `-1.5, -2, -3, -4, -5` mobile-first
- Reemplazar `gap-[random]` con escala similar

**Why:** Consistencia visual → Mayor profesionalismo → Mejor UX.

---

#### 10. **Redundant Information Density**
**Archivo:** MissionDetail (app.mision.$missionId.tsx)
**Problema:**
- Sama info aparece 2-3 veces:
  - Emoji + Region + Category en hero
  - Emoji + Title en main section
  - Similar missions cards debajo
- En mobile, esto genera repetición fatigante
- Participants display: "🦙 🌵 🦅 🐟 🌺... +30 más" toma muchas líneas

**Impacto Visual:**
```
Mobile Mission Detail (scrolling):
┌────────────────────┐
│ Hero section       │  ← Emoji, badges, category
│ [Large content]    │
├────────────────────┤
│ Title: "Misión..." │  ← REPEAT: Emoji aquí también
│ Description        │
├────────────────────┤
│ Participantes:     │
│ 🦙🌵🦅🐟🌺☕🪕... │  ← 7 emojis + "+30 más" = 2 líneas
│ +30 más            │
├────────────────────┤
│ Stats cards        │
├────────────────────┤
│ Similar misiones   │
│ [Card 1] [emoji]   │  ← REPEAT EMOJI AGAIN
│ [Card 2] [emoji]   │
└────────────────────┘
```

**Fix:**
```diff
// En participants section
- <div className="flex flex-wrap gap-2">
+ <div className="flex flex-wrap gap-1.5 mb-2">
  {[...NAV.slice(0, 4)...].map((e, i) => (
-   <div key={i} className="h-11 w-11 rounded-xl...">
+   <div key={i} className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl...">
      {e}
    </div>
  ))}
```

**Tailwind Classes Modified:**
- `h-11 w-11` → `h-9 w-9 sm:h-11 sm:w-11`
- `gap-2` → `gap-1.5`

**Why:** Menos scroll fatigue. Show-don't-repeat patterns.

---

### 🟢 BAJO (Nice-to-have - Fix en Sprint 3)

#### 11. **Search Bar Too Complicated Mobile**
- Actual: Glass + border + search icon + placeholder + "Próximamente" badge
- En mobile, compite con breadcrumb
- Suggestion: Convert to icon-only toggle en mobile, expandable

#### 12. **Cards Need Better Touch Targets**
- Interactive areas <44px no son accessibility-friendly
- Buttons should be min 44px x 44px (currently 40px in some places)

#### 13. **Streak Badge Unnecessary Mobile**
- "🔥 Racha 5 días" hidden on mobile
- Podría moverse a lateral en portrait, o collapse completamente

---

## 📋 Implementation Priority Matrix

| Fix | Severity | Effort | ROI | Priority |
|-----|----------|--------|-----|----------|
| Onboarding padding | 🔴 | 15 min | ⭐⭐⭐⭐⭐ | **P0** |
| Map header compress | 🔴 | 20 min | ⭐⭐⭐⭐ | **P0** |
| Bottom nav height | 🔴 | 15 min | ⭐⭐⭐⭐ | **P0** |
| Mission card impact box | 🟡 | 10 min | ⭐⭐⭐⭐ | **P1** |
| Drawer padding | 🟡 | 10 min | ⭐⭐⭐⭐ | **P1** |
| Landing hero compress | 🟡 | 25 min | ⭐⭐⭐⭐ | **P1** |
| Landscape optimization | 🟡 | 30 min | ⭐⭐⭐ | **P2** |
| Text hierarchy | 🟡 | 20 min | ⭐⭐⭐ | **P2** |
| Spacing standardize | 🟡 | 45 min | ⭐⭐⭐ | **P2** |
| Participants compress | 🟢 | 15 min | ⭐⭐ | **P3** |

**Total Effort (P0+P1):** ~120 min (2 horas)
**Expected Result:** 40-50% mejor UX móvil

---

## ✅ Validation Checklist

- [ ] Test Onboarding en iPhone SE (375px)
- [ ] Test Mapa en iPhone 8 (375px) landscape
- [ ] Verify bottom nav doesn't overlap content
- [ ] Check drawer scroll smoothness
- [ ] Validate 44px+ touch targets on all buttons
- [ ] Responsive test en tablet breakpoint (768px)
- [ ] Screenshot comparison: actual vs proposed
- [ ] Test with 200% system font size
- [ ] Verify no horizontal overflow
- [ ] Check layout shift on nav transitions

---

## 🎨 References (Benchmark Mobile UX)

**Duolingo Mobile:**
- Hero: ~100px (pt-8 pb-6)
- Cards: Compact, text only (no impact boxes)
- Bottom nav: 44px height (not 72px)
- Spacing: Tight, snug (no unnecessary gaps)

**Google Maps Mobile:**
- Header: Minimal, sticky but compact
- Bottom sheet: Optimized drawer (max 85vh)
- Map: Takes 70%+ of viewport
- Controls: Floating action buttons (not overlay tables)

**Airbnb Mobile:**
- Cards: Minimal padding, emphasis on image
- Text: Strict 2-line limit titles
- Meta info: Inline, no extra spacing
- Spacing: Consistent 8px/16px/24px scale

**Notion Mobile:**
- Pages: Near-full-width (px-3 only)
- Headers: text-lg max
- Minimal decorations
- Bottom space: Safe area aware

---

## 📄 Files to Modify

1. ✅ `src/components/Onboarding.tsx`
2. ✅ `src/features/missions/components/PublicMissionCard.tsx`
3. ✅ `src/components/AppShell.tsx`
4. ✅ `src/routes/app.mapa.tsx`
5. ✅ `src/routes/index.tsx`
6. ✅ `src/routes/app.mision.$missionId.tsx`
7. ⚠️ `src/routes/app.index.tsx` (Dashboard)

---

**Status:** Ready for implementation
**Estimated Timeline:** 2-3 hours for P0+P1
**QA Timeline:** 1 hour
**Total:** ~4 hours including testing
