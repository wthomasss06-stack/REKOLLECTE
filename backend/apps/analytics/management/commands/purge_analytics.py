from django.core.management.base import BaseCommand

from apps.analytics.services import purge_old


class Command(BaseCommand):
    help = "Supprime les mesures d'audience plus anciennes que la durée de conservation (ANALYTICS_RETENTION_DAYS, 395 jours par défaut)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None, help="Durée de conservation en jours (remplace le réglage).")

    def handle(self, *args, **options):
        result = purge_old(options["days"])
        self.stdout.write(f"Purge terminée : {result['sessions']} lignes de visites, {result['visitors']} visiteurs, {result['tallies']} compteurs.")
