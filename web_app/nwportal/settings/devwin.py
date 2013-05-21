# Windows Development settings
from .base import *

STATICFILES_DIRS = (
    "c:/GITHUB/baligalab/network_portal/web_app/static",
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(os.path.dirname(__file__), 'static').replace('\\','/'),
    # os.path.join(os.path.dirname(__file__), '../public').replace('\\','/'),
)
