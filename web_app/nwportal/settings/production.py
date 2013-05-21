# Production env settings
from .base import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'network_portal',
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
    }
}

#STATIC_ROOT = ''
#STATICFILES_DIRS = (
#)
#TEMPLATE_DIRS = (
#)
