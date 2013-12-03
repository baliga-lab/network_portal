from django import template
from django.utils.safestring import mark_safe
from django.conf import settings
import re

register = template.Library()
COND_X_PATTERN = re.compile('X(\d+)[.](\d+)')
LOG_RATIO_PATTERN = re.compile('Log_Ratio_(\d+)[_](\d+)')

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
def condition_link(cond):
    def make_link(match):
        exp_id = int(match.group(1))  # set number is group(2)
        url = "http://www.microbesonline.org/cgi-bin/microarray/viewExp.cgi?expId=%d" % exp_id
        return mark_safe("<a href=\"%s\">%s</a>" % (url, cond))

    """turns a condition name into a Microbes Online link if possible"""
    match = COND_X_PATTERN.match(cond)
    if match:
        return make_link(match)
    match = LOG_RATIO_PATTERN.match(cond)
    if match:
        return make_link(match)
    
    return cond


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
def species_link(species):
    return mark_safe("<a href=\"/%s\">%s</a>" % (species.short_name,
                                                 species.name))

@register.filter
def species_genes_link(species):
    return mark_safe("<a href=\"/%s/genes\">%d</a>" % (species.short_name,
                                                       species.gene_set.count()))

@register.filter
def species_modfunction_download_link(species):
    return mark_safe("<a href=\"/%s/modfunctions/export\">Tab-delimited</a>" %
                     species.short_name)

@register.filter
def species_modgene_download_link(species):
    return mark_safe("<a href=\"/%s/modgenes/export\">Tab-delimited</a>" %
                     species.short_name)

@register.filter
def species_genefunction_download_link(species):
    return mark_safe("<a href=\"/%s/genefunctions/export\">Tab-delimited</a>" %
                     species.short_name)

@register.filter
def species_string_link(species):
    return mark_safe("<a href=\"http://networks.systemsbiology.net/string9/%s.gz\">%s</a>" % (species.ncbi_taxonomy_id, species.ncbi_taxonomy_id))

@register.filter
def species_ratios_link(species):
    return mark_safe("<a href=\"http://networks.systemsbiology.net/static/data-files/expression/%s-ratios.tsv\">%s-ratios.tsv</a>" % (species.short_name, species.short_name))

@register.filter
def species_mo_link(species):
    if species.ncbi_taxonomy_id:
        return mark_safe("<a href=\"http://www.microbesonline.org/cgi-bin/microarray/viewExp.cgi?taxes=_%d&expOption=3&submit=Browse\">%s (Microbes Online)</a>" % (species.ncbi_taxonomy_id, species.name))
    else:
        return mark_safe("-")

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
    return mark_safe("<b>%s</b><br>evalue: %.2e" % (motifs[0].consensus(), motifs[0].e_value)) if len(motifs) > 0 else ""


@register.filter
def motif2consensus(bicluster):
    motifs = [m for m in bicluster.motif_set.all()]
    return mark_safe("<b>%s</b><br>evalue: %.2e" % (motifs[1].consensus(), motifs[1].e_value)) if len(motifs) > 1 else ""


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
