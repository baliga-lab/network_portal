from django.shortcuts import render_to_response
from django.conf import settings

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
    def __init__(self, species, name, common_name, description):
        self.species = species
        self.name = name
        self.common_name = common_name
        self.description = description

    def label(self):
        return self.common_name if self.common_name else self.name


class GeneResultEntry:
    def __init__(self, gene,
                 influence_biclusters,
                 regulated_biclusters):
        self.id = gene.id
        self.name = gene.name
        self.description = gene.description
        self.species = gene.species
        self.biclusters = gene.bicluster_set.all()
        self.gene = gene
        self.influence_biclusters = influence_biclusters
        self.regulated_biclusters = regulated_biclusters

    def bicluster_ids(self):
        return [b.id for b in self.biclusters]

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
            return "module_residual:[%s TO %s]" % (min_resid, max_resid)
        else:
            return ""

    resid_cond = make_resid_cond()
    species_cond = _make_species_cond(request)
    conds = " ".join([resid_cond, species_cond]).strip()
    q = "*:*" if not conds else conds

    module_docs = solr_search(settings.SOLR_SELECT_MODULES, q, 10000)
    mresults = {}
    for doc in module_docs:
        species_name = doc['species_name']
        k = doc['module_num']

        if species_name not in mresults:
            mresults[species_name] = {}
        if k not in mresults[species_name]:
            mresults[species_name][k] = SearchModule(k, float(doc['module_residual']))
        if 'motif1_evalue' in doc:
            mresults[species_name][k].motif1_evalue = float(doc['motif1_evalue'])
        if 'motif1_evalue' in doc:
            mresults[species_name][k].motif2_evalue = float(doc['motif2_evalue'])

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
            conds.append("+gene_function_name:%s" % term)

    cond_string = " ".join(conds)

    q = "*:*" if not cond_string else cond_string
    gresults = []
    gene_docs = solr_search(settings.SOLR_SELECT_GENES, q)
    for doc in gene_docs:
        gene_id = doc['id']
        gresults.append(SearchGene(doc['species_name'],
                                   doc.get('gene_name'),
                                   doc.get('gene_common_name'),
                                   doc.get('gene_description', '-')))
        
    return render_to_response("gene_results.html", locals())


def search(request):
    #solr_suggest = settings.SOLR_SUGGEST

    if request.GET.has_key('q'):
        try:
            q = request.GET['q']
            results = solr_search(settings.SOLR_SELECT_GENES, q)
            gene_ids= []
            for result in results:
                if result['doc_type'] == 'GENE':
                    gene_ids.append(result['id'])

            gene_objs = Gene.objects.filter(pk__in=gene_ids)
            species_genes = {}
            species_names = {}
            genes = []
            for gene_obj in gene_objs:
                species_names[gene_obj.species.short_name] = gene_obj.species.name
                regulates = Bicluster.objects.filter(influences__name__contains=gene_obj.name)
                _, influence_biclusters = get_influence_biclusters(gene_obj)

                if not species_genes.has_key(gene_obj.species.short_name):
                    species_genes[gene_obj.species.short_name] = []
                genes = species_genes[gene_obj.species.short_name]

                genes.append(GeneResultEntry(gene_obj,
                                             influence_biclusters,
                                             regulates))
        except Exception as e:
            error_message = str(e)
    return render_to_response('search.html', locals())
