from django.db import models

class InferenceJob(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    orgcode = models.CharField(max_length=10)
    ec2ip = models.CharField(max_length=30)
    tmpfile = models.CharField(max_length=200)
    status = models.IntegerField()
