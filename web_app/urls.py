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

    # url('', include('social_auth.urls')),

    url(r'^$', 'web_app.views.home', name='home'),
    #url(r'^openid/complete/\w*$', 'web_app.views.logincomplete', name='about'),

    # django_openid_auth
    url(r'^openid/', include('django_openid_auth.urls')),
    url(r'^about$', 'web_app.views.about', name='about'),
    url(r'^contact$', 'web_app.views.contact', name='contact'),
    url(r'^workflow/getedgedatatypes/\w*$', 'web_app.views.getedgedatatypes', name='getedgedatatypes'),
    url(r'^workflow/saveedge/$', 'web_app.views.saveedge', name='saveedge'),
    url(r'^workflow/savereport/$', 'web_app.views.savereportdata', name='savereportdata'),
    url(r'^workflow/deletesessionreports/$', 'web_app.views.deletesessionreports', name='deletesessionreports'),
    url(r'^workflow/session/(?P<sessionId>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'web_app.views.sessionreport', name='sessionreport'),
    url(r'^workflow/getsession/(?P<sessionId>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'web_app.views.getsessiondata', name='getsessiondata'),
    url(r'^workflow/deletesession/(?P<sessionId>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'web_app.views.deletesessiondata', name='deletesessiondata'),
    url(r'^workflow/sessions/(?P<workflowid>\d+)/$', 'web_app.views.getsessions', name='getsessions'),
    url(r'^workflow/saveworkflowdatagroup', 'web_app.views.saveworkflowdatagroup', name='saveworkflowdatagroup'),
    url(r'^workflow/deleteworkflowdatagroup/(?P<datagroupid>\d+)/$', 'web_app.views.deleteworkflowdatagroup', name='deleteworkflowdatagroup'),
    url(r'^workflow/deleteworkflowgroupitem', 'web_app.views.deleteworkflowgroupitem', name='deleteworkflowgroupitem'),
    url(r'^workflow/savecaptureddata', 'web_app.views.savecaptureddata', name='savecaptureddata'),
    url(r'^workflow/deletecaptureddata', 'web_app.views.deletecaptureddata', name='deletecaptureddata'),
    url(r'^workflow/uploaddata', 'web_app.views.uploaddata', name='uploaddata'),
    url(r'^workflow/getdataspace', 'web_app.views.getdataspace', name='getdataspace'),
    url(r'^workflow/savestate', 'web_app.views.savestate', name='savestate'),
    url(r'^workflow/deletesavedstate/(?P<stateid>\d+)/', 'web_app.views.deletesavedstate', name='deletesavedstate'),
    url(r'^workflow/getstateinfo/(?P<stateid>\d+)/$', 'web_app.views.getstateinfo', name='getstateinfo'),


    url(r'^workflow/save', 'web_app.views.saveworkflow', name='saveworkflow'),
    url(r'^workflow/delete/(?P<workflowid>\d+)/$', 'web_app.views.deleteworkflow', name='deleteworkflow'),
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

    url(r'^networks/$', 'web_app.networks.views.networks', name='networks'),
    url(r'^network/graphml', 'web_app.networks.views.network_as_graphml', name='network'),
    url(r'^network/(?P<network_id>\d+)/regulated_by/(?P<regulator>.*)$', 'web_app.networks.views.regulated_by', name='regulated by'),
    url(r'^network/(?P<network_id>\d+)/gene/(?P<gene>.*)$', 'web_app.networks.views.gene', name='network_gene'),
    
    url(r'^motif/(?P<motif_id>\d+)$', 'web_app.networks.views.motif', name='motif'),
    

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

    url(r'^biclusterstats_list/(?P<network_id>\d+)$', 'web_app.networks.views.biclusterstats_list', name='biclusterstats_list'),
    url(r'^bicluster_hcseries/(?P<bicluster_id>\d+)$', 'web_app.networks.views.bicluster_hcseries', name='bicluster_hcseries'),

    # for species-relative links, start here to match the other ones first
    url(r'^species$', 'web_app.networks.views.species', name='species'),
    url(r'^species/$', 'web_app.networks.views.species', name='species'),
    url(r'^(?P<species>.*)/genes/$', 'web_app.networks.views.genes', name='genes'),
    url(r'^(?P<species>[^/]*)/network/(?P<network_id>\d+)$', 'web_app.networks.views.network', name='network'),


    url(r'^(?P<species>[^/]*)/gene/(?P<gene>.*)$', 'web_app.networks.views.gene', name='gene'),
    url(r'^(?P<species>[^/]*)/network/(?P<network_id>\d+)/module/(?P<bicluster_id>\d+)$', 'web_app.networks.views.bicluster', name='biclusters'),

    url(r'^(?P<species>[^/]*)/?$', 'web_app.networks.views.species', name='species'),
    
    #(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_URL }),

)
#urlpatterns += staticfiles_urlpatterns()

