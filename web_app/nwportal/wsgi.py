import os
import httplib2


h = httplib2.Http(ca_certs='/local/apache-stuff/cacert.pem')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nwportal.settings.production")
os.environ['MPLCONFIGDIR'] = '/tmp'
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

"""
import sys
import django
import django.core.handlers.wsgi

path = os.path.dirname(os.path.dirname(__file__)).replace('\\','/')
if path not in sys.path:
    sys.path.append(path)
os.environ['DJANGO_SETTINGS_MODULE'] = 'web_app.settings'
application = django.core.handlers.wsgi.WSGIHandler()
"""
