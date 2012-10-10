from django import forms
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.http import Http404
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.template import Context
from django.template.loader import get_template
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import logout
from django.contrib.auth import authenticate, login
from django.utils import simplejson as json

# apparently, the location of this changed between Django versions?
# from django.contrib.csrf.middleware import csrf_exempt
from django.views.decorators.csrf import csrf_exempt
from django.core.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt

from web_app.networks.models import *
from web_app.networks.functions import functional_systems
from web_app.networks.helpers import get_influence_biclusters

import jpype
import openid

import search as s
import itertools
import urllib2

class GeneResultEntry:
    def __init__(self, id, name, species,
                 description, bicluster_ids, influence_biclusters,
                 regulated_biclusters):
        self.id = id
        self.name = name
        self.species = species
        self.description = description
        self.bicluster_ids = bicluster_ids
        self.influence_biclusters = influence_biclusters
        self.regulated_biclusters = regulated_biclusters


def home(request):
    genes = Gene.objects.all()
    bicl_count = Bicluster.objects.count()
    sp_count = Species.objects.count()
    net_count = Network.objects.count()
    motif_count = Motif.objects.count()
    influence_count = Influence.objects.count()
    version = "0.0.1"
    return render_to_response('home.html', locals())

def about(request):
    version = "0.0.1"
    return render_to_response('about.html', locals()) 

def contact(request):
    return render_to_response('contact.html', locals())

class WorkFlowEntry:
    def __init__(self, category, components):
        self.Category = category
        self.Components = components
        
def workflow(request):
    print "workflow page"
    wfentries = []
    wfcategories = WorkflowCategories.objects.all()
    for category_obj in wfcategories:
        wfentry = WorkFlowEntry(category_obj, category_obj.workflowcomponents_set.all())
        wfentries.append(wfentry)
        print("Category " + str(category_obj.id) + ": " + str(wfentries.count))

    myworkflows = Workflows.objects.filter(owner_id = 1)

    # jpype executes java code
    #try:
    #    jvmpath = jpype.getDefaultJVMPath()
    #    jpype.startJVM(jvmpath, "-ea", "-Djava.class.path=static/lib/boss-201105180306.jar")
    #except Exception:
    #    return

    #Class = jpype.JClass("TestPy4j")
    #t = Class()
    #t.WriteFile()

    # and you have to shutdown the VM at the end
    #jpype.shutdownJVM()

    return render_to_response('workflow.html', locals())

@csrf_exempt
def saveworkflow(request):
    print "Save workflow"
    #print request.raw_post_data

    try:
        workflow = json.loads(request.raw_post_data)
    except Exception as e:
        print str(e)
        error = {'status':500, 'desc':wfdesc }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    # Iterate through the stuff in the list
    wfname = workflow['name']
    wfdesc = workflow['desc']
    wfownerid = workflow['userid']

    try:
        # save the workflow info
        workflowentry = Workflows(name = wfname, description = wfdesc, owner_id = int(wfownerid))
        workflowentry.save()
        wfid = workflowentry.id
        #print str(wfid)
   
        # save the edges of the workflow
        edgelist = workflow['edgelist']
        for key in edgelist.keys(): #key is the source node
            #print key
            #print edgelist[key]['node']
            record = WorkflowEdges(workflow_id = wfid, source_id = int(key), target_id = int(edgelist[key]['node']), type_id = int(edgelist[key]['type']))
            record.save()
    except Exception as e:
        print str(e)
        return HttpResponse(json.dumps(e))

    data = {'id':str(wfid), 'name':wfname, 'desc':wfdesc }
    return HttpResponse(json.dumps(data), mimetype='application/json')

