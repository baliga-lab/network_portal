import traceback
from urllib2 import URLError

import gzip
import json
import sqlite3
import tempfile
import time
import datetime

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponse, HttpResponseRedirect
from django.conf import settings
from django.contrib import messages
from django import forms

from .forms import UploadConfigForm, UploadRunResultForm, KBaseCmonkeyForm
from .models import InferenceJob
from networks.models import Species

from kbcmonkey import kbase
import kbcmonkey.UserAndJobStateClient as ujs
import kbcmonkey.WorkspaceClient as wsc

import cmonkey.datamatrix as dm
import cmonkey.util as util

import uuid
#import startboto


def kbasejob(request):
    if request.method == 'POST':
        form = UploadConfigForm(request.POST, request.FILES)
        if form.is_valid():
            orgcode = form.cleaned_data['organism']
            species = Species.objects.filter(short_name=orgcode)

            f = request.FILES['file']
            path = write_uploadfile(f)

            """
            ws = kbase.workspace(settings.KBASE_USER,
                                 settings.KBASE_PASSWD,
                                 settings.KBASE_DATA_WORKSPACE,
                                 settings.KBASE_WS_SERVICE_URL)
            """
            try:
                jobid = kbase.run_cmonkey(settings.KBASE_USER, settings.KBASE_PASSWD,
                                          settings.KBASE_CM_SERVICE_URL,
                                          settings.KBASE_CMRESULTS_WORKSPACE,
                                          'nwportal:input1/%s.ratios' % orgcode,  # TODO
                                          'nwportal:nwportal_data/%s.genome' % orgcode,
                                          'nwportal:nwportal_data/%s.string' % orgcode,
                                          'nwportal:nwportal_data/%s.operome' % orgcode)

                # only if we have started the cmonkey job
                job = InferenceJob()
                job.user = request.user
                job.species = species[0]
                job.tmpfile = filename
                job.status = 1
                job.compute_on = 'kbase'
                job.ec2ip = None
                job.cm_job_id = jobid
                job.save()
                messages.info(request, "KBase cmonkey job started with id '%s'" % jobid)

            except URLError:
                messages.error(request, "Can not connect to KBase cmonkey service")
            except:
                traceback.print_exc()
                messages.error(request, "Unknown error")

            return HttpResponseRedirect('/userdata')

        else:
            messages.error(request, "form is not valid")
    else:
        form = UploadConfigForm()

    return render_to_response('kbasejob.html', locals(),
                              context_instance=RequestContext(request))


class JobRepr:
    def __init__(self, species, created_at, status, compute_on, use_ensemble):
        self.species = species
        self.created_at = created_at
        self.status = status
        self.compute_on = compute_on
        self.use_ensemble = 'yes' if use_ensemble else 'no'


def job_repr(ujs_client, job):
    if job.cm_job_id is not None:
        status_obj = ujs_client.get_job_status(job.cm_job_id)
        if status_obj[1] == 'started':
            status = "%s (%s)" % (status_obj[1], status_obj[2])
        elif status_obj[1] == 'complete':
            results = ujs_client.get_results(job.cm_job_id)['workspaceids']
            if len(results) > 0:
                result_id = results[0]
                path = result_id.split('/')
                workspace_name, result_name = path
            status = "completed, result at: workspace '%s' object '%s'" % (workspace_name,
                                                                           result_name)
            ws = kbase.workspace(settings.KBASE_USER,
                                 settings.KBASE_PASSWD,
                                 settings.KBASE_WS_SERVICE_URL, workspace_name)
            obj = ws.get_object(result_name)['data']
            with open('cmresult.json', 'w') as outfile:
                outfile.write(json.dumps(obj))
        else:
            print status_obj
            status = '%s - %s' % (status_obj[1], status_obj[2])
    else:
        status = "N/A"
    return JobRepr(job.species.name, job.created_at, status, job.compute_on, job.use_ensemble)
    
