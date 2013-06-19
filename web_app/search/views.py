from django.shortcuts import render_to_response
from django.conf import settings
from django.utils.html import escape

from networks.models import *
from networks.helpers import get_influence_biclusters
from .solr_search import solr_search


class SearchModule:
    def __init__(self, k, residual):
        self.k = k
        self.residual = residual
        self.genes = []
        self.motif1_evalue = "-"
        self.motif2_evalue = "-"


class SearchGene:
    def __init__(self, species, species_name, name, common_name, description):
        self.species = species
        self.species_name = species_name
        self.name = name
        self.common_name = common_name
        self.description = description

    def label(self):
        return self.common_name if self.common_name else self.name


class GeneResultEntry:
    def __init__(self,
                 species,
                 gene_name,
                 gene_description,
                 biclusters,
                 regulated_biclusters,
                 num_influences):
        self.species = species
        self.name = gene_name
        self.description = gene_description
        self.biclusters = biclusters
        self.regulated_biclusters = regulated_biclusters
        self.num_influences = num_influences


def _make_species_cond(request):
    species_code = request.GET.get('organism', 'all')
    if species_code != 'all':
        return "+species_short_name:" + species_code
    else:
        return ""


def search_modules(request):
    """builds a query string
    species_short_name:<code>
    module_residual:[<from> TO <to>]
    """
    def make_resid_cond():
        min_resid = request.GET.get('minresid', "*")
        max_resid = request.GET.get('maxresid', "*")
        min_resid = "*" if not min_resid else min_resid
        max_resid = "*" if not max_resid else max_resid
        if not (min_resid == '*' and max_resid == '*'):
            return "+module_residual:[%s TO %s]" % (min_resid, max_resid)
        else:
            return ""

    def make_attr_cond(key):
        attr = key.split('_')[0]
        value = request.GET.get(key, '').strip()
        print "attr: %s, value: %s" % (attr, value)
        if value:
            if attr == 'gene':
                return "+module_gene_name:%s" % value
            if attr == 'regulator':
                return "+module_influence_name:%s" % value
            if attr == 'function':
                return '+module_function_name:"*%s*"' % value
        return ""
    # there is only one species condition and one residual condition
    species_cond = _make_species_cond(request)
    resid_cond = make_resid_cond()
    attr_keys = [key for key in request.GET.keys()
                 if key not in ['minresid', 'maxresid', 'organism']]
    args = [make_attr_cond(key) for key in attr_keys]
    args.extend([species_cond, resid_cond])

    conds = " ".join(args).strip()
    q = "*:*" if not conds else conds
    print "q: ", q
    module_docs = solr_search(settings.SOLR_SELECT_MODULES, q, 10000)
    mresults = {}
    species_names = {}
    for doc in module_docs:
        species = doc['species_short_name']
        species_names[species] = doc['species_name']
        k = doc['module_num']

        if species not in mresults:
            mresults[species] = {}
        if k not in mresults[species]:
            mresults[species][k] = SearchModule(k, float(doc['module_residual']))
        if 'motif1_evalue' in doc:
            mresults[species][k].motif1_evalue = float(doc['motif1_evalue'])
        if 'motif1_evalue' in doc:
            mresults[species][k].motif2_evalue = float(doc['motif2_evalue'])

    return render_to_response("module_results.html", locals())

def advsearch(request):
    species = Species.objects.all()
    return render_to_response('adv_search.html', locals())


def search_genes(request):
    species_cond = _make_species_cond(request)
    attr = request.GET['attribute']
    term = request.GET.get('term')
    print "ATTRIBUTE: %s, TERM = %s" % (attr, term)
    conds = [species_cond]
    if term:
        if attr == 'locustag':
            conds.append("+gene_common_name:%s" % term)
        elif attr == 'name':
            conds.append("+gene_name:%s" % term)
        elif attr == 'function':
            conds.append("+gene_function_name:*%s*" % term)

    cond_string = " ".join(conds)

    q = "*:*" if not cond_string else cond_string
    gresults = []
    gene_docs = solr_search(settings.SOLR_SELECT_GENES, q)
    for doc in gene_docs:
        gene_id = doc['id']
        gresults.append(SearchGene(doc['species_short_name'],
                                   doc['species_name'],
                                   doc.get('gene_name'),
                                   doc.get('gene_common_name'),
                                   doc.get('gene_description', '-')))
        
    return render_to_response("gene_results.html", locals())


def search(request):
    """
    species_genes: species_short_name -> [GeneResultEntry]
    species_names: species_short_name -> [species_name]
    """
    #solr_suggest = settings.SOLR_SUGGEST

    if request.GET.has_key('q'):
        try:
            q = request.GET['q']
            docs = solr_search(settings.SOLR_SELECT_GENES, q)
            species_genes = {}
            species_names = {}
            for doc in docs:
                species_short_name = doc['species_short_name']
                species_names[species_short_name] = doc['species_name']
                if not species_genes.has_key(species_short_name):
                    species_genes[species_short_name] = []

                genes = species_genes[species_short_name]
                genes.append(GeneResultEntry(
                        species_short_name,
                        doc['gene_name'],
                        doc.get('gene_description'),
                        doc.get('gene_bicluster', []),
                        doc.get('gene_regulated_bicluster', []),
                        doc.get('gene_influence_count', 0)))
                
                
        except Exception as e:
            error_message = str(e)
    return render_to_response('search.html', locals())
