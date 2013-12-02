from django.conf.urls.defaults import patterns, include, url
from django.conf import settings
#from django.contrib.staticfiles.urls import staticfiles_urlpatterns

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', 'views.home', name='home'),
    #url(r'^openid/complete/\w*$', 'views.logincomplete', name='about'),

    # django_openid_auth
    url(r'^openid/', include('django_openid_auth.urls')),
    url(r'^about$', 'views.about', name='about'),
    url(r'^contact$', 'views.contact', name='contact'),
    url(r'^inference$', 'views.inference', name='inference'),
    url(r'^workflow/getedgedatatypes/\w*$', 'views.getedgedatatypes', name='getedgedatatypes'),
    url(r'^workflow/saveedge/$', 'views.saveedge', name='saveedge'),
    url(r'^workflow/savereport/$', 'views.savereportdata', name='savereportdata'),
    url(r'^workflow/deletesessionreports/$', 'views.deletesessionreports', name='deletesessionreports'),
    url(r'^workflow/session/(?P<sessionId>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'views.sessionreport', name='sessionreport'),
    url(r'^workflow/getsession/(?P<sessionId>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'views.getsessiondata', name='getsessiondata'),
    url(r'^workflow/deletesession/(?P<sessionId>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'views.deletesessiondata', name='deletesessiondata'),
    url(r'^workflow/sessions/$', 'views.getsessions', name='getsessions'),
    url(r'^workflow/saveworkflowdatagroup', 'views.saveworkflowdatagroup', name='saveworkflowdatagroup'),
    url(r'^workflow/deleteworkflowdatagroup/(?P<datagroupid>\d+)/$', 'views.deleteworkflowdatagroup', name='deleteworkflowdatagroup'),
    url(r'^workflow/deleteworkflowgroupitem', 'views.deleteworkflowgroupitem', name='deleteworkflowgroupitem'),
    url(r'^workflow/savecaptureddata', 'views.savecaptureddata', name='savecaptureddata'),
    url(r'^workflow/deletecaptureddata', 'views.deletecaptureddata', name='deletecaptureddata'),
    url(r'^workflow/uploaddata', 'views.uploaddata', name='uploaddata'),
    url(r'^workflow/getdataspace', 'views.getdataspace', name='getdataspace'),
    url(r'^workflow/savestate', 'views.savestate', name='savestate'),
    url(r'^workflow/updatestate', 'views.updatestate', name='updatestate'),
    url(r'^workflow/deletesavedstate/(?P<stateid>\d+)/', 'views.deletesavedstate', name='deletesavedstate'),
    url(r'^workflow/getstateinfo/(?P<stateid>\d+)/$', 'views.getstateinfo', name='getstateinfo'),
    url(r'^workflow/getuserdata/(?P<organismtype>[\w|\W]+)/(?P<datatype>[\w|\W]+)/(?P<userid>\d+)/(?P<filename>[\w|\W]+)/$', 'views.getuserdata', name='getuserdata'),
    url(r'^workflow/getreportdata/(?P<workflowid>-*\d+)/(?P<sessionid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<workflownodeid>\d+)/(?P<filename>[\w|\W]+)/$', 'views.getreportdata', name='getreportdata'),


    url(r'^workflow/save', 'views.saveworkflow', name='saveworkflow'),
    url(r'^workflow/delete/(?P<workflowid>\d+)/$', 'views.deleteworkflow', name='deleteworkflow'),
    url(r'^workflow/(?P<workflow_id>\d+)/$', 'views.getworkflow', name='getworkflow'),
    url(r'^workspace', 'views.workflow', name='workspace'),
    url(r'^workflow$', 'views.workflow', name='workflow'),

    # search app
    url(r'^advsearch$', 'search.views.advsearch', name='advsearch'),
    url(r'^search$',    'search.views.search', name='search'),
    url(r'^searchmodules$', 'search.views.search_modules', name='searchmodules'),
    url(r'^searchgenes$', 'search.views.search_genes', name='searchgenes'),

    url(r'^help', 'views.help', name='help'),
    url(r'^seqviewer', 'views.seqviewer', name='seqviewer'),

    # network inference app
    url(r'^configjob$', 'inference.views.configjob', name='configjob'),
    

    # Proxy URLs
    url(r'^sviewer/ncfetch.cgi', 'views.sviewer_cgi', name='ncfetch'),
    url(r'^sviewer/objinfo.cgi', 'views.sviewer_cgi', name='objinfo'),
    url(r'^sviewer/seqfeat.cgi', 'views.sviewer_cgi', name='seqfeat'),
    url(r'^sviewer/seqinfo.cgi', 'views.sviewer_cgi', name='seqinfo'),
    url(r'^sviewer/sv_data.cgi', 'views.sviewer_cgi', name='sv_data'),
    url(r'^sviewer/sv_seqsearch.cgi', 'views.sviewer_cgi', name='sv_seqsearch'),
    url(r'^sviewer/link.cgi', 'views.sviewer_cgi', name='sv_link'),
    url(r'^sviewer/objcoords.cgi', 'views.sviewer_cgi', name='objcoords'),
    url(r'^sviewer/seqconfig.cgi', 'views.sviewer_cgi', name='seqconfig'),
    url(r'^sviewer/seqgraphic.cgi', 'views.sviewer_cgi', name='seqgraphic'),
    url(r'^sviewer/sequence.cgi', 'views.sviewer_cgi', name='sequence'),
    url(r'^sviewer/tinyURL.cgi', 'views.sviewer_cgi', name='tinyURL'),

    url(r'^networks/$', 'networks.views.networks', name='networks'),
    url(r'^network/graphml', 'networks.views.network_as_graphml', name='network'),
    url(r'^network/(?P<network_id>\d+)/regulated_by/(?P<regulator>.*)$', 'networks.views.regulated_by', name='regulated by'),
    url(r'^network/(?P<network_id>\d+)/gene/(?P<gene>.*)$', 'networks.views.gene', name='network_gene'),
    
    url(r'^functions/(?P<type>[^/]*)/?$', 'networks.views.functions', name='functions'),
    url(r'^function/(?P<name>[^/]*)/?$', 'networks.views.function', name='function'),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    # Login / Logout
    #url(r'^login/$', 'django.contrib.auth.views.login'),
    url(r'^logout$', 'views.logout_page'),
    url(r'^login/$', 'views.login_page'),

    #(r'^analysis/$', 'networks.views.analysis', name='analysis'),
    #(r'^analysis/$', include('analysis.urls')),
    (r'^analysis/gene/$', 'networks.views.analysis_gene'),
    (r'^analysis/network/$', 'networks.views.network'),
    (r'^analysis/function/$', 'networks.views.function'),
    (r'^json/circvis/$', 'networks.views.circvis'),
    (r'^json/pssm/$', 'networks.views.pssm'),

    url(r'^biclusterstats_list/(?P<network_id>\d+)$', 'networks.views.biclusterstats_list', name='biclusterstats_list'),
    url(r'^bicluster_hcseries/(?P<bicluster_id>\d+)$', 'networks.views.bicluster_hcseries', name='bicluster_hcseries'),

    # for species-relative links, start here to match the other ones first
    url(r'^species$', 'networks.views.species', name='species'),
    url(r'^species/$', 'networks.views.species', name='species'),
    url(r'^(?P<species>.*)/genes/$', 'networks.views.genes', name='genes'),
    url(r'^(?P<species>.*)/network/(?P<network_num>\d+)/meme_motifs/$',
        'networks.views.meme_pssms', name='meme_pssms'),
    url(r'^(?P<species>[^/]*)/network/(?P<network_num>\d+)$', 'networks.views.network', name='network'),
    url(r'^(?P<species>[^/]*)/network$', 'networks.views.networkbicl',
        name='networkbicl'),
    url(r'^(?P<species>[^/]*)/network/export$', 'networks.views.species_network_export'),

    url(r'^(?P<species>[^/]*)/gene/(?P<gene>.*)$', 'networks.views.gene', name='gene'),
    url(r'^(?P<species>[^/]*)/network/(?P<network_num>\d+)/module/(?P<bicluster_num>\d+)$', 'networks.views.bicluster', name='biclusters'),

    url(r'^(?P<species>[^/]*)/?$', 'networks.views.species', name='species'),
    url(r'^(?P<species>[^/]*)/modfunctions/export$', 'networks.views.species_modfuncs_export'),
    url(r'^(?P<species>[^/]*)/genefunctions/export$', 'networks.views.species_genfuncs_export'),
 
    # URLs to the content displayed in the Cytoscape popups
    url(r'^gene_popup/(?P<gene_id>.*)$', 'networks.views.gene_popup',
        name='gene_popup'),
    url(r'^bicluster_popup/(?P<bicluster_id>.*)$',
        'networks.views.bicluster_popup',
        name='bicluster_popup'),
    url(r'^motif_popup/(?P<motif_id>.*)$', 'networks.views.motif_popup',
        name='motif_popup'),
    url(r'^regulator_popup/(?P<influence_id>.*)$',
        'networks.views.regulator_popup',
        name='regulator_popup'),

    #### Other stuff

    #(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_URL }),

)
#urlpatterns += staticfiles_urlpatterns()
