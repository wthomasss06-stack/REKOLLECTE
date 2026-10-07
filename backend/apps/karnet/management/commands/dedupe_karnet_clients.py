"""Fusionne les fiches clients en double (même e-mail ou même téléphone, tous formats confondus).

Par défaut : SIMULATION, rien n'est modifié. Pour appliquer : --apply.

    python manage.py dedupe_karnet_clients                 # voir ce qui serait fusionné
    python manage.py dedupe_karnet_clients --apply         # fusionner pour de bon
    python manage.py dedupe_karnet_clients --org <uuid>    # limiter à un établissement

À lancer UNE fois après la mise en ligne de la normalisation des téléphones : les doublons créés
avant (0701020304 et +2250701020304 en deux fiches) existent encore en base. Les réservations et
les passages des doublons sont rattachés à la fiche conservée (la plus active, puis la plus
ancienne) ; aucun historique n'est perdu.
"""
from django.core.management.base import BaseCommand

from apps.karnet.models import Client
from apps.karnet.services import duplicate_groups, merge_clients, normalize_phone
from apps.organizations.models import Organization


class Command(BaseCommand):
    help = "Fusionne les fiches clients en double (simulation par défaut)."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Applique réellement les fusions.")
        parser.add_argument("--org", help="UUID d'un établissement (sinon tous).")

    def handle(self, *args, apply=False, org=None, **options):
        organizations = Organization.objects.filter(pk=org) if org else Organization.objects.all()
        merged_groups = merged_cards = normalized = 0

        for organization in organizations:
            groups = duplicate_groups(organization)
            for members in groups:
                survivor, duplicates = members[0], members[1:]
                label = ", ".join(f"« {c.full_name} » ({c.phone or c.email or 'sans contact'})" for c in members)
                self.stdout.write(f"[{organization.name}] {len(members)} fiches pour la même personne : {label}")
                self.stdout.write(f"    -> conservée : « {survivor.full_name} » ; fusionnées : {len(duplicates)}")
                if apply:
                    merge_clients(survivor, duplicates)
                merged_groups += 1
                merged_cards += len(duplicates)

            # Remet aussi les téléphones des fiches restantes au format canonique (07 01… -> 0701020304).
            for client in Client.objects.filter(organization=organization).exclude(phone=""):
                canonical = normalize_phone(client.phone)
                if canonical != client.phone:
                    normalized += 1
                    if apply:
                        client.phone = canonical
                        client.save(update_fields=["phone"])

        mode = "APPLIQUÉ" if apply else "SIMULATION (rien n'a été modifié, relancer avec --apply)"
        self.stdout.write(self.style.SUCCESS(
            f"{mode} : {merged_groups} groupe(s) de doublons, {merged_cards} fiche(s) à fusionner, {normalized} numéro(s) remis au format canonique."
        ))
