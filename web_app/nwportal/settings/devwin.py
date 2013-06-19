# Windows Development settings
from .base import *

STATICFILES_DIRS = (
    "c:/GITHUB/baligalab/network_portal/web_app/static",
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    root('static'),
)


STATIC_ROOT = '/github/baligalab/network_portal/web_app/static'
USERDATA_ROOT = '/github/baligalab/network_portal/web_app/nwportaluserdata'