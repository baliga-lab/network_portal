from django import template
from django.utils.safestring import mark_safe
from django.conf import settings

register = template.Library()

######################################################################
#### Link tags
######################################################################

@register.filter
def searchgene_link(gene):
    """search result list: make link to gene view"""
    return mark_safe("<a href=\"/%s/gene/%s\">%s</a>" % (gene.species, gene.name, gene.name))

@register.filter
def searchgene_regulation_link(gene):
    """search result list: make link to regulation view of a gene"""
    return mark_safe("<a href=\"/%s/gene/%s?view=regulation\">%d influences</a>" % (gene.species, gene.name, gene.num_influences))

@register.filter
def searchgene_regulates_link(gene):
    return mark_safe("<a href=\"/%s/gene/%s?view=regulation#regulates\">regulates %d</a>" % (gene.species, gene.name, len(gene.regulated_biclusters)))

@register.filter
def search_result_map(species_genes, species_names):
    result = '<ul>'
    for species, genes in species_genes.items():
        result += ("<li><a href=\"#species_%s\">%d results</a> for '%s'</li>" % (species, len(genes), species_names[species]))
    return mark_safe(result + '</ul>')


def make_bicluster_link(species, k):
    """reusable version of making a link to a bicluster"""
    return "<a href=\"/%s/network/%d/module/%d\">%d</a>" % (
        species, 1, k, k)  # TODO: currently network num always 1

@register.filter
def searchgene_bicluster_links(gene):
    return mark_safe(", ".join([make_bicluster_link(gene.species, k)
                                for k in gene.biclusters]))

@register.filter
def searchmodule_link(species, k):
    return mark_safe(make_bicluster_link(species, k))
