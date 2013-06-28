from django import template
from django.utils.safestring import mark_safe
register = template.Library()

@register.filter
def format_decimal(d):
    return "%0.2f" % d


@register.filter
def format_scientific(d):
    return "%.2e" % d

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
