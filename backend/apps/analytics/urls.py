from django.urls import path

from .views import CollectView, ConsentView, ForgetView

urlpatterns = [
    path("consent/", ConsentView.as_view(), name="analytics-consent"),
    path("collect/", CollectView.as_view(), name="analytics-collect"),
    path("forget/", ForgetView.as_view(), name="analytics-forget"),
]
