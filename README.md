# Bodegapp (PharmaStock)

App web para gestión de bodega de medicamentos: inventario, consumos/salidas, alertas de stock y carga masiva desde CSV.

## Requisitos
- Node.js 18+ (probado con Node 24)

## Correr en local
- `npm ci`
- `npm run dev`

## Usar con Supabase (DB + Auth)
1) Cree un proyecto en Supabase.
2) Ejecute `supabase/schema.sql` en **SQL Editor**.
3) Copie `.env.example` a `.env` y complete:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Desplegar con GitHub Pages (frontend) + Supabase (backend)
1) Suba el proyecto a GitHub (branch `main`).
2) En GitHub → repo → **Settings → Secrets and variables → Actions → Secrets**, cree:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3) En GitHub → repo → **Settings → Pages**, seleccione **Source: GitHub Actions**.
4) Haga push a `main` y espere el workflow “Deploy to GitHub Pages”.

Notas:
- GitHub Pages solo sirve el frontend; Supabase sigue siendo el backend.
- Con el esquema actual (`supabase/schema.sql`) y sin login, la DB queda accesible con la anon key (útil para demo, no recomendado para producción).

## Importación CSV
- Use la vista **Catálogo / Importar** y el botón **Descargar Plantilla**.
- Columnas esperadas: `Nombre, Categoria, Lote, Vencimiento, Stock, StockMinimo, Unidad`.