def userdata(request):
    print request.user.username
    ujs_client = ujs.UserAndJobState(url=settings.KBASE_UJS_SERVICE_URL,
                                     user_id=settings.KBASE_USER,
                                     password=settings.KBASE_PASSWD)
    jobs = InferenceJob.objects.filter(user=request.user)
    jobs = [job_repr(ujs_client, job) for job in jobs]

    cmform = UploadRunResultForm()
    kbcmform = KBaseCmonkeyForm()

    return render_to_response('userdata.html', locals(),
                              context_instance=RequestContext(request))


def write_uploadfile(upload_file):
    filename = ''
    with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
        filename = tmpfile.name
        for chunk in upload_file.chunks():
            tmpfile.write(chunk)
    print "written as: ", filename
    return filename
    

def process_ratiofile(ratiofile):
    destfilename = write_uploadfile(ratiofile)

    if ratiofile.name.endswith('gz'):
        infile = gzip.open(destfilename, 'rb')
    else:
        infile = gzip.open(destfilename)
    line0 = infile.readline()
    print line0


def process_resultfile(resultfile):
    destfilename = write_uploadfile(resultfile)
    try:
        conn = sqlite3.connect(destfilename)
        cur = conn.cursor()
        cur.execute('select count(*) from run_infos')
        num_runinfos = cur.fetchone()[0]
        print "# RUNINFOS: ", num_runinfos
        conn.close()
        return {'status': 'ok'}
    except:
        print "not a sqlite file"
        return {'status': 'error'}

def upload_cmrun(request):
    """This is the form action for uploading and importing a user cmonkey run into the system
    """
    print "upload_cmrun()"
    if request.method == 'POST':
        form = UploadRunResultForm(request.POST, request.FILES)
        if form.is_valid():
            ratiofile = request.FILES['ratios']
            resultfile = request.FILES['result']            
            process_ratiofile(ratiofile)
            process_resultfile(resultfile)
            result = {"status": "ok", "message": "YIPPIEH !"}
        else:
            print "ERROR: ", form.errors
            result = {"status": "error", "message": form.errors}
        return HttpResponse(json.dumps(result), content_type='application/json')
    else:
        raise Exception('BOOOOO')


def start_kbase_cm(request):
    """This is the form action for uploading and importing a user cmonkey run into the system
    """
    print "start_kbase_cm()"
    if request.method == 'POST':
        form = KBaseCmonkeyForm(request.POST, request.FILES)
        if form.is_valid():
            ratiofile = request.FILES['ratios']
            if 'operons' in request.FILES:
                operonfile = request.FILES['operons']
            else:
                operonfile = None
            if 'string_edges' in request.FILES:
                stringfile = request.FILES['string_edges']
            else:
                stringfile = None
            use_ensemble = form.cleaned_data['use_ensemble']
            organism = form.cleaned_data['organism']

            ws_service = wsc.Workspace(settings.KBASE_WS_SERVICE_URL,
                                       user_id=settings.KBASE_USER,
                                       password=settings.KBASE_PASSWD)

            data_ws = kbase.workspace(settings.KBASE_WS_SERVICE_URL,
                                      settings.KBASE_DATA_WORKSPACE,
                                      ws_service_obj=ws_service)

            print "logged in to KBASE data workspace"

            # KBase is picky with identifier names, no colons, e.g.
            username = request.user.username
            timestamp = str(time.time())
            if use_ensemble:
                input_ws_name = 'cm_ensemble-%s-%s' % (username, timestamp)
            else:
                input_ws_name = 'cm_single-%s-%s' % (username, timestamp)

            input_ws_info = kbase.create_workspace(ws_service, input_ws_name)
            print "created input workspace under: ", input_ws_info
            input_ws = kbase.workspace(settings.KBASE_WS_SERVICE_URL,
                                       input_ws_name,
                                       ws_service_obj=ws_service)
            print "logged in to KBASE input workspace"

            if stringfile is not None:
                print "uploading STRING network..."
                string_file_path = write_uploadfile(stringfile)
                string_obj_name = 'string-%s-%s' % (organism, timestamp)
                kbase.import_string_network(input_ws, string_obj_name,
                                            string_file_path)
                print "uploaded STRING network"

            if operonfile is not None:
                print "uploading operome..."
                operon_file_path = write_uploadfile(operonfile)
                operon_obj_name = 'operon-%s-%s' % (organism, timestamp)
                kbase.import_mo_operome_file(input_ws, operon_obj_name,
                                             operon_file_path)
                print "uploaded operome"
            try:
                if use_ensemble:
                    start_cm_ensemble(request, data_ws, input_ws, organism, timestamp,
                                      ratiofile, string_obj_name, operon_obj_name)
                else:
                    start_cm_single(request, data_ws, input_ws, organism, timestamp,
                                    ratiofile, string_obj_name, operon_obj_name)
                result = {"status": "ok", "message": "YIPPIEH !"}
            except:
                traceback.print_exc()
                result = {"status": "error", "message": {'connect': 'service not available'}}
        else:
            print "not valid !!", form.errors.keys()
            for key, message in form.errors.items():
                print "%s: [%s]" % (key, message)
            result = {"status": "error", "message": form.errors}
        return HttpResponse(json.dumps(result), content_type='application/json')
    else:
        raise Exception('BOOOOO')


