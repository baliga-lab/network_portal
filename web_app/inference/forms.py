from django import forms

class UploadConfigForm(forms.Form):
    #title = forms.CharField(max_length=50)
    organism = forms.CharField(max_length=50)
    file = forms.FileField()

