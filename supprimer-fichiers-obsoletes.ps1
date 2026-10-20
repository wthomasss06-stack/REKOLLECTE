# Supprime les fichiers remplacés par ce patch. À lancer UNE FOIS, à la racine du projet, après avoir décompressé le zip.
$ErrorActionPreference = 'Stop'
Remove-Item -LiteralPath "frontend\src\app\dashboard\equipe\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\formulaire\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\karnet\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\karnet\paiements\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\karnet\rappels\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\karnet\reservations\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\karnet\ressources\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\karnet\visiteurs\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\parametres\layout.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\parametres\administration\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\parametres\connexion\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\parametres\entreprise\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\parametres\equipe\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\parametres\formulaire\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\parametres\qr-code\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\qr-code\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\components\dashboard\MobileNav.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\components\ServerWakeBanner.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\components\ui\Skeleton.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\hooks\useServerWake.ts" -Force -ErrorAction SilentlyContinue
if ((Test-Path "frontend\src\app\dashboard\karnet\rappels") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\karnet\rappels")) { Remove-Item "frontend\src\app\dashboard\karnet\rappels" }
if ((Test-Path "frontend\src\app\dashboard\parametres\equipe") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\parametres\equipe")) { Remove-Item "frontend\src\app\dashboard\parametres\equipe" }
if ((Test-Path "frontend\src\app\dashboard\parametres\qr-code") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\parametres\qr-code")) { Remove-Item "frontend\src\app\dashboard\parametres\qr-code" }
if ((Test-Path "frontend\src\app\dashboard\parametres\formulaire") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\parametres\formulaire")) { Remove-Item "frontend\src\app\dashboard\parametres\formulaire" }
if ((Test-Path "frontend\src\app\dashboard\parametres\connexion") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\parametres\connexion")) { Remove-Item "frontend\src\app\dashboard\parametres\connexion" }
if ((Test-Path "frontend\src\app\dashboard\karnet\visiteurs") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\karnet\visiteurs")) { Remove-Item "frontend\src\app\dashboard\karnet\visiteurs" }
if ((Test-Path "frontend\src\app\dashboard\karnet\paiements") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\karnet\paiements")) { Remove-Item "frontend\src\app\dashboard\karnet\paiements" }
if ((Test-Path "frontend\src\app\dashboard\karnet\reservations") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\karnet\reservations")) { Remove-Item "frontend\src\app\dashboard\karnet\reservations" }
if ((Test-Path "frontend\src\app\dashboard\karnet\ressources") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\karnet\ressources")) { Remove-Item "frontend\src\app\dashboard\karnet\ressources" }
if ((Test-Path "frontend\src\app\dashboard\parametres\entreprise") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\parametres\entreprise")) { Remove-Item "frontend\src\app\dashboard\parametres\entreprise" }
if ((Test-Path "frontend\src\app\dashboard\parametres\administration") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\parametres\administration")) { Remove-Item "frontend\src\app\dashboard\parametres\administration" }
if ((Test-Path "frontend\src\app\dashboard\qr-code") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\qr-code")) { Remove-Item "frontend\src\app\dashboard\qr-code" }
if ((Test-Path "frontend\src\app\dashboard\parametres") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\parametres")) { Remove-Item "frontend\src\app\dashboard\parametres" }
if ((Test-Path "frontend\src\app\dashboard\karnet") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\karnet")) { Remove-Item "frontend\src\app\dashboard\karnet" }
if ((Test-Path "frontend\src\app\dashboard\formulaire") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\formulaire")) { Remove-Item "frontend\src\app\dashboard\formulaire" }
if ((Test-Path "frontend\src\app\dashboard\equipe") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\equipe")) { Remove-Item "frontend\src\app\dashboard\equipe" }
if ((Test-Path "frontend\src\components\ui") -and -not (Get-ChildItem -Force "frontend\src\components\ui")) { Remove-Item "frontend\src\components\ui" }
if ((Test-Path "frontend\src\components\dashboard") -and -not (Get-ChildItem -Force "frontend\src\components\dashboard")) { Remove-Item "frontend\src\components\dashboard" }
if ((Test-Path "frontend\src\components") -and -not (Get-ChildItem -Force "frontend\src\components")) { Remove-Item "frontend\src\components" }
if ((Test-Path "frontend\src\hooks") -and -not (Get-ChildItem -Force "frontend\src\hooks")) { Remove-Item "frontend\src\hooks" }
Write-Host "Fichiers obsolètes supprimés."
# --- Patch v5 (QA/UX 20/10/2026) : onboarding en double, on garde /onboarding
Remove-Item -LiteralPath "frontend\src\app\dashboard\onboarding\page.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend\src\app\dashboard\onboarding\layout.tsx" -Force -ErrorAction SilentlyContinue
if ((Test-Path "frontend\src\app\dashboard\onboarding") -and -not (Get-ChildItem -Force "frontend\src\app\dashboard\onboarding")) { Remove-Item "frontend\src\app\dashboard\onboarding" }
