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
from django.utils import formats
from django.utils.formats import get_format
from django.db import transaction
from django.conf import settings
import pytz
import time
from datetime import datetime
from datetime import timedelta
from django.utils.timezone import utc

# apparently, the location of this changed between Django versions?
# from django.contrib.csrf.middleware import csrf_exempt
from django.views.decorators.csrf import csrf_exempt
from django.core.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt

from networks.models import *
from networks.functions import functional_systems
from networks.helpers import get_influence_biclusters

import openid

import itertools
import urllib2

from django.core.files import File
import os
import mimetypes
import shutil
from collections import namedtuple

Dialog = namedtuple('Dialog', ['name', 'short_name', 'network_url', 'ngenes', 'ntfs', 'coords'])

def home(request):
    genes = Gene.objects.all()
    bicl_count = Bicluster.objects.count()
    sp_count = Species.objects.count()
    net_count = Network.objects.count()
    motif_count = Motif.objects.count()
    influence_count = Influence.objects.count()
    version = "0.0.1"
    dialogs = [
        Dialog('Methanococcus maripaludis S2', 'mmp', '/mmp/network/1', 1863, 57, '75,0,266,16'),
        Dialog('Halobacterium salinarum NRC-1', 'hal', '/hal/network/1', 2701, 125, '75,27,266,43'),
        Dialog('Bacteroides_thetaiotaomicron_VPI-5482', 'bth', '/bth/network/1', 4902, 0, '76,55,318,71'),
        Dialog('Clostridium_acetobutylicum', 'cac', '/cac/network/1', 3995, 259, '102,84,344,100'),
        Dialog('Bacillus_cereus_ATCC14579', 'bce', '/bce/network/1', 5501, 376, '126,112,302,128'),
        Dialog('Bacillus_subtilis', 'bsu', '/bsu/network/1', 4313, 319, '134,142,367,158'),
        Dialog('Synechococcus elongatus PCC 7942', 'syf', '/syf/network/1', 2717, 'Pending Inferelator', '76,170,291,186'),
        Dialog('Rhodobacter_sphaeroides_2_4_1', 'rsp', '/rsp/network/1', 4341, 231, '103,198,299,214'),
        Dialog('Pseudomonas_aeruginosa', 'pae', '/pae/network/1', 5646, 475, '131,227,327,243'),
        Dialog('Escherichia_coli_K12', 'eco', '/eco/network/1', 4497, 'Pending Inferelator', '131,255,267,271'),
        Dialog('Campylobacter_jejuni', 'cje', '/cje/network/1', 1711, 39, '130,285,350,301'),
        Dialog('Geobacter_sulfurreducens', 'gsu', '/gsu/network/1', 3519, 156, '158,313,351,329'),
        Dialog('Desulfovibrio vulgaris Hildenborough', 'dvu', '/dvu/network/1', 3661, 128, '179,338,407,353')
        ]
    return render_to_response('home.html', locals())

def about(request):
    version = "0.0.1"
    return render_to_response('about.html', locals()) 

def contact(request):
    return render_to_response('contact.html', locals())

def inference(request):
    return render_to_response('inference.html', locals())

class WorkflowComponentSubactionInfo:
    def __init__(self, n, v):
        self.name = n
        self.url = v

