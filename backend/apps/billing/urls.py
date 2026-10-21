from django.urls import path

from .views import AdminOrganizationBillingView, AdminRecordPaymentView, PaymentListView, SubscriptionView

urlpatterns = [
    path("billing/subscription/", SubscriptionView.as_view(), name="billing-subscription"),
    path("billing/payments/", PaymentListView.as_view(), name="billing-payments"),
    path("admin/billing/organizations/<uuid:organization_id>/", AdminOrganizationBillingView.as_view(), name="admin-billing-organization"),
    path("admin/billing/organizations/<uuid:organization_id>/payments/", AdminRecordPaymentView.as_view(), name="admin-billing-record-payment"),
]
