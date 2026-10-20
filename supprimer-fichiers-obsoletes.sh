#!/bin/sh
# Supprime les fichiers remplacés par ce patch. À lancer UNE FOIS, à la racine du projet, après avoir décompressé le zip.
set -e
rm -f "frontend/src/app/dashboard/equipe/page.tsx"
rm -f "frontend/src/app/dashboard/formulaire/page.tsx"
rm -f "frontend/src/app/dashboard/karnet/page.tsx"
rm -f "frontend/src/app/dashboard/karnet/paiements/page.tsx"
rm -f "frontend/src/app/dashboard/karnet/rappels/page.tsx"
rm -f "frontend/src/app/dashboard/karnet/reservations/page.tsx"
rm -f "frontend/src/app/dashboard/karnet/ressources/page.tsx"
rm -f "frontend/src/app/dashboard/karnet/visiteurs/page.tsx"
rm -f "frontend/src/app/dashboard/parametres/layout.tsx"
rm -f "frontend/src/app/dashboard/parametres/administration/page.tsx"
rm -f "frontend/src/app/dashboard/parametres/connexion/page.tsx"
rm -f "frontend/src/app/dashboard/parametres/entreprise/page.tsx"
rm -f "frontend/src/app/dashboard/parametres/equipe/page.tsx"
rm -f "frontend/src/app/dashboard/parametres/formulaire/page.tsx"
rm -f "frontend/src/app/dashboard/parametres/qr-code/page.tsx"
rm -f "frontend/src/app/dashboard/qr-code/page.tsx"
rm -f "frontend/src/components/dashboard/MobileNav.tsx"
rm -f "frontend/src/components/ServerWakeBanner.tsx"
rm -f "frontend/src/components/ui/Skeleton.tsx"
rm -f "frontend/src/hooks/useServerWake.ts"
rmdir "frontend/src/app/dashboard/karnet/rappels" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/parametres/equipe" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/parametres/qr-code" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/parametres/formulaire" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/parametres/connexion" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/karnet/visiteurs" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/karnet/paiements" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/karnet/reservations" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/karnet/ressources" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/parametres/entreprise" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/parametres/administration" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/qr-code" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/parametres" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/karnet" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/formulaire" 2>/dev/null || true
rmdir "frontend/src/app/dashboard/equipe" 2>/dev/null || true
rmdir "frontend/src/components/ui" 2>/dev/null || true
rmdir "frontend/src/components/dashboard" 2>/dev/null || true
rmdir "frontend/src/components" 2>/dev/null || true
rmdir "frontend/src/hooks" 2>/dev/null || true
echo "Fichiers obsolètes supprimés."
# --- Patch v5 (QA/UX 20/10/2026) : onboarding en double, on garde /onboarding
rm -f "frontend/src/app/dashboard/onboarding/page.tsx"
rm -f "frontend/src/app/dashboard/onboarding/layout.tsx"
rmdir "frontend/src/app/dashboard/onboarding" 2>/dev/null || true