class WorkflowComponentInfo:
    def __init__(self, component):
        print 'Paring workflow component ' + component.name

        self.Component = component

        self.Subactions = []
        selectsubaction = WorkflowComponentSubactionInfo('Select a subaction', 'Select a subaction')
        self.Subactions.append(selectsubaction)
        seperator = WorkflowComponentSubactionInfo('------------', '------------')
        self.Subactions.append(seperator)

        print component.subactions
        #print component.serviceurl
        if component.subactions is not None:
            #split subactions into an array
            subactions = component.subactions.split(';')
            #self.Subactions.extend(component.subactions.split(';'))

            for subaction in subactions:
                print 'subaction ' + subaction
                if subaction is not None:
                    url = subaction
                    #try to extract url of the subaction (could be null)
                    try:
                        goose = WorkflowComponents.objects.filter(short_name = subaction)[0]
                        print 'goose result ' + goose.short_name
                        if goose is not None:
                          print 'Found goose for subaction ' + subaction + ' url ' + goose.serviceurl
                          url = goose.serviceurl
                          if url is None:
                            url = subaction
                    except Exception as e:
                            print str(e)
                print 'subaction ' + subaction + ' url ' + url
                subactioninfo = WorkflowComponentSubactionInfo(subaction, url)
                self.Subactions.append(subactioninfo)
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
    print 'user ID: ' + userid
    myworkflows = Workflows.objects.filter(owner_id = user.id).filter(temporary = False)
    mydatagroups = WorkflowDataGroups.objects.filter(owner_id = user.id)
    datagroups = []
    for group in mydatagroups:
        print("Group ID: " + str(group.id))
        groupcontents = WorkflowDataGroupContent.objects.filter(group_id = group.id)
        datagroup = DataGroupEntry(group, groupcontents)
        datagroups.append(datagroup)


    # captureddata = WorkflowCapturedData.objects.filter(owner_id = user.id)

    organisms = Species.objects.all().order_by('name')

    organismdatatypes = OrganismDataTypes.objects.all().order_by('id')

    savedstates = SavedStates.objects.filter(owner_id = user.id)

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
def getdataspace(request):
    print request.raw_post_data

    try:
        query = json.loads(request.raw_post_data)
        print 'Organism: ' + query['organism']
        print 'user id: ' + query['userid']

        returndata = {}
        index = 0

        organismobj = Species.objects.filter(short_name = query['organism'])[0]

        print 'Get predefined data for ' + str(organismobj.id)
        predefinedorganismdata = WorkflowCapturedData.objects.filter(owner_id = 0, organism_id = organismobj.id)
        for data in predefinedorganismdata:
            datatypeobj = OrganismDataTypes.objects.filter(id = data.type_id)[0]
            print 'data type: ' + datatypeobj.type
            linkobj = {'id': data.id, 'userid': '0', 'organism': organismobj.name, 'datatype': datatypeobj.type, 'text': data.urltext, 'url': data.dataurl, 'desc': data.description}
            returndata[str(index)] = linkobj
            index = index + 1

        if (query['userid'] != '0'):
            print 'Get user data'
            ownerdata = WorkflowCapturedData.objects.filter(owner_id = int(query['userid']), organism_id = organismobj.id)
            for data in ownerdata:
                datatypeobj = OrganismDataTypes.objects.filter(id = data.type_id)[0]
                print 'data type: ' + datatypeobj.type
                linkobj = {'id': data.id, 'userid': query['userid'], 'organism': organismobj.name, 'datatype': datatypeobj.type, 'text': data.urltext, 'url': data.dataurl, 'desc': data.description}
                returndata[str(index)] = linkobj
                index = index + 1

        # get captured data (i.e., captured)
        if query['organism'] != 'Generic':
            print 'Get captured data'
            genericorganismobj = Species.objects.filter(name = 'Generic')[0]
            genericdatatypeobj = OrganismDataTypes.objects.filter(type = 'Generic')[0]
            ownercaptureddata = WorkflowCapturedData.objects.filter(owner_id = int(query['userid']), organism_id = genericorganismobj.id, type_id = genericdatatypeobj.id)
            for data in ownercaptureddata:
                print 'data type: ' + datatypeobj.type
                linkobj = {'id': data.id, 'userid': query['userid'], 'organism': organismobj.name, 'datatype': genericdatatypeobj.type, 'text': data.urltext, 'url': data.dataurl, 'desc': data.description}
                returndata[str(index)] = linkobj
                index = index + 1

    except Exception as e:
        print str(e)

    print json.dumps(returndata)
    return HttpResponse(json.dumps(returndata), mimetype='application/json')

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

def deletefile(filepath):
    try:
        print 'delete file: ' + filepath
        #basepath = '/github/baligalab/network_portal/web_app'
        #basepath = '/local/network_portal/web_app'
        basepath = settings.USERDATA_ROOT

        fullpath = basepath + filepath
        print 'delete full path: ' + fullpath
        os.remove(fullpath)
    except Exception as e:
        print str(e)

def savefile(filepath, srcfile):
    try:
        print 'save file: ' + filepath
        #basepath = '/github/baligalab/network_portal/web_app'
        #basepath = '/local/network_portal/web_app'
        print 'base path: ' + settings.USERDATA_ROOT
        basepath = settings.USERDATA_ROOT

        #Use / as seperator to make sure everything works in the boss code
        fullpath = basepath + "/" + filepath
        print 'save full path: ' + fullpath
        with open(fullpath, 'wb') as f:
            destination = File(f)
            for chunk in srcfile.chunks():
                destination.write(chunk)
            destination.close()
    except Exception as e:
        print str(e)

