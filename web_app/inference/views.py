import traceback
from urllib2 import URLError

import gzip
import json
import sqlite3
import tempfile
import time
import datetime

#import pika

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponse, HttpResponseRedirect
from django.conf import settings
from django.contrib import messages
from django import forms

from .forms import UploadConfigForm, UploadRunResultForm, KBaseCmonkeyForm
from .models import InferenceJob
from networks.models import Species, Network

from kbcmonkey import kbase
import kbcmonkey.UserAndJobStateClient as ujs

import uuid

"""
def setup_channel(exchange, user, password, vhost, host='localhost'):
    credentials = pika.PlainCredentials(user, password)
    conn_params = pika.ConnectionParameters(host=host,
                                            credentials=credentials,
                                            virtual_host=vhost)
    conn_broker = pika.BlockingConnection(conn_params)
    channel = conn_broker.channel()
    channel.exchange_declare(exchange=exchange,
                             type='direct',
                             passive=False,
                             durable=False,
                             auto_delete=True)
    return channel
"""

class JobRepr:
    def __init__(self, species, created_at, status, compute_on, use_ensemble):
        self.species = species
        self.created_at = created_at
        self.status = status
        self.compute_on = compute_on
        self.use_ensemble = 'yes' if use_ensemble else 'no'

def handle_inf_job(ujs_client, job):
    status_obj = ujs_client.get_job_status(job.inf_job_id)
    print "Inferelator status", status_obj
    if status_obj[1] == 'complete':
        results = ujs_client.get_results(job.inf_job_id)['workspaceids']
        if len(results) > 0:
            result_id = results[0]
            path = result_id.split('/')
            workspace_name, result_name = path
        status = "completed, result at: workspace '%s' object '%s'" % (workspace_name,
                                                                       result_name)
    else:
        print status_obj
        status = '%s - %s' % (status_obj[1], status_obj[2])
    return status

def handle_cm_job(ujs_client, job):
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
    else:
        print status_obj
        status = '%s - %s' % (status_obj[1], status_obj[2])
    return status

def job_repr(ujs_client, job):
    if job.inf_job_id is not None:
        status = handle_inf_job(ujs_client, job)
    elif job.cm_job_id is not None:
        status = handle_cm_job(ujs_client, job)
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

    networks = Network.objects.filter(user=request.user)

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

"""
def prepare_kbase_cm_runs(nwp_jobid, organism, username, use_ensemble, files):
    using the parameters to send to the background processing system
    msg = { 'nwp_jobid': nwp_jobid, 'use_ensemble': use_ensemble,
            'organism': organism, 'username': username }

    ratiofile = files['ratios']
    operonfile = None
    stringfile = None

    msg['ratio_file_path'] = write_uploadfile(ratiofile)
    if 'operons' in files:
        operonfile = files['operons']
        msg['operon_file_path'] = write_uploadfile(operonfile)

    if 'string_edges' in files:
        stringfile = files['string_edges']
        msg['string_file_path'] = write_uploadfile(stringfile)

    # Delegate inference jobs to messaging
    rabbit_config = settings.CMONKEY_RABBITMQ
    channel = setup_channel(rabbit_config['exchange'],
                            rabbit_config['user'], rabbit_config['password'],
                            rabbit_config['vhost'])
    channel.confirm_delivery()
    msg_props = pika.BasicProperties(content_type="application/json", delivery_mode=1)

    json_msg = json.dumps(msg)
    if channel.basic_publish(body=json_msg, exchange=rabbit_config['exchange'],
                             properties=msg_props,
                             routing_key=rabbit_config['routing_key']):
        print "message confirmed"
    channel.close()"""

"""
def start_kbase_cm(request):
    # This is the form action for uploading and importing a user cmonkey run into the system
    print "start_kbase_cm()"
    if request.method == 'POST':
        form = KBaseCmonkeyForm(request.POST, request.FILES)
        if form.is_valid():
            use_ensemble = form.cleaned_data['use_ensemble']
            organism = form.cleaned_data['organism']
            username = request.user.username
            species = Species.objects.filter(short_name=organism)

            job = InferenceJob()
            job.user = request.user
            job.species = species[0]
            job.status = 1
            job.compute_on = 'kbase'
            job.ec2ip = None
            job.use_ensemble = use_ensemble
            job.cm_job_id = None
            job.save()

            prepare_kbase_cm_runs(job.id, organism, username, use_ensemble, request.FILES)
            result = {"status": "ok", "message": "YIPPIEH !"}
        else:
            print "not valid !!", form.errors.keys()
            for key, message in form.errors.items():
                print "%s: [%s]" % (key, message)
            result = {"status": "error", "message": form.errors}
        return HttpResponse(json.dumps(result), content_type='application/json')
    else:
        raise Exception('BOOOOO')
"""


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
