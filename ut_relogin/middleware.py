from datetime import datetime

from django.conf import settings
from django.core.urlresolvers import reverse

try:
    from django.utils.deprecation import MiddlewareMixin
    middleware_parent_class = MiddlewareMixin
except ImportError:
    middleware_parent_class = object

# module-level timestamp for cache-busting
_TIMESTAMP = datetime.now().strftime('%Y%m%d%H%M')

TAGS_TEMPLATE = """
<head>
    <script type="text/javascript"
        src="{static_url}ut_relogin/jquery-1.11.1.min.js{cache_bust}"></script>
    <script type="text/javascript"
        src="{static_url}ut_relogin/jquery.utRelogin.js{cache_bust}"></script>
    <script type="text/javascript">
        var $jqUtRelogin = jQuery.noConflict(true);
        $jqUtRelogin.utRelogin({{
            'popupUrl': '{popup_url}',
            'formProtectUrl': '{form_url}',
        }});
    </script>
"""


class UtReloginHeadTagMiddleware(middleware_parent_class):
    tags = None

    def get_head_tag_replacement(self):
        """
        Get the string that replaces <head> tags in HTML responses. This method
        should be overridden if TAGS_TEMPLATE doesn't work for you.
        """
        return TAGS_TEMPLATE.format(
            static_url=settings.STATIC_URL,
            popup_url=reverse('ut_relogin_redirect'),
            form_url=reverse('ut_relogin_form_protection'),
            cache_bust='?version={0}'.format(_TIMESTAMP),
        )

    def process_response(self, request, response):
        """
        Insert our JavaScript after the <head> tag of HTML responses.
        """
        if 'html' in response['Content-Type'].lower():
            if self.tags is None:
                self.tags = self.get_head_tag_replacement()
            encoding = getattr(settings, 'DEFAULT_CHARSET', 'utf-8')
            content = response.content.decode(encoding).replace(
                u'<head>', self.tags, 1)
            response.content = content.encode(encoding)
        return response
