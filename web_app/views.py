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
#from social_auth.backends.google import GoogleOAuth2
from django.utils import simplejson as json
from django.db import transaction

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
    #print request.REQUEST
    #print request.user.username
    #print request.user.first_name  + ' ' + request.user.last_name + ' ' + request.user.email

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

def createuser(user):
    print 'creating user...'
    if user.is_authenticated():
        record = Users(firstname = user.first_name,
                       lastname = user.last_name,
                       email = user.email,
                       password = '')
        record.save()
        return (record)
    return

def workflow(request):
    #print request.REQUEST
    print "workflow page"
    #print request.user.username
    #print request.user.first_name
    wfentries = []
    wfcategories = WorkflowCategories.objects.all()
    for category_obj in wfcategories:
        wfentry = WorkFlowEntry(category_obj, category_obj.workflowcomponents_set.all())
        wfentries.append(wfentry)
        print("Category " + str(category_obj.id) + ": " + str(wfentries.count))

    isauthenticated = "false"
    if request.user.is_authenticated():
        isauthenticated = "true"
        dbuser = Users.objects.filter(email = request.user.email)
        if (len(dbuser) > 0):
            user = dbuser[0]
        elif (len(dbuser) == 0):
            user = createuser(request.user)
        myworkflows = Workflows.objects.filter(owner_id = user.id)


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

class WorkflowEdge:
    def __init__(self):
        self.paralleltype = 1

    def setSourceID(self, sourceid):
        self.sourceid = sourceid
    
    def getSourceID(self):
        return self.sourceid     
                    
    def setTargetID(self, targetid):
        self.targetid = targetid

    def getTargetID(self):
        return self.targetid

    def setDataType(self, datatype):
        self.datatype = datatype

    def getDataType(self):
        return self.datatype

    def setParallelType(self, paralleltype):
        self.paralleltype = paralleltype

    def getParallelType(self):
        return self.paralleltype


@csrf_exempt
def saveworkflow(request):
    print "Save workflow"
    print request.raw_post_data

    try:
        workflow = json.loads(request.raw_post_data)
    except Exception as e:
        print str(e)
        error = {'status':500, 'desc':wfdesc }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    try:
        # put the whole thing in a transaction
        with transaction.commit_on_success():
            wfname = workflow['name']
            wfdesc = workflow['desc']
            wfownerid = workflow['userid']
            wfid = workflow['workflowid']

            if wfid:
                    # this is an existing workflow
                    # we first remove all the nodes and edges of that workflow
                    WorkflowEdges.objects.filter(workflow_id = wfid).delete()
                    WorkflowNodes.objects.filter(workflow_id = wfid).delete()
                    print "All workflow nodes and edges removed"
                    # update workflow info
            else:
                # save the workflow info
                workflowentry = Workflows(name = wfname, description = wfdesc, owner_id = int(wfownerid))
                workflowentry.save()
                wfid = workflowentry.id
                print "Workflow saved with id: " + str(wfid)

            # save workflow nodes
            nodelist = workflow['workflownodes']
            nodeobjs = {}
            for key in nodelist.keys():
                print 'key: ' + key
                print 'node ID: ' + nodelist[key]['id']
                print 'service uri: ' + nodelist[key]['serviceuri']
                if (nodeobjs.has_key(nodelist[key]['id'])):
                    node = nodeobjs[nodelist[key]['id']]
                else:
                    node = WorkflowNodes(serviceuri = nodelist[key]['serviceuri'],
                                         arguments = nodelist[key]['arguments'],
                                         subaction = nodelist[key]['subaction'],
                                         datauri = nodelist[key]['datauri'],
                                         component_id = nodelist[key]['componentid'],
                                         workflow_id = wfid)
                    node.save()
                    nodeobjs[nodelist[key]['id']] = node
                    print "Node saved with id: " + str(node.id)


            # save workflow edges
            edgelist = workflow['workflowedges']
            edgeobjs = {}
            for key in edgelist.keys(): #key is the indexed property names such as sourceid_0, targetid_0, etc
                print key
                edgeindx = int(re.split('_', key)[1])
                #print edgeindx
                propname = re.split('_', key)[0]
                print propname

                edgeobj = WorkflowEdge()
                if edgeobjs.has_key(str(edgeindx)):
                    edgeobj = edgeobjs[str(edgeindx)]
                else:
                    print 'Starting an edge object'
                    edgeobjs[str(edgeindx)] = edgeobj

                print 'Setting value of ' + propname + ' for edge ' + str(edgeindx)
                if (propname == 'sourceid'):
                    edgeobj.setSourceID(edgelist[key])
                elif (propname == 'targetid'):
                    edgeobj.setTargetID(edgelist[key])
                elif (propname == 'datatypeid'):
                    edgeobj.setDataType(int(edgelist[key]))
                elif (propname == 'isparallel'):
                    edgeobj.setParallelType(int(edgelist[key]))

            print 'Saving edges...'
            for key in edgeobjs.keys():
                edgeobj = edgeobjs[key]
                sourceid = edgeobj.getSourceID()
                sourcenode = nodeobjs[sourceid]
                targetid = edgeobj.getTargetID()
                targetnode = nodeobjs[targetid]

                print 'Source node id: ' + sourceid + '=> ' + targetid + " Data type id: " + str(edgeobj.getDataType())

                record = WorkflowEdges(workflow_id = wfid,
                                       sourcenode_id = sourcenode.id,
                                       targetnode_id = targetnode.id,
                                       #sourceid = edgeobj.getSourceID(),
                                       #targetid = edgeobj.getTargetID(),
                                       datatype_id = edgeobj.getDataType(),
                                       paralleltype = edgeobj.getParallelType())
                record.save()


    except Exception as e:
        print str(e)
        return HttpResponse(json.dumps(e))

    data = {'id':str(wfid), 'name':wfname, 'desc':wfdesc }
    return HttpResponse(json.dumps(data), mimetype='application/json')

