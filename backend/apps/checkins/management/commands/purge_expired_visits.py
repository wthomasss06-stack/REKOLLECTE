from django.core.management.base import BaseCommand

from apps.checkins.privacy import purge_expired_visits


class Command(BaseCommand):
    help = "Supprime les visites dont la durée de conservation est échue (jamais les paiements). À planifier chaque jour ; --dry-run pour simuler."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Compte ce qui serait supprimé, sans rien supprimer.")

    def handle(self, *args, **options):
        result = purge_expired_visits(dry_run=options["dry_run"])
        verb = "seraient supprimées" if options["dry_run"] else "supprimées"
        self.stdout.write(f"{result['deleted']} visite(s) {verb} dans {len(result['organizations'])} établissement(s).")
