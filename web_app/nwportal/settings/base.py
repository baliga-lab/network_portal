# Django settings for network_portal project.
from os.path import join, abspath, dirname

here = lambda *x: join(abspath(dirname(__file__)), *x)
PROJECT_ROOT = here('..', '..')
root = lambda *x: join(abspath(PROJECT_ROOT), *x)

DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

SESSION_SERIALIZER = 'django.contrib.sessions.serializers.PickleSerializer'

MANAGERS = ADMINS
SOLR_SELECT_GENES = 'http://localhost:8983/solr/nwportal/select/'
SOLR_SELECT_MODULES = 'http://localhost:8983/solr/nwportal_adv/select/'
SOLR_SUGGEST = "http://localhost:8983/solr/nwportal/suggest/?wt=json&json.wrf=?"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'network_portal',        # Or path to database file if using sqlite3.
        'USER': 'dj_ango',               # Not used with sqlite3.
        'PASSWORD': 'django',            # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for local. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Vancouver'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = ''

# Absolute path to the directory user data such as uploaded files and state files
# are stored. The directory has the format of [organism name]/[data type]/[userid]/[filename]
# Example: "/home/userdata/gsu/Cytoscape Network/1/gsu_network.cys"
USERDATA_ROOT = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# URL prefix for admin static files -- CSS, JavaScript and images.
# Make sure to use a trailing slash.
# Examples: "http://foo.com/static/admin/", "/static/admin/".
ADMIN_MEDIA_PREFIX = '/static/admin/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    root('static'),
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = '=7(i1co&)-+=(3r(k5_)a3i27m%@d&j4t+p)es%$kf(qrlhh!l'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware'
)

ROOT_URLCONF = 'nwportal.urls'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    root('templates'),
    root('networks/templates'),
)

# kmf: adding context processors
TEMPLATE_CONTEXT_PROCESSORS = (
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.request',
    'django.core.context_processors.static',
    'django.core.context_processors.debug',
    'django.contrib.messages.context_processors.messages',
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django_openid_auth',
    #'social_auth',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    # Uncomment the next line to enable the admin:
    'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
    'networks',
    'inference',
    'nwpadmin',
    'search'
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

AUTHENTICATION_BACKENDS = (
            'django_openid_auth.auth.OpenIDBackend',
            #'social_auth.backends.contrib.github.GithubBackend',
            'django.contrib.auth.backends.ModelBackend',
        )

OPENID_CREATE_USERS = True
LOGIN_URL = '/openid/login/'
LOGIN_REDIRECT_URL = '/'
OPENID_SSO_SERVER_URL = 'https://www.google.com/accounts/o8/id'

# KBase settings
KBASE_USER = 'nwportal'
KBASE_PASSWD = '<3P[[Dg)KR5GhL<'
KBASE_DATA_WORKSPACE = 'nwportal:nwportal_data'
KBASE_CMRESULTS_WORKSPACE = 'nwportal:cmtestresults'

# KBase Service URLs
KBASE_WS_SERVICE_URL = 'https://kbase.us/services/ws'
KBASE_CM_SERVICE_URL = 'http://140.221.67.196:7112'
KBASE_INF_SERVICE_URL = 'http://140.221.67.196:7113'
KBASE_UJS_SERVICE_URL = 'https://kbase.us/services/userandjobstate'

# Synonym service
ORGANISM_SERVICE_HOST = 'http://condor:5000'

# RabbitMQ
CMONKEY_RABBITMQ = {
    'host': 'localhost',
    'queue': 'cmonkey-queue',
    'exchange': 'cmonkey-exchange',
    'user': 'cmonkey',
    'password': 'cmonkey',
    'vhost': 'cmonkey',
    'routing_key': 'cmonkey',
    'consumer_tag': 'cmonkey-consumer'
}