def getworkflow(request, workflow_id):
    print "Get workflow"
    #print request.raw_post_data

    #try:
    #    query = json.loads(request.raw_get_data)
    #except Exception as e:
    #    print str(e)
    #    error = {'status':500, 'message': 'Failed to parse json data' }
    #    return HttpResponse(json.dumps(error), mimetype='application/json')

    try:
        data_dict = {}
        targetid = workflow_id
        workflow = (Workflows.objects.filter(id = targetid))[0]
        edges = WorkflowEdges.objects.filter(workflow_id = targetid)
        data_dict = {'id': workflow.id, 'name': workflow.name, 'desc': workflow.description}
        edges_obj = {};
        idx = 0
        for edge in edges:
            edge_dict = {}
            edge_dict = {'source': edge.source_id, 'target': edge.target_id, 'type': edge.type_id}
            edges_obj[str(idx)] = edge_dict
            idx = idx + 1
        data_dict['edges'] = edges_obj
        print json.dumps(data_dict)
        return HttpResponse(json.dumps(data_dict), mimetype='application/json')
    except Exception as e:
        print str(e)
        error = {'status':500, 'message': 'Failed to retreive workflow info' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    

def search(request):
    if request.GET.has_key('q'):
        try:
            q = request.GET['q']
            results = s.search(q)
            gene_ids= []
            for result in results:
                if result['doc_type'] == 'GENE':
                    gene_ids.append(result['id'])

            gene_objs = Gene.objects.filter(pk__in=gene_ids)
            species_genes = {}
            species_names = {}
            genes = []
            for gene_obj in gene_objs:
                species_names[gene_obj.species.id] = gene_obj.species.name
                bicluster_ids = [b.id for b in gene_obj.bicluster_set.all()]
                regulates = Bicluster.objects.filter(influences__name__contains=gene_obj.name)
                _, influence_biclusters = get_influence_biclusters(gene_obj)

                if not species_genes.has_key(gene_obj.species.id):
                    species_genes[gene_obj.species.id] = []
                genes = species_genes[gene_obj.species.id]

                genes.append(GeneResultEntry(gene_obj.id, gene_obj.name,
                                             gene_obj.species.id,
                                             gene_obj.description,
                                             bicluster_ids,
                                             influence_biclusters,
                                             regulates))
        except Exception as e:
            error_message = str(e)
    return render_to_response('search.html', locals())

def logout_page(request):
    """
    Log users out and re-direct them to the main page.
    """
    logout(request)
    return HttpResponseRedirect('/')

class LoginForm(forms.Form):
    username = forms.CharField(max_length=100)
    password = forms.CharField(max_length=100)

def login_page(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            user = authenticate(username=request.POST['username'], password=request.POST['password'])
            if user is not None:
                if user.is_active:
                    login(request, user)
                    return HttpResponseRedirect('/')
                else:
                    error_message = "The account for user %s (%s) is disabled." % (user.get_full_name(), user.username)
            else:
                error_message = "Invalid login."
    else:
        form = LoginForm()
    return render_to_response('login.html', locals(), context_instance=RequestContext(request))

def help(request):
    return render_to_response('help.html', locals())

def seqviewer(request):
    return render_to_response('seqviewer.html', locals())

def sviewer_cgi(request):
    """Proxy for the NCBI data CGIs"""
    def allowed_header(header):
        return header != 'transfer-encoding' and header != 'connection'
    base_url = 'http://www.ncbi.nlm.nih.gov/projects/sviewer/'
    script_name = request.path.split('/')[-1]
    proxied_url = base_url + script_name
    data = ''
    count = 0
    for key,value in request.REQUEST.items():
        if count > 0:
            data += '&'
        data += ("%s=%s" % (key, value))
        count += 1

    req = urllib2.Request(proxied_url)

    cookies = ''
    count = 0
    for key, value in request.COOKIES.items():
        if count > 0:
            cookies += '; '
        cookies += ("%s=%s" % (key, value))
   # if len(cookies) > 0:
   #     req.addHeader('Cookie', cookies)
    response = urllib2.urlopen(req, data)
    info = response.info()
    retresponse = HttpResponse(response.read())
    for key, value in info.items():
        if allowed_header(key.lower()):
            retresponse[key] = value
    return retresponse

sviewer_cgi = csrf_exempt(sviewer_cgi)
