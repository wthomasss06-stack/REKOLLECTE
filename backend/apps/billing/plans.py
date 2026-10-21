"""Source UNIQUE des droits et des limites de chaque plan.

Les quotas sont des HYPOTHÈSES DE DÉPART (voir Brief_implementation_plans_Rekollecte.md) : ils se changent ici, à un seul endroit,
sans toucher au reste du code. Rien de ce fichier ne verrouille quoi que ce soit tant que l'application des plans est en mode
« observer » (voir services.enforcement_mode)."""
from dataclasses import dataclass

FREE, ESSENTIEL, PLUS, ENTREPRISE = "free", "essentiel", "plus", "entreprise"
PLAN_ORDER = (FREE, ESSENTIEL, PLUS, ENTREPRISE)
PLAN_LABELS = {FREE: "Gratuit", ESSENTIEL: "Essentiel", PLUS: "REKOLLECTE+", ENTREPRISE: "Entreprise"}
UNLIMITED = 1000


@dataclass(frozen=True)
class Entitlements:
    access_points: int
    forms: int
    members: int
    history_days: int | None  # fenêtre d'AFFICHAGE du registre ; None = pas de limite. Ce n'est PAS une durée de conservation.
    export_csv: bool  # export récurrent. L'export de SORTIE (purpose=exit) reste toujours possible, quel que soit le plan.
    ocr: bool  # OCR de pièce d'identité (formalité légale : retiré du formulaire public si le plan ne l'inclut pas)
    phone: bool  # champ téléphone (idem)
    karnet: bool  # clients, réservations, rappels
    resources: int  # ressources réservables : palier à tester, affiché mais pas encore appliqué


PLAN_ENTITLEMENTS = {
    FREE: Entitlements(access_points=1, forms=1, members=2, history_days=30, export_csv=False, ocr=False, phone=False, karnet=False, resources=0),
    ESSENTIEL: Entitlements(access_points=3, forms=3, members=5, history_days=365, export_csv=True, ocr=True, phone=True, karnet=False, resources=0),
    PLUS: Entitlements(access_points=10, forms=10, members=15, history_days=365, export_csv=True, ocr=True, phone=True, karnet=True, resources=10),
    ENTREPRISE: Entitlements(access_points=UNLIMITED, forms=UNLIMITED, members=UNLIMITED, history_days=None, export_csv=True, ocr=True, phone=True, karnet=True, resources=UNLIMITED),
}

FLAG_FEATURES = ("export_csv", "ocr", "phone", "karnet")
LIMIT_FEATURES = ("access_points", "forms", "members")


def required_plan_for_flag(feature: str) -> str:
    """Plan le moins cher qui inclut la fonction."""
    return next((plan for plan in PLAN_ORDER if getattr(PLAN_ENTITLEMENTS[plan], feature)), ENTREPRISE)


def required_plan_for_limit(feature: str, wanted: int) -> str:
    """Plan le moins cher dont la limite couvre `wanted` éléments."""
    return next((plan for plan in PLAN_ORDER if getattr(PLAN_ENTITLEMENTS[plan], feature) >= wanted), ENTREPRISE)


def required_plan_for_history() -> str:
    return next((plan for plan in PLAN_ORDER if (PLAN_ENTITLEMENTS[plan].history_days or UNLIMITED * 365) > (PLAN_ENTITLEMENTS[FREE].history_days or 0)), ENTREPRISE)
