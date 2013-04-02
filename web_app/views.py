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
from django.utils import formats
from django.utils.formats import get_format
from django.db import transaction

# apparently, the location of this changed between Django versions?
# from django.contrib.csrf.middleware import csrf_exempt
from django.views.decorators.csrf import csrf_exempt
from django.core.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt

from web_app.networks.models import *
from web_app.networks.functions import functional_systems
from web_app.networks.helpers import get_influence_biclusters

#import jpype
import openid

import search as s
import itertools
import urllib2

from django.core.files import File
import os
import shutil

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

class WorkflowComponentInfo:
    def __init__(self, component):
        self.Component = component
        self.Subactions = ['Select a subaction', '------------']
        print component.subactions
        print component.serviceurl
        if component.subactions:
            #split subactions into an array
            self.Subactions.extend(component.subactions.split(';'))
        print self.Subactions


class WorkFlowEntry:
    def __init__(self, category, components):
        self.Category = category
        self.WorkflowComponents = []
        for component in components:
            print component.serviceurl
            if (component.arguments is None):
                component.arguments = ''
            if (component.serviceurl is None):
                component.serviceurl = ''
            if (component.downloadurl is None):
                component.downloadurl = ''
            if (component.short_name is None):
                component.short_name = ''
            wci = WorkflowComponentInfo(component)
            self.WorkflowComponents.append(wci)

