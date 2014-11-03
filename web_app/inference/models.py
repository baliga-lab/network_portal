from django.db import models
from django.conf import settings
from networks.models import Species, Network

AUTH_USER_MODEL = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')

class InferenceJob(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(AUTH_USER_MODEL)
    species = models.ForeignKey(Species)
    network = models.ForeignKey(Network, null=True)

    #orgcode = models.CharField(max_length=10)
    tmpfile = models.CharField(max_length=200)

    # 1 = ready
    status = models.IntegerField()

    # ec2, kbase or priv_cluster
    compute_on = models.CharField(max_length=30)

    # EC2 specific
    ec2ip = models.CharField(max_length=30, null=True)

    # KBase specific
    kbase_cm_job_id = models.CharField(max_length=100, null=True)
    kbase_inf_job_id = models.CharField(max_length=100, null=True)
