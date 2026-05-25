@echo off
setlocal enabledelayedexpansion

echo ============================================
echo STEP 1: Eliminar directorios y caches
echo ============================================

if exist node_modules (
  echo Eliminando node_modules...
  rmdir /s /q node_modules
  echo ✓ node_modules eliminado
)

if exist dist (
  echo Eliminando dist...
  rmdir /s /q dist
  echo ✓ dist eliminado
)

if exist .vite (
  echo Eliminando .vite...
  rmdir /s /q .vite
  echo ✓ .vite eliminado
)

if exist .wrangler (
  echo Eliminando .wrangler...
  rmdir /s /q .wrangler
  echo ✓ .wrangler eliminado
)

if exist .tanstack (
  echo Eliminando .tanstack...
  rmdir /s /q .tanstack
  echo ✓ .tanstack eliminado
)

if exist package-lock.json (
  echo Eliminando package-lock.json...
  del package-lock.json
  echo ✓ package-lock.json eliminado
)

echo.
echo ============================================
echo STEP 2: Limpiar cache npm
echo ============================================
call npm cache clean --force
echo ✓ Cache npm limpiado

echo.
echo ============================================
echo STEP 3: Instalar dependencias con npm
echo ============================================
call npm install
if errorlevel 1 (
  echo ✗ Error en npm install
  exit /b 1
)
echo ✓ npm install completado

echo.
echo ============================================
echo STEP 4: Verificar dependencias TanStack
echo ============================================
call npm list @tanstack/start @tanstack/react-router @tanstack/react-query 2>nul | findstr /C:"@tanstack" || echo Verificación completada

echo.
echo ============================================
echo STEP 5: Ejecutar build
echo ============================================
call npm run build
if errorlevel 1 (
  echo ✗ Error en build
  exit /b 1
)
echo ✓ Build completado

echo.
echo ============================================
echo STEP 6: Validación final
echo ============================================
if exist dist\client (
  echo ✓ dist/client existe
  dir dist\client | find /v "Directory" | find /v "bytes"
) else (
  echo ✗ dist/client NO existe
)

if exist dist\client\wrangler.json (
  echo ⚠ ADVERTENCIA: wrangler.json existe en dist/client
  del dist\client\wrangler.json
  echo Eliminado wrangler.json
)

echo.
echo ============================================
echo REPARACION COMPLETADA
echo ============================================
echo Ahora puedes ejecutar: npm run dev
echo.