class DataGroupEntry:
    def __init__(self, group, contents):
        print group.id
        print group.name
        print group.description

        self.ID = group.id
        self.Name = group.name
        self.Description = group.description
        self.Contents = contents

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
    componentstring = ''
    wfcategories = WorkflowCategories.objects.all()
    for category_obj in wfcategories:
        wfentry = WorkFlowEntry(category_obj, category_obj.workflowcomponents_set.all())
        wfentries.append(wfentry)
        for component in category_obj.workflowcomponents_set.all():
            componentstring += (component.name + ',' + str(component.id) + ';')
        #print("Category " + str(category_obj.id) + ": " + str(wfentries.count()))

    userid = '0' # by default the Guest user
    dbuser = Users.objects.filter(id = 0)
    isauthenticated = "false"
    if request.user.is_authenticated():
        isauthenticated = "true"
        dbuser = Users.objects.filter(email = request.user.email)

    if (len(dbuser) > 0):
        user = dbuser[0]
    elif (len(dbuser) == 0):
        user = createuser(request.user)
    userid = str(user.id)
    myworkflows = Workflows.objects.filter(owner_id = user.id)
    mydatagroups = WorkflowDataGroups.objects.filter(owner_id = user.id)
    datagroups = []
    for group in mydatagroups:
        print("Group ID: " + str(group.id))
        groupcontents = WorkflowDataGroupContent.objects.filter(group_id = group.id)
        datagroup = DataGroupEntry(group, groupcontents)
        datagroups.append(datagroup)

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
            startnode = workflow['startNode']

            if wfid:
                    # this is an existing workflow
                    # we first remove all the nodes and edges of that workflow
                    WorkflowEdges.objects.filter(workflow_id = wfid).delete()
                    WorkflowNodes.objects.filter(workflow_id = wfid).delete()
                    print "All workflow nodes and edges removed"
                    # update workflow info
                    dbworkflow = Workflows.objects.filter(id = int(wfid))
                    if dbworkflow:
                        workflowobj = dbworkflow[0]
                        workflowobj.name = wfname
                        workflowobj.description = wfdesc
                        workflowobj.save()

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
                isStartnode = False
                if (len(startnode) > 0 and startnode == nodelist[key]['id']):
                    isStartnode = True
                if (nodeobjs.has_key(nodelist[key]['id'])):
                    node = nodeobjs[nodelist[key]['id']]
                else:
                    node = WorkflowNodes(serviceuri = nodelist[key]['serviceuri'],
                                         arguments = nodelist[key]['arguments'],
                                         subaction = nodelist[key]['subaction'],
                                         datauri = nodelist[key]['datauri'],
                                         component_id = nodelist[key]['componentid'],
                                         isstartnode = isStartnode,
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

def generateworkflowobj(workflow_id):
    print "Generating workflow obj..."
    try:
        data_dict = {}
        workflowid = workflow_id
        workflow = (Workflows.objects.filter(id = workflowid))[0]
        nodes = WorkflowNodes.objects.filter(workflow_id = workflowid)
        edges = WorkflowEdges.objects.filter(workflow_id = workflowid)

        data_dict = {'id': workflow.id, 'name': workflow.name, 'desc': workflow.description}

        nodes_obj = {}
        startnode = ''
        for node in nodes:
            node_dict = {}
            print node.serviceuri
            component = WorkflowComponents.objects.filter(id = node.component_id)[0]
            node_dict = {'id': node.id, 'name': component.short_name, 'serviceuri': node.serviceuri, 'arguments': node.arguments, 'subaction': node.subaction, 'datauri': node.datauri, 'componentid': node.component_id}
            if (node.isstartnode):
                startnode = node.id
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
        data_dict['startNode'] = startnode

        return data_dict

    except Exception as e:
        return None

def getworkflow(request, workflow_id):
    print "Get workflow for " + workflow_id
    #print request.raw_post_data

    workflowobj = generateworkflowobj(workflow_id)
    if workflowobj is None:
       return HttpResponse(json.dumps("Error"),  mimetype='application/json')

    return HttpResponse(json.dumps(workflowobj), mimetype='application/json')


def getsessions(request, workflowid):
    #print "Get sessions for workflow " + workflowid

    try:
       sessions_obj = []
       sessions = WorkflowSessions.objects.filter(workflow_id = int(workflowid)).order_by('-date')
       for session in sessions:
           session_dict = {}
           print session.sessionid
           #short_datetime_format = get_format("SHORT_DATETIME_FORMAT")
           datetime = formats.date_format(session.date, "SHORT_DATETIME_FORMAT")
           session_dict = {'id': session.sessionid, 'date':  datetime } #.isoformat()}
           sessions_obj.append(session_dict)

       print json.dumps(sessions_obj)
       return HttpResponse(json.dumps(sessions_obj), mimetype='application/json')
    except Exception as e:
            print str(e)
            return HttpResponse(json.dumps(e), mimetype='application/json')

def sessionreport(request, sessionId):
    print 'Get session report page for ' + sessionId
    sessiondata = WorkflowReportData.objects.filter(sessionid = sessionId)
    mysessionid = sessionId
    return render_to_response('workflowsessionreport.html', locals())

def getsessiondata(request, sessionId):
    print 'Get session data for ' + sessionId

    try:
        # we first generate workflow obj, we need this in displaying session report data
        wfsession = WorkflowSessions.objects.filter(sessionid = sessionId)[0]
        print "workflow id: " + str(wfsession.workflow_id)
        workflowobj = generateworkflowobj(wfsession.workflow_id)
        sessiondata_dict = {'wfobj': workflowobj}

        print 'Generating report data...'
        sessiondata = WorkflowReportData.objects.filter(sessionid = sessionId)
        data_obj = {}
        for data in sessiondata:
            data_dict = {}
            print data.dataurl
            data_dict = {'id': data.id, 'dataurl': data.dataurl, 'wfnodeid': data.workflownode_id, 'componentname': data.workflowcomponentname, 'type': data.datatype}
            data_obj[data.id] = data_dict
        sessiondata_dict['sessiondata'] = data_obj

        print json.dumps(sessiondata_dict)
        return HttpResponse(json.dumps(sessiondata_dict), mimetype='application/json')
    except Exception as e:
        print str(e)
        return HttpResponse(json.dumps(e), mimetype='application/json')

def deletesession(sessionId):
    sessiondata = WorkflowReportData.objects.filter(sessionid = sessionId)
    # delete all the files of a session
    for data in sessiondata:
        try:
            print "remove file " + data.dataurl
            with open(data.dataurl, 'wb') as f:
                destination = File(f)
                destination.delete()

            #shutil.rmtree(data.dataurl)
        except Exception as e0:
            print "Failed to delete file: " + data.dataurl

    WorkflowReportData.objects.filter(sessionid = sessionId).delete()
    WorkflowSessions.objects.filter(sessionid = sessionId).delete()

def deletesessiondata(request, sessionId):
    print 'Delete session data for ' + sessionId

    try:
        deletesession(sessionId)
        return HttpResponse("1")
    except Exception as e:
        print str(e)
        return HttpResponse(json.dumps(e), mimetype='application/json')

@csrf_exempt
def deletesessionreports(request):
    print "delete session reports"
    print request.raw_post_data

    try:
        sessions = json.loads(request.raw_post_data)
        with transaction.commit_on_success():
             for key in sessions.keys():
                sessionId = sessions[key]
                print "deleting session " + sessionId
                deletesession(sessionId)
        return HttpResponse("1")
    except Exception as e:
        print str(e)
        error = {'status':500, 'status': str(e) }
        return HttpResponse(json.dumps(error), mimetype='application/json')

@csrf_exempt
def savereportdata(request):
    print "save workflow report data"
    print request.META.get('CONTENT_TYPE')
    print request.REQUEST['sessionid']
    print request.REQUEST['componentid']
    print request.REQUEST['componentworkflownodeid']
    print request.REQUEST['component-name']
    print request.REQUEST['workflowid']

    # Create a directory with the session ID
    try:
        sessionId = request.REQUEST['sessionid']
        wfid = request.REQUEST['workflowid']
        wfcomponentid = request.REQUEST['componentid']
        wfnodeid = request.REQUEST['componentworkflownodeid']
        wfcomponentname = request.REQUEST['component-name']

        #if the session is not stored in the WorkflowSessions table, add it
        print 'Adding session info...'
        if WorkflowSessions.objects.filter(sessionid = sessionId).count() == 0:
            wfsessions = WorkflowSessions(workflow_id = int(wfid),
                                          sessionid = sessionId)
            wfsessions.save()

        dataType = 'url'
        url = None
        try:
            url = request.POST['url']
        except Exception as e0:
            url = None
        print 'Saving files...'
        if (url is None or len(url) == 0):
            print 'Joining os path...'
            dataType = 'file'
            sessionpath = os.path.join('/local/network_portal/web_app/static/reportdata', wfid)
            #sessionpath = '/github/baligalab/network_portal/web_app/static/reportdata/' + wfid
            savepath = '/static/reportdata/' + wfid
            print 'Session path: ' + sessionpath
            if not os.path.exists(sessionpath):
                os.mkdir(sessionpath)

            sessionpath = sessionpath + '/' + sessionId
            savepath = savepath + '/' + sessionId
            print 'wfnode path: ' + sessionpath
            if not os.path.exists(sessionpath):
                os.mkdir(sessionpath)

            sessionpath = sessionpath + '/' + wfnodeid
            savepath = savepath + '/' + wfnodeid
            print 'wfnode path: ' + sessionpath
            if not os.path.exists(sessionpath):
                os.mkdir(sessionpath)

            print 'Save path: ' + savepath
            for key in request.FILES.keys():
                #each file is an UploadedFile object
                print 'FILE key: ' + key
                srcfile = request.FILES[key]
                fullfilename = srcfile.name
                print fullfilename
                prefix, filename = os.path.split(fullfilename)
                print 'File name: ' + filename
                with open(os.path.join(sessionpath, filename), 'wb') as f:
                    destination = File(f)
                    for chunk in srcfile.chunks():
                        destination.write(chunk)
                    destination.close()
            url = savepath + '/' + filename
            print 'File url: ' + url

        # save to the db
        reportdata = WorkflowReportData(workflow_id = wfid,
                                    sessionid = sessionId,
                                    workflownode_id = wfnodeid,
                                    workflowcomponentname = wfcomponentname,
                                    dataurl = url,
                                    datatype = dataType)
        reportdata.save()
        return HttpResponse("1", content_type="text/plain")
    except Exception as e:
        print str(e)
        return HttpResponse(json.dumps(e), mimetype='application/json')

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

@csrf_exempt
def saveworkflowdatagroup(request):
    try:
        datagroup = json.loads(request.raw_post_data)
    except Exception as e:
        print str(e)
        error = {'status':500, 'desc': 'Failed to load json' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    try:
        name = datagroup['name']
        print name
        group = WorkflowDataGroups(owner_id = datagroup['userid'],
                                   name = datagroup['name'],
                                   description = datagroup['desc'])
        group.save()
        groupid = group.id
        print str(groupid)

        nodelist = datagroup['data']
        nodeobjs = {}
        for key in nodelist.keys():
            link = nodelist[key]
            content = WorkflowDataGroupContent(group_id = groupid, dataurl = link['url'], urltext = link['text'])
            content.save()
            print "Data group content saved with id: " + str(content.id)
    except Exception as e1:
        print str(e1)

    data = {'id': str(groupid) }
    return HttpResponse(json.dumps(data), mimetype='application/json')

@csrf_exempt
def deleteworkflowdatagroup(request, datagroupid):
    print 'delete data group ' + str(datagroupid)

    try:
        WorkflowDataGroups.objects.filter(id = datagroupid).delete()
    except Exception as e:
        print str(e)
        error = {'status':500, 'message': 'Failed to delete workflow data group' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    return HttpResponse("1")

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
