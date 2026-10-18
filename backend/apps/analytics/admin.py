from django.contrib import admin

from .models import ConsentTally, SiteAction, SitePageView, SiteSession, SiteVisitor

admin.site.register(SiteVisitor)
admin.site.register(SiteSession)
admin.site.register(SitePageView)
admin.site.register(SiteAction)
admin.site.register(ConsentTally)