def start_cm_ensemble(request, data_ws, input_ws, organism, timestamp,
                      ratiofile, string_obj_name, operon_obj_name):
    print "splitting ratios"
    ratio_file_path = write_uploadfile(ratiofile)
    matrix_factory = dm.DataMatrixFactory([dm.nochange_filter,
                                           dm.center_scale_filter])
    infile = util.read_dfile(ratio_file_path, has_header=True, quote='\"')
    matrix = matrix_factory.create_from(infile)
    #split_matrix(matrix, outdir, n, kmin, matrix.num_columns)

def start_cm_single(request, data_ws, input_ws, organism, timestamp,
                    ratiofile, string_obj_name, operon_obj_name):
    print "uploading ratios..."
    data_ws_name = data_ws.name()
    input_ws_name = input_ws.name()

    genome_name = '%s.genome' % organism
    ratios_name = 'ratios-%s-%s' % (organism, timestamp)
    ratio_file_path = write_uploadfile(ratiofile)
    kbase.import_ratios_matrix(input_ws, data_ws, ratios_name, genome_name,
                               ratio_file_path, sep='\t')

    jobid = kbase.run_cmonkey(settings.KBASE_USER, settings.KBASE_PASSWD,
                              settings.KBASE_CM_SERVICE_URL,
                              settings.KBASE_CMRESULTS_WORKSPACE,
                              '%s/%s' % (input_ws_name, ratios_name),                              
                              '%s/%s.genome' % (data_ws, organism),
                              '%s/%s' % (input_ws_name, string_obj_name),
                              '%s/%s' % (input_ws_name, operon_obj_name))
    print "started job with id: ", jobid
    species = Species.objects.filter(short_name=organism)
    job = InferenceJob()
    job.user = request.user
    job.species = species[0]
    job.tmpfile = ratio_file_path
    job.status = 1
    job.compute_on = 'kbase'
    job.ec2ip = None
    job.use_ensemble = False
    job.cm_job_id = jobid
    job.save()

    print "saved expression"

"""This is the EC2 view. For cost reasons, currently not exposed"""
"""

def configjob(request):
    user = request.user  # we retrieve the user here
    if request.method == 'POST':
        form = UploadConfigForm(request.POST, request.FILES)
        if form.is_valid():
            orgcode = form.cleaned_data['organism']
            print "organism: ", orgcode
            print "file: ", form.cleaned_data['file']
            f = request.FILES['file']
            write_uploadfile(f)

            starter = startboto.EC2Starter()
            job = InferenceJob()
            job.orgcode = orgcode
            job.ec2ip = starter.instance().ip_address
            job.tmpfile = filename
            job.status = 1
            job.compute_on = 'ec2'

            ssh = startboto.SSHHelper(starter.instance().ip_address)
            remote_ratios = ssh.upload_ratios(tmppath)
            ssh.start_cmonkey(orgcode, remote_ratios)

            job.save()
            return HttpResponseRedirect('/')
        else:
            
            print "form is not valid"
    else:
        form = UploadConfigForm()
    return render_to_response('configjob.html', locals(),
                              context_instance=RequestContext(request))
"""
