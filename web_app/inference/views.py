import traceback
from urllib2 import URLError

import gzip
import json
import sqlite3
import tempfile

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponse, HttpResponseRedirect
from django.conf import settings
from django.contrib import messages
from django import forms

from .forms import UploadConfigForm
from .models import InferenceJob
from networks.models import Species

from kbcmonkey import kbase
import kbcmonkey.UserAndJobStateClient as ujs

import uuid
import startboto


class UploadRunResultForm(forms.Form):
    ratios = forms.FileField()
    result = forms.FileField()


def write_upload_file(filename, f):
    tmppath = '/tmp/%s' % filename
    with open(tmppath, 'wb+') as outfile:
        for chunk in f.chunks():
            outfile.write(chunk)
    
def configjob(request):
    user = request.user  # we retrieve the user here
    if request.method == 'POST':
        form = UploadConfigForm(request.POST, request.FILES)
        if form.is_valid():
            orgcode = form.cleaned_data['organism']
            print "organism: ", orgcode
            print "file: ", form.cleaned_data['file']
            f = request.FILES['file']
            filename = str(uuid.uuid1())
            write_upload_file(filename, f)

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


def kbasejob(request):
    if request.method == 'POST':
        form = UploadConfigForm(request.POST, request.FILES)
        if form.is_valid():
            orgcode = form.cleaned_data['organism']
            species = Species.objects.filter(short_name=orgcode)

            f = request.FILES['file']
            filename = str(uuid.uuid1())
            write_upload_file(filename, f)

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
                job.kbase_cm_job_id = jobid
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
    def __init__(self, species, created_at, status, compute_on):
        self.species = species
        self.created_at = created_at
        self.status = status
        self.compute_on = compute_on


def job_repr(ujs_client, job):
    if job.kbase_cm_job_id is not None:
        status_obj = ujs_client.get_job_status(job.kbase_cm_job_id)
        if status_obj[1] == 'started':
            status = "%s (%s)" % (status_obj[1], status_obj[2])
        elif status_obj[1] == 'complete':
            results = ujs_client.get_results(job.kbase_cm_job_id)['workspaceids']
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
            status = status_obj[1]
    else:
        status = "N/A"
    return JobRepr(job.species.name, job.created_at, status, job.compute_on)
    
def userdata(request):
    ujs_client = ujs.UserAndJobState(url=settings.KBASE_UJS_SERVICE_URL,
                                     user_id=settings.KBASE_USER,
                                     password=settings.KBASE_PASSWD)
    #jobs = InferenceJob.objects.filter(user=request.user)
    #jobs = [job_repr(ujs_client, job) for job in jobs]
    jobs = []  # TODO: above is very slow

    cmform = UploadRunResultForm()
    return render_to_response('userdata.html', locals(),
                              context_instance=RequestContext(request))


def write_uploadfile(upload_file):
    filename = ''
    with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
        filename = tmpfile.name
        for chunk in upload_file.chunks():
            tmpfile.write(chunk)
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
    if request.method == 'POST':
        form = UploadRunResultForm(request.POST, request.FILES)
        if form.is_valid():
            ratiofile = request.FILES['ratios']
            resultfile = request.FILES['result']            
            process_ratiofile(ratiofile)
            process_resultfile(resultfile)
            result = {"status": "ok", "message": "YIPPIEH !"}
        else:
            result = {"status": "error", "message": "please specify all files"}
        return HttpResponse(json.dumps(result), content_type='application/json')
    else:
        raise Exception('BOOOOO')
