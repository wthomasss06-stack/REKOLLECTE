from django.contrib import admin

from .models import Client, Reservation, Resource


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "organization", "phone", "created_at")
    list_filter = ("organization",)
    search_fields = ("full_name", "phone", "email")


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "unit", "price", "is_active")
    list_filter = ("organization", "unit", "is_active")
    search_fields = ("name",)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("number", "resource", "client", "organization", "status", "total_amount", "is_paid", "starts_at")
    list_filter = ("organization", "status", "is_paid")
    date_hierarchy = "starts_at"
    search_fields = ("client__full_name", "resource__name")
