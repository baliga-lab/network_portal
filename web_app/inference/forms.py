from django import forms

class UploadConfigForm(forms.Form):
    #title = forms.CharField(max_length=50)
    organism = forms.CharField(max_length=50)
    file = forms.FileField()

class UploadRunResultForm(forms.Form):
    ratios = forms.FileField()
    result = forms.FileField()

class KBaseCmonkeyForm(forms.Form):
    ratios = forms.FileField()
    string_edges= forms.FileField(required=False)
    operons = forms.FileField(required=False)
    use_ensemble = forms.BooleanField(required=False)
    organism = forms.ChoiceField(choices=[("hal", "Halobacterium sp"),
                                          ("mtu", "Mycobacterium tuberculosis H37v"),
                                          ("psa", "Pseudomonas stutzeri"),
                                          ("eco", "Escherichia coli K12 MG1655 substr")])