def deleteworkflow(request, workflowid):
    print "Delete workflow " + str(workflowid)
    try:
        # delete all the edges
        WorkflowEdges.objects.filter(workflow_id = workflowid).delete()
        # delete all the nodes
        WorkflowNodes.objects.filter(workflow_id = workflowid).delete()
        # delete the workflow
        Workflows.objects.filter(id = workflowid).delete()

    except Exception as e:
            print str(e)
            error = {'status':500, 'message': 'Failed to retreive workflow info' }
            return HttpResponse(json.dumps(error), mimetype='application/json')
    return HttpResponse("1")

def getworkflow(request, workflow_id):
    print "Get workflow"
    #print request.raw_post_data


    try:
        data_dict = {}
        workflowid = workflow_id
        workflow = (Workflows.objects.filter(id = workflowid))[0]
        nodes = WorkflowNodes.objects.filter(workflow_id = workflowid)
        edges = WorkflowEdges.objects.filter(workflow_id = workflowid)

        data_dict = {'id': workflow.id, 'name': workflow.name, 'desc': workflow.description}

        nodes_obj = {}
        for node in nodes:
            node_dict = {}
            print node.serviceuri
            node_dict = {'id': node.id, 'serviceuri': node.serviceuri, 'arguments': node.arguments, 'subaction': node.subaction, 'datauri': node.datauri, 'componentid': node.component_id}
            nodes_obj[node.id] = node_dict


        edges_obj = {}
        idx = 0
        for edge in edges:
            edge_dict = {}
            datatype = WorkflowEdgeDataTypes.objects.filter(id = edge.datatype_id)[0]
            #paralleltype = WorkflowEdgeDataTypes.objects.filter(id = edge.paralleltype_id)[0]
            print datatype.name
            edge_dict = {'sourcenodeid': edge.sourcenode_id, 'targetnodeid': edge.targetnode_id, 'datatype': datatype.name, 'paralleltype': edge.paralleltype}
            edges_obj[str(idx)] = edge_dict
            idx = idx + 1

        data_dict['edges'] = edges_obj
        data_dict['nodes'] = nodes_obj

        print json.dumps(data_dict)
        return HttpResponse(json.dumps(data_dict), mimetype='application/json')
    except Exception as e:
        print str(e)
        error = {'status':500, 'message': 'Failed to retreive workflow info' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

def getedgedatatypes(request):
   print "get edge data types"
   edgedatatype_dict = {}
   for edatatype in WorkflowEdgeDataTypes.objects.all():
       #print edatatype.name
       edgedatatype_dict[edatatype.id] = edatatype.name
   print json.dumps(edgedatatype_dict);
   return HttpResponse(json.dumps(edgedatatype_dict), mimetype='application/json')

@csrf_exempt
def saveedge(request):
    print "save edge"
    #print request.POST
    edgetypeid = request.POST['value']
    #print edgetypeid
    edgedatatype = WorkflowEdgeDataTypes.objects.filter(id = edgetypeid)[0]
    #print edgedatatype.name
    return HttpResponse(edgedatatype.name)

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


# This function is not used now.
# It extracts the authentication info from response of the openid server
def logincomplete(request):
    print "login redirect"
    print request.REQUEST
    mode = request.REQUEST['openid.mode']
    if mode == 'id_res':
        firstname = request.REQUEST['openid.ext1.value.firstname']
        lastname = request.REQUEST['openid.ext1.value.lastname']
        email = request.REQUEST['openid.ext1.value.email']
        identity = request.REQUEST['openid.identity']
        print firstname + ' ' + lastname + ' ' + email + ' ' + identity
        if request.user.is_authenticated():
            print 'User ' + request.user.username + ' ' + request.user.password + ' authenticated'
            #request.user.username = email
            #request.user.first_name = firstname
            #request.user.last_name = lastname
            #request.user.email = email

        userresult = Users.objects.filter(password = identity)
        if (len(userresult) == 0):
            #Create a user
            #UserManager manager
            record = Users(firstname = firstname,
                           lastname = lastname,
                           email = email,
                           password = identity)
            record.save()
        else:
            user = userresult[0]
            user.firstname = firstname
            user.lastname = lastname
            user.email = email
            user.save()
        return HttpResponseRedirect('/')
    else:
        error_message = "Invalid login."



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
