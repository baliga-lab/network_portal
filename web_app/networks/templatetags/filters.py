from django import template
from django.utils.safestring import mark_safe
from django.conf import settings

register = template.Library()

######################################################################
#### Link tags
######################################################################

def make_bicluster_link(bicl):
    """reusable version of making a link to a bicluster"""
    network = bicl.network
    species = network.species.short_name
    return "<a href=\"/%s/network/%d/module/%d\">%d</a>" % (
        species, 1, bicl.k, bicl.k)  # TODO: currently network num always 1


@register.filter
def bicluster_link(bicl):
    return mark_safe(make_bicluster_link(bicl))


@register.filter
def bicluster_links(biclusters):
    return mark_safe(", ".join([make_bicluster_link(b) for b in biclusters]))


@register.filter
def gene_link(gene):
    """gene list: make link to gene view"""
    return mark_safe("<a href=\"/%s/gene/%s\">%s</a>" % (gene.species.short_name, gene.name, gene.name))


@register.filter
def gene_gaggle_link(gene):
    return mark_safe("<a href=\"/%s/gene/%s\"><span class=\"gaggle-gene-names\">%s</span></a>" % (gene.species.short_name, gene.name, gene.name))


@register.filter
def gene_ncbi_link(gene):
    """gene list: make link to NCBI for gene"""
    if gene.geneid:
        return mark_safe("<a href=\"http://www.ncbi.nlm.nih.gov/gene/%s\">%s</a>" % (gene.geneid, gene.geneid))
    else:
        return mark_safe("-")


@register.filter
def network_url(network):
    return "/%s/network/%d" % (network.species.short_name, 1)  # currently 1


@register.filter
def network_link(network):
    """make link to network view"""
    return mark_safe("<a href=\"%s\">%s</a>" % (network_url(network),
                                                network.name))

@register.filter
def pssm_json_url(motif_id):
    return mark_safe("/json/pssm?motif_id=%s" % motif_id)


@register.filter
def searchgene_link(gene):
    """search result list: make link to gene view"""
    return mark_safe("<a href=\"/%s/gene/%s\">%s</a>" % (gene.species.short_name, gene.name, gene.name))


@register.filter
def searchgene_regulation_link(gene):
    """search result list: make link to regulation view of a gene"""
    return mark_safe("<a href=\"/%s/gene/%s?view=regulation\">%d influences</a>" % (gene.species.short_name, gene.name, len(gene.influence_biclusters)))

@register.filter
def searchgene_regulates_link(gene):
    return mark_safe("<a href=\"/%s/gene/%s?view=regulation#regulates\">regulates %d</a>" % (gene.species.short_name, gene.name, len(gene.regulated_biclusters)))


@register.filter
def species_link(species):
    return mark_safe("<a href=\"/%s\">%s</a>" % (species.short_name,
                                                 species.name))

@register.filter
def species_genes_link(species):
    return mark_safe("<a href=\"/%s/genes\">%d</a>" % (species.short_name,
                                                       species.gene_set.count()))

@register.filter
def species_ncbi_link(species):
    """species list make link to NCBI for species"""
    if species.ncbi_taxonomy_id:
        return mark_safe("<a href=\"http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=%s\">%s (NCBI)</a>" % (species.ncbi_taxonomy_id, species.ncbi_taxonomy_id))
    else:
        return mark_safe("-")


@register.filter
def species_tfs_link(species):
    return mark_safe("<a href=\"/%s/genes?filter=tf\">%d</a>" % (
            species.short_name, species.transcription_factors().count()))

@register.filter
def tf_link(tf, network):
    return mark_safe("<a href=\"/network/%d/regulated_by/%s\">%s</a>" % (
            network.id, tf.name, tf.display_name()))

@register.filter
def meme_pssm_link(network):
    return mark_safe("<a href=\"/%s/network/1/meme_motifs\">Motifs 1</a>" % (
            network.species.short_name))


######################################################################
#### Utility filters
######################################################################

@register.filter
def id(value):
    try:
        return [o.id for o in value]
    except:
        return value


@register.filter
def lookup(dict, key):
    if key in dict:
        return dict[key]
    return ''


@register.filter
def search_result_map(species_genes, species_names):
    result = '<ul>'
    for species_id, genes in species_genes.items():
        result += ("<li><a href=\"#species_%s\">%d results</a> for '%s'</li>" % (species_id, len(genes), species_names[species_id]))
    return mark_safe(result + '</ul>')


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


@register.filter
def influences_to_gene_description_map(influence_biclusters):
    gene_description_map = {}
    for bicluster_id, influence in influence_biclusters:
        # print "bicluster_id=%d, influence=%s" % (bicluster_id, str(influence),)
        if influence.type == 'tf':
            gene_description_map[influence.gene.name] = influence.gene.description
        elif influence.type == 'combiner':
            # note that parts might not be a gene - could be environmental factor
            for part in influence.parts.all():
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
