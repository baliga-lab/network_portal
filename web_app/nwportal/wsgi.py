import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nwportal.settings.production")
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