def makedir(path):
    try:
        print 'Make directory ' + path

        #basepath = '/github/baligalab/network_portal/web_app'
        #basepath = '/local/network_portal/web_app'

        basepath = settings.USERDATA_ROOT
        print 'base path: ' + basepath

        fullpath = os.path.join(basepath, path)
        print 'full path: ' + fullpath
        if not os.path.exists(fullpath):
            os.makedirs(fullpath)
        return fullpath
    except Exception as e:
        print str(e)
        return ''


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
            print 'workflow id: ' + wfid + ' owner ' + wfownerid

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
                        workflowobj.temporary = False
                        workflowobj.save()

            else:
                # save the workflow info
                workflowentry = Workflows(name = wfname, description = wfdesc, owner_id = int(wfownerid), temporary = False)
                workflowentry.save()
                wfid = workflowentry.id
                print "Workflow saved with id: " + str(wfid) + " owner " + wfownerid

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
                                         workflow_id = wfid,
                                         workflowindex = nodelist[key]['workflowindex'])
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

        data_dict = {'id': workflow.id, 'name': workflow.name, 'desc': workflow.description, 'temporary': workflow.temporary}

        nodes_obj = {}
        startnode = ''
        for node in nodes:
            node_dict = {}
            print node.serviceuri
            component = WorkflowComponents.objects.filter(id = node.component_id)[0]
            node_dict = {'id': node.id, 'name': component.short_name, 'serviceuri': node.serviceuri, 'arguments': node.arguments, 'subaction': node.subaction, 'datauri': node.datauri, 'componentid': node.component_id, 'workflowindex': node.workflowindex}
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


@csrf_exempt
def getsessions(request):
    #print "Get sessions for workflow " + workflowid

    try:
       jsonobj = json.loads(request.raw_post_data)
       workflowid = jsonobj['workflowid']
       userid = jsonobj['userid']

       print 'Get sessions for workflow ' + workflowid
       workflowobj = Workflows.objects.filter(id = int(workflowid))[0]
       sessions_obj = []
       sessions = []
       if (workflowobj.temporary):
           #if this is a temporary workflow (i.e., a workflow that has not been saved yet),
           #we just get one session since all the "sessions" actually belong to one uber-session
           #In getsessiondata, we retrieve all the data belong to the workflow
           session = WorkflowSessions.objects.filter(workflow_id = int(workflowid)).order_by('-date')[0]
           sessions.append(session)
       else:
           sessions = WorkflowSessions.objects.filter(workflow_id = int(workflowid)).order_by('-date')

       for session in sessions:
           session_dict = {}
           print session.sessionid
           #short_datetime_format = get_format("SHORT_DATETIME_FORMAT")
           dt = formats.date_format(session.date, "SHORT_DATETIME_FORMAT")
           session_dict = {'id': session.sessionid, 'date':  dt } #.isoformat()}
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
        if (workflowobj['temporary']):
            #this is a temporary workflow, we get ALL its sessions
            sessiondata = WorkflowReportData.objects.filter(workflow_id = workflowobj['id'])
        else:
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
    print request.REQUEST['userid']
    print request.REQUEST['sessionid']
    print request.REQUEST['componentid']
    print request.REQUEST['componentworkflownodeid']
    print request.REQUEST['component-name']
    print request.REQUEST['workflowid']

    # Create a directory with the session ID
    try:
        userid = request.REQUEST['userid']
        sessionId = request.REQUEST['sessionid']
        wfid = request.REQUEST['workflowid']
        wfcomponentid = request.REQUEST['componentid']
        wfnodeid = request.REQUEST['componentworkflownodeid']
        wfcomponentname = request.REQUEST['component-name']

        #if the session is not stored in the WorkflowSessions table, add it
        print 'Adding session info...'
        newwfid = wfid
        isTempWorkflow = True
        if int(wfid) < 0:
            print 'Adding temprorary workflow...'
            tempwf = Workflows(name = 'temp', owner_id = int(userid), shared = False, temporary = True)
            tempwf.save()
            newwfid = str(tempwf.id)
        elif Workflows.objects.filter(id = int(wfid)).count() > 0:
            workflowobj = Workflows.objects.filter(id = int(wfid))[0]
            isTempWorkflow = workflowobj.temporary
        print str(isTempWorkflow)

        if (isTempWorkflow):
            print 'Adding temporary workflow node...'
            componentid = int(wfcomponentid[(wfcomponentid.rfind('_') + 1) :])
            print 'component id: ' + str(componentid)
            tempwfnode = WorkflowNodes(serviceuri = '',
                                      arguments = '',
                                      subaction = '',
                                      datauri = '',
                                      component_id = componentid,
                                      isstartnode = False,
                                      workflow_id = newwfid,
                                      workflowindex = 0)
            tempwfnode.save()
            wfnodeid = str(tempwfnode.id)

        wfid = newwfid
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
        urlist = []
        if (url is None or len(url) == 0):
            print 'Joining os path...'
            dataType = 'file'
            #sessionpath = os.path.join('/local/network_portal/web_app/static/reportdata', wfid)
            #sessionpath = '/github/baligalab/network_portal/web_app/static/reportdata/' + wfid

            #Uncomment on test machine
            #sessionpath = makedir('static/reportdata/' + wfid)

            #Comment on test machine
            sessionpath = makedir('reportdata/' + wfid)

            savepath = '/workflow/getreportdata/' + wfid
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
            urlist.append(url)
        else:
            urlist = re.split(';', url)

        # save to the db
        for oneurl in urlist:
            reportdata = WorkflowReportData(workflow_id = wfid,
                                        sessionid = sessionId,
                                        workflownode_id = wfnodeid,
                                        workflowcomponentname = wfcomponentname,
                                        dataurl = oneurl,
                                        datatype = dataType)
            reportdata.save()
        return HttpResponse(wfid, content_type="text/plain")
    except Exception as e:
        print 'Failed to save session ' + str(e)
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
        print 'save workflow group ' + request.raw_post_data
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
        index = 0
        for key in nodelist.keys():
            link = nodelist[key]
            content = WorkflowDataGroupContent(group_id = groupid, dataurl = link['url'], urltext = link['text'])
            content.save()
            groupcontent = { 'inputid': link['inputid'], "id": str(content.id) }
            nodeobjs[str(index)] = groupcontent
            print "Data group content saved with id: " + str(content.id)
            index = index + 1
    except Exception as e1:
        print str(e1)

    data = {'id': str(groupid), 'contents': nodeobjs }
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

