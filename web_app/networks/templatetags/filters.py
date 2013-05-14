from django import template
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter
def id(value):
    try:
        return [o.id for o in value]
    except:
        return value

def make_bicluster_link(bicl):
    """reusable version of making a link to a bicluster"""
    network = bicl.network
    species = network.species.short_name
    return "<a href=\"/%s/network/%d/module/%d\">%d</a>" % (
        species, network.id, bicl.id, bicl.k)

@register.filter
def bicluster_link(bicl):
    return mark_safe(make_bicluster_link(bicl))

@register.filter
def bicluster_links(biclusters):
    return mark_safe(", ".join([make_bicluster_link(b) for b in biclusters]))

@register.filter
def tf_link(tf, network):
    return mark_safe("<a href=\"/network/%d/regulated_by/%s\">%s</a>" % (
            network.id, tf.name, tf.display_name()))


@register.filter
def lookup(dict, key):
    if key in dict:
        return dict[key]
    return ''

@register.filter
def search_result_map(species_genes, species_names):
    result = '<ul>'
    for species_id, genes in species_genes.items():
        result += ("<li><a href=\"#species_%d\">%d results</a> for '%s'</li>" % (species_id, len(genes), species_names[species_id]))
    return mark_safe(result + '</ul>')

@register.filter
def format_influence(influence):
    if influence.type == 'tf':
        result = '<a class="reggene" href="/%s/gene/%s">%s</a>' % (influence.gene.species.short_name, influence.name, influence.name)
    elif influence.type == 'combiner':
        result = "<br>".join([ format_influence(part) for part in influence.get_parts()])
    else:
        result = influence.name
    return mark_safe(result)

@register.filter
def influences_to_gene_description_map(influence_biclusters):
    gene_description_map = {}
    for bicluster_id, influence in influence_biclusters:
        # print "bicluster_id=%d, influence=%s" % (bicluster_id, str(influence),)
        if influence.type == 'tf':
            gene_description_map[influence.gene.name] = influence.gene.description
        elif influence.type == 'combiner':
            parts = influence.get_parts()
            # note that parts might not be a gene - could be environmental factor
            for part in parts:
                # print "part=%s" % (str(part),)
                if part.gene:
                    gene_description_map[part.name] = part.gene.description.strip()
    result = 'var descriptionMap = {}\n';
    for key, description in gene_description_map.items():
        result += 'descriptionMap[\'' + key + '\'] = "' + description + '";\n';
    #print "# descriptions: ", len(gene_description_map)
    return mark_safe(result);

@register.filter
def motif1consensus(bicluster):
    motifs = [m for m in bicluster.motif_set.all()]
    return mark_safe("<b>%s</b><br>evalue: %f" % (motifs[0].consensus(), motifs[0].e_value)) if len(motifs) > 0 else ""

@register.filter
def motif2consensus(bicluster):
    motifs = [m for m in bicluster.motif_set.all()]
    return mark_safe("<b>%s</b><br>evalue: %f" % (motifs[1].consensus(), motifs[1].e_value)) if len(motifs) > 1 else ""

MAX_BFNAMES = 5

@register.filter
def biclusterfuncs(bicluster):
    """render the function names for the given bicluster"""
    functions = bicluster.functions.all()
    names = [f.name for f in functions]
    if len(names) > MAX_BFNAMES:
        names = names[:MAX_BFNAMES]
        names.append("...")
    return mark_safe(", ".join(names))
