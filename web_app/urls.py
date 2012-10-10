from django.conf.urls.defaults import patterns, include, url
from django.conf import settings
#from django.contrib.staticfiles.urls import staticfiles_urlpatterns

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'network_portal.views.home', name='home'),
    # url(r'^network_portal/', include('network_portal.foo.urls')),
    url(r'^$', 'web_app.views.home', name='home'),
    url(r'^about$', 'web_app.views.about', name='about'),
    url(r'^contact$', 'web_app.views.contact', name='contact'),
    url(r'^workflow/save', 'web_app.views.saveworkflow', name='saveworkflow'),
    url(r'^workflow/(?P<workflow_id>\d+)/$', 'web_app.views.getworkflow', name='getworkflow'),
    url(r'^workflow$', 'web_app.views.workflow', name='workflow'),
    url(r'^search', 'web_app.views.search', name='search'),
    url(r'^help', 'web_app.views.help', name='help'),
    url(r'^seqviewer', 'web_app.views.seqviewer', name='seqviewer'),

    # Proxy URLs
    url(r'^sviewer/ncfetch.cgi', 'web_app.views.sviewer_cgi', name='ncfetch'),
    url(r'^sviewer/objinfo.cgi', 'web_app.views.sviewer_cgi', name='objinfo'),
    url(r'^sviewer/seqfeat.cgi', 'web_app.views.sviewer_cgi', name='seqfeat'),
    url(r'^sviewer/seqinfo.cgi', 'web_app.views.sviewer_cgi', name='seqinfo'),
    url(r'^sviewer/sv_data.cgi', 'web_app.views.sviewer_cgi', name='sv_data'),
    url(r'^sviewer/sv_seqsearch.cgi', 'web_app.views.sviewer_cgi', name='sv_seqsearch'),
    url(r'^sviewer/link.cgi', 'web_app.views.sviewer_cgi', name='sv_link'),
    url(r'^sviewer/objcoords.cgi', 'web_app.views.sviewer_cgi', name='objcoords'),
    url(r'^sviewer/seqconfig.cgi', 'web_app.views.sviewer_cgi', name='seqconfig'),
    url(r'^sviewer/seqgraphic.cgi', 'web_app.views.sviewer_cgi', name='seqgraphic'),
    url(r'^sviewer/sequence.cgi', 'web_app.views.sviewer_cgi', name='sequence'),
    url(r'^sviewer/tinyURL.cgi', 'web_app.views.sviewer_cgi', name='tinyURL'),

    url(r'^network/test/$', 'web_app.networks.views.network_cytoscape_web_test', name='network'),
    url(r'^network/xmltest/$', 'web_app.networks.views.network_as_graphml', name='network'),

    url(r'^networks/$', 'web_app.networks.views.networks', name='networks'),
    url(r'^network/(?P<network_id>\d+)$', 'web_app.networks.views.network', name='network'),
    url(r'^network/graphml', 'web_app.networks.views.network_as_graphml', name='network'),
    url(r'^network/(?P<network_id>\d+)/regulated_by/(?P<regulator>.*)$', 'web_app.networks.views.regulated_by', name='regulated by'),
    url(r'^network/(?P<network_id>\d+)/gene/(?P<gene>.*)$', 'web_app.networks.views.gene', name='network_gene'),
    url(r'^network', 'web_app.networks.views.network_cytoscape_web', name='network'),

    url(r'^species/(?P<species>[^/]*)/?$', 'web_app.networks.views.species', name='species'),
    url(r'^species/$', 'web_app.networks.views.species', name='species'),
    
    url(r'^genes/(?P<species>.*)$', 'web_app.networks.views.genes', name='genes'),
    url(r'^gene/(?P<gene>.*)$', 'web_app.networks.views.gene', name='gene'),
    
    url(r'^motif/(?P<motif_id>\d+)$', 'web_app.networks.views.motif', name='motif'),
    
    url(r'^bicluster/(?P<bicluster_id>\d+)$', 'web_app.networks.views.bicluster', name='biclusters'),

    url(r'^regulator/(?P<regulator>.*)$', 'web_app.networks.views.regulator', name='regulator'),
    
    url(r'^functions/(?P<type>[^/]*)/?$', 'web_app.networks.views.functions', name='functions'),
    url(r'^function/(?P<name>[^/]*)/?$', 'web_app.networks.views.function', name='function'),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    # Login / Logout
    #url(r'^login/$', 'django.contrib.auth.views.login'),
    url(r'^logout/$', 'views.logout_page'),
    url(r'^login/$', 'views.login_page'),

    #(r'^analysis/$', 'web_app.networks.views.analysis', name='analysis'),
    #(r'^analysis/$', include('analysis.urls')),
    (r'^analysis/gene/$', 'networks.views.analysis_gene'),
    (r'^analysis/network/$', 'networks.views.network'),
    (r'^analysis/motif/$', 'networks.views.motif'),
    (r'^analysis/function/$', 'networks.views.function'),
    (r'^json/circvis/$', 'networks.views.circvis'),
    (r'^json/pssm/$', 'networks.views.pssm'),

    #(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_URL }),

)
#urlpatterns += staticfiles_urlpatterns()