@csrf_exempt
def deleteworkflowgroupitem(request):
    try:
        itemstodelete = json.loads(request.raw_post_data)
        print 'delete data group items ' + request.raw_post_data

        data = itemstodelete['data']
        for key in data.keys():
            item = data[key]
            try:
                print 'item id: ' + str(item['id'])
                WorkflowDataGroupContent.objects.filter(id = int(item['id'])).delete()
            except Exception as e1:
                print str(e1)

    except Exception as e:
        print str(e)
        error = {'status':500, 'message': 'Failed to delete workflow data group' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    data = {'id': itemstodelete['id'] }
    return HttpResponse(json.dumps(data))

@csrf_exempt
def savecaptureddata(request):
    try:
        captureddata = json.loads(request.raw_post_data)
        print captureddata
    except Exception as e:
        print str(e)
        error = {'status':500, 'desc': 'Failed to load json' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    try:
        #print captureddata['userid']
        responsedata = {}
        idx = 0
        nodelist = captureddata['data']
        nodeobjs = {}
        for key in nodelist.keys():
            link = nodelist[key]
            dataid = int(link['nodeindex'])
            print 'data id: ' + str(dataid)
            content = None
            if dataid >= 0:
                content = WorkflowCapturedData.objects.filter(id = dataid)[0]

            organismtype = link['organism']
            if (organismtype is None or len(organismtype) == 0):
                organismtype = 'Generic'

            organism = Species.objects.filter(short_name = organismtype)[0]
            print 'organism id: ' + str(organism.id)

            dtype =  link['datatype']
            print 'data type: ' + dtype
            datatypeobj = OrganismDataTypes.objects.filter(type = dtype)[0]

            desc = link['description']

            if (content is None):
                content = WorkflowCapturedData(owner_id = captureddata['userid'], type_id = datatypeobj.id, dataurl = link['url'], urltext = link['text'], organism_id = organism.id, description = desc)
                content.save()
            else:
                content.type_id = datatypeobj.id
                content.dataurl = link['url']
                content.urltext = link['text']
                content.description = desc
                content.save()

            print "Data group content saved with id: " + str(content.id)
            pair = {'nodeindex': link['nodeindex'], 'id': str(content.id), 'organism': organism.name, 'datatype': datatypeobj.type, 'description': desc }
            responsedata[str(idx)] = pair
            idx = idx + 1
    except Exception as e1:
        print str(e1)

    print json.dumps(responsedata)
    return HttpResponse(json.dumps(responsedata), mimetype='application/json')

@csrf_exempt
def deletecaptureddata(request):
    try:
        print 'deletecaptureddata'
        datatodelete = json.loads(request.raw_post_data)
    except Exception as e:
        print str(e)
        error = {'status':500, 'desc': 'Failed to load json' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    try:
        nodelist = datatodelete['data']
        for key in nodelist.keys():
            link = nodelist[key]
            if int(link['id']) >= 0:
               try:
                   captureddata = WorkflowCapturedData.objects.filter(id = int(link['id']))[0]
                   deletefile(captureddata.dataurl)
               except Exception as e2:
                   print str(e2)

               WorkflowCapturedData.objects.filter(id = int(link['id'])).delete()

    except Exception as e1:
        print str(e1)
        return HttpResponse(json.dumps(e1), mimetype='application/json')

    response = {'id': '1' }
    return HttpResponse(json.dumps(response), mimetype='application/json')

@csrf_exempt
def uploaddata(request):
    print 'Save upload data'
    try:
        print request.REQUEST['organismtype']
        print request.REQUEST['datatype']
        print request.REQUEST['userid']
        print request.REQUEST['description']

        userid = request.REQUEST['userid']
        organismtype = request.REQUEST['organismtype']
        if (organismtype is None or len(organismtype) == 0):
           organismtype = 'Generic'


        desc = request.REQUEST['description']
        if organismtype is None:
            organismtype = 'Generic'
        organism = Species.objects.filter(short_name = organismtype)[0]
        print 'organism id: ' + str(organism.id)

        dtype =  request.REQUEST['datatype']
        if (dtype == 'undefined'):
            dtype = 'Generic'
        datatypeobj = OrganismDataTypes.objects.filter(type = dtype)[0]

        datatext = ''
        try:
            datatext = request.REQUEST['text']
        except Exception as e2:
            datatext = ''
        print 'data text: ' + str(datatext)

        dataid = ''
        try:
            dataid = request.REQUEST['nodeindex']
        except Exception as e1:
            dataid = ''
        print 'data id: ' + str(dataid)

        #sessionpath = os.path.join('/local/network_portal/web_app/static/data', organismtype)
        #sessionpath = os.path.join('/github/baligalab/network_portal/web_app/static/data', organismtype)

        #Uncomment this for test machine
        physicalpath = organismtype #os.path.join('static/data', organismtype)

        #Comment this for test machine
        #physicalpath = os.path.join('data', organismtype)

        physicalpath = os.path.join(physicalpath, dtype)
        physicalpath = os.path.join(physicalpath, userid)
        physicalpath = makedir(physicalpath)
        print 'save path: ' + physicalpath
        savepathurl = '/workflow/getuserdata/' + organismtype + '/' + dtype + '/' + userid

        responsedata = {}
        #responsedata['organismtype'] = organismtype
        #responsedata['datatype'] = dtype
        idx = 0
        for key in request.FILES.keys():
            #each file is an UploadedFile object
            print 'FILE key: ' + key
            srcfile = request.FILES[key]
            fullfilename = srcfile.name
            print fullfilename
            prefix, filename = os.path.split(fullfilename)
            print 'File name: ' + filename
            with open(os.path.join(physicalpath, filename), 'wb') as f:
                destination = File(f)
                for chunk in srcfile.chunks():
                    destination.write(chunk)
                destination.close()

            dataurl = savepathurl + '/' + filename
            print 'File url: ' + dataurl

            if (len(datatext) == 0):
               datatext = filename

            # save to DB
            data = WorkflowCapturedData(owner_id = userid, type_id = datatypeobj.id, dataurl = dataurl, urltext = datatext, organism_id = organism.id, description = desc)
            data.save()

            pair =  {'id': str(data.id), 'userid': userid, 'organism': organismtype, 'datatype': dtype, 'text' : datatext, 'url': dataurl, 'desc': desc, 'dataid': dataid }
            responsedata[str(idx)] = pair
            idx = idx + 1
    except Exception as e:
        print str(e)
        error = {'status':500, 'message': 'Failed to save data file' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    print 'Upload files response: ' + json.dumps(responsedata)
    return HttpResponse(json.dumps(responsedata), mimetype='application/json')

@csrf_exempt
def getstateinfo(request, stateid):
    print 'get state info'
    print stateid

    try:
        #stateid = int(request.REQUEST['stateid'])
        files = StateFiles.objects.filter(state_id = int(stateid))
        state = SavedStates.objects.filter(id = int(stateid))[0]
        print state.id

        gooseobjs = {}
        for file in files:
            print file.name
            goosefilename = re.split('_', file.name)[2]
            print goosefilename
            goosename = os.path.splitext(goosefilename)[0]
            print 'goose name: ' + goosename

            if gooseobjs.has_key(goosename):
                pair = gooseobjs[goosename]
            else:
                component = WorkflowComponents.objects.filter(short_name = goosename)[0]
                pair = { 'goosename': component.name, 'serviceurl': component.serviceurl, 'files': 0 }
                fileobj = {}
                pair['fileobj'] = fileobj
                gooseobjs[goosename] = pair

            print 'goose obj has ' + str(pair['files']) + ' files'
            #fileurl = 'http://' + request.get_host() + '/static/data/states/' + str(state.owner_id) + '/' + file.name
            fileurl = 'http://' + request.get_host() + '/workflow/getuserdata/states/states/' + str(state.owner_id) + '/' + file.name

            print fileurl
            filecnt = pair['files']
            fileobj = pair['fileobj']
            fileinfo = { 'fileurl': fileurl }
            pair['files'] = filecnt + 1
            fileobj[str(filecnt)] = fileinfo
            print json.dumps(gooseobjs)

    except Exception as e:
        print 'Failed to get saved state info ' + str(e)
        error = {'status':500, 'message': 'Failed to get saved state info' }
        return HttpResponse(json.dumps(error), mimetype='application/json')
    return HttpResponse(json.dumps(gooseobjs), mimetype='application/json')

@csrf_exempt
def deletesavedstate(request, stateid):
    print 'delete saved state'
    try:
        #stateid = request.REQUEST['stateid']
        print 'state id ' + stateid
        #delete files
        files = StateFiles.objects.filter(state_id = int(stateid))
        for file in files:
            print "remove file " + file.url
            try:
                #hostname = request.get_host()
                #fileurl = os.path.join(BASE_PATH, file.url)
                print 'file path: ' + file.url
                #with open(file.url, 'wb') as f:
                #    destination = File(f)
                #    destination.delete()
                #os.remove(fileuurl)
                deletefile(file.url)
            except Exception as e0:
                print str(e0)
        print 'remove state DB object'
        SavedStates.objects.filter(id = int(stateid)).delete()

    except Exception as e:
        print str(e)
        error = {'status':500, 'message': 'Failed to delete workflow data group' }
        return HttpResponse(json.dumps(error), mimetype='application/json')
    return HttpResponse("1")


@csrf_exempt
def savestate(request):
    print 'Save state'
    try:
        print request.REQUEST['userid']

        stateid = request.REQUEST['stateid']
        userid = request.REQUEST['userid']
        statename = request.REQUEST['name']
        statedesc = request.REQUEST['desc']
        #sessionpath = os.path.join('/local/network_portal/web_app/static/data', 'states')
        #statepath = os.path.join('/github/baligalab/network_portal/web_app/static/data', 'states')

        #Uncomment the following for test machines
        #statepath = os.path.join('static', 'data')
        #statepath = os.path.join(statepath, 'states')

        #Comment the following for test machines
        statepath = 'states/states'

        statepath = os.path.join(statepath, userid)
        makedir(statepath)
        print 'save path: ' + statepath
        savepathurl = '/workflow/getuserdata/states/states/' + userid

        responsedata = {}
        #responsedata['organismtype'] = organismtype
        #responsedata['datatype'] = dtype

        # save to DB
        if len(stateid) == 0:
            utcnow = datetime.utcnow().replace(tzinfo=utc)
            data = SavedStates(owner_id = int(userid), name = statename, description = statedesc, created_at = utcnow)
            data.save()
            stateid = str(data.id)
            totalseconds = round((datetime.now() - datetime.utcnow()).total_seconds())
            print 'seconds difference: ' + str(totalseconds)
            tdelta = timedelta(seconds = totalseconds)
            lcltm = data.created_at + tdelta
            dt = formats.date_format(lcltm, "SHORT_DATETIME_FORMAT")
            pair =  {'id': str(data.id), 'name': statename, 'desc': statedesc, 'timestamp': dt}
        else:
            pair =  {'id': stateid, 'name': statename, 'desc': statedesc }
        responsedata['state'] = pair

        for key in request.FILES.keys():
            #each file is an UploadedFile object
            print 'FILE key: ' + key
            srcfile = request.FILES[key]
            fullfilename = srcfile.name
            print fullfilename
            prefix, filename = os.path.split(fullfilename)
            print 'File name: ' + filename
            filesavepath = os.path.join(statepath, filename)
            savefile(filesavepath, srcfile)

            #with open(os.path.join(statepath, filename), 'wb') as f:
            #    destination = File(f)
            #    for chunk in srcfile.chunks():
            #        destination.write(chunk)
            #    destination.close()

            dataurl = savepathurl + '/' + filename
            print 'File url: ' + dataurl + ' state id: ' + stateid
            sf = StateFiles(state_id = stateid, name = filename, url = dataurl)
            sf.save()

    except Exception as e:
        print str(e)
        error = {'status':500, 'message': str(e) }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    print json.dumps(responsedata)
    return HttpResponse(json.dumps(responsedata), mimetype='application/json')

@csrf_exempt
def updatestate(request):
    try:
        statedata = json.loads(request.raw_post_data)
        print statedata
    except Exception as e:
        print str(e)
        error = {'status':500, 'desc': 'Failed to load json' }
        return HttpResponse(json.dumps(error), mimetype='application/json')

    try:
        #print captureddata['userid']
        responsedata = {}
        idx = 0
        stateid = int(statedata['id'])
        content = SavedStates.objects.filter(id = stateid)[0]
        content.name = statedata['name']
        content.description = statedata['description']
        content.save()

        print "State saved with id: " + str(content.id)
        pair = {'id': str(stateid), 'name': content.name, 'description': content.description }
        responsedata['data'] = pair

    except Exception as e1:
        print str(e1)

    print json.dumps(responsedata)
    return HttpResponse(json.dumps(responsedata), mimetype='application/json')


@csrf_exempt
def getuserdata(request, organismtype, datatype, userid, filename):
    print organismtype
    print datatype
    print userid
    print filename

    try:
        mimetypes.init()

        file_path = settings.USERDATA_ROOT + '/' + organismtype + '/' + datatype + '/' + userid + '/' + filename
        print 'file path: ' + file_path
        fsock = open(file_path,"rb")
        #file = fsock.read()
        #fsock = open(file_path,"rb").read()
        file_name = os.path.basename(file_path)
        print file_name
        file_size = os.path.getsize(file_path)
        print "file size is: " + str(file_size)
        mime_type_guess = mimetypes.guess_type(file_name)
        if mime_type_guess is not None:
            response = HttpResponse(fsock, mimetype=mime_type_guess[0])
        response['Content-Disposition'] = 'attachment; filename=' + filename
    except Exception as e:
        print 'Failed to get user file ' + str(e)
        response = HttpResponseNotFound()

    return response

@csrf_exempt
def getreportdata(request, workflowid, sessionid, workflownodeid, filename):
    print workflowid
    print sessionid
    print workflownodeid
    print filename

    try:
        mimetypes.init()

        file_path = settings.USERDATA_ROOT + '/' + 'reportdata/' + workflowid + '/' + sessionid + '/' + workflownodeid + '/' + filename
        print 'file path: ' + file_path
        fsock = open(file_path,"rb")
        #file = fsock.read()
        #fsock = open(file_path,"rb").read()
        file_name = os.path.basename(file_path)
        print file_name
        file_size = os.path.getsize(file_path)
        print "file size is: " + str(file_size)
        mime_type_guess = mimetypes.guess_type(file_name)
        if mime_type_guess is not None:
            response = HttpResponse(fsock, mimetype=mime_type_guess[0])
        response['Content-Disposition'] = 'attachment; filename=' + filename
    except Exception as e:
        print str(e)
        response = HttpResponseNotFound()

    return response




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
