from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponse, HttpResponseRedirect
from .forms import UploadConfigForm
from .models import InferenceJob
import uuid
import startboto

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
            tmppath = '/tmp/%s' % filename
            with open(tmppath, 'wb+') as outfile:
                for chunk in f.chunks():
                    outfile.write(chunk)
            starter = startboto.EC2Starter()

            job = InferenceJob()
            job.orgcode = orgcode
            job.ec2ip = starter.instance().ip_address
            job.tmpfile = filename
            job.status = 1

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
