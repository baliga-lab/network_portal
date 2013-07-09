from django import template
from django.utils.safestring import mark_safe
register = template.Library()

@register.filter
def format_decimal(d):
    try:
        return "%0.2f" % float(d)
    except:
        return "-"


@register.filter
def format_scientific(d):
    try:
        return "%.2e" % float(d)
    except:
        return "-"

@register.filter
def format_influence(influence):
    if influence.type == 'tf':
        result = '<a class="reggene" href="/%s/gene/%s">%s</a>' % (influence.gene.species.short_name, influence.name, influence.name)
    elif influence.type == 'combiner':
        result = "<br>".join([format_influence(part)
                              for part in influence.parts.all()])
    else:
        result = influence.name
    return mark_safe(result)
