@echo off
setlocal enabledelayedexpansion

echo ============================================
echo STEP 1: Limpiar completamente
echo ============================================

taskkill /F /IM node.exe 2>nul

rmdir /s /q node_modules 2>nul
rmdir /s /q dist 2>nul
rmdir /s /q .vite 2>nul
del package-lock.json 2>nul

echo ✓ Limpieza completada

echo.
echo ============================================
echo STEP 2: Instalar con BUN
echo ============================================

call bun install
if errorlevel 1 (
  echo ✗ Error en bun install
  exit /b 1
)

echo ✓ BUN install completado

echo.
echo ============================================
echo STEP 3: Ejecutar bun run build
echo ============================================

call bun run build
if errorlevel 1 (
  echo ⚠ Build falló, continuando...
)

echo.
echo ============================================
echo STEP 4: Iniciar dev server
echo ============================================

call bun run dev

