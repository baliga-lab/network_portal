from django.db import connection
import networkx as nx
import models

# maybe this should be a static method of synomym?

def synonym(obj=None, synonym_type=None):
    """
    Return a single synonym for an object of the specified type. The object may be any
    other entity, for example gene, species or chromosome.
    Returns a string or None if no such synonym exists.
    """
    if object:
        target_id = obj.id
        target_type = type(obj).__name__.lower()
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("select name from networks_synonym where target_type=%s and target_id=%s and type=%s", (target_type,target_id,synonym_type,))
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        if cursor: cursor.close()

def nice_string(obj):
    if obj is None:
        return ""
    return str(obj)

def get_influence_biclusters(gene):
    # get all biclusters that the gene is a member of
    member_biclusters = gene.bicluster_set.all()
    
    # get regulatory influences for this gene
    influence_biclusters = []
    for bicluster in member_biclusters:
        for influence in bicluster.influences.all():
            influence_biclusters.append((bicluster, influence))
    return member_biclusters, sorted(influence_biclusters, key=lambda bi: (bi[0], bi[1].name))

def get_nx_graph_for_biclusters(biclusters, expand=False):
    def gene_popup_url(gene):
        return '/gene_popup/%d' % (gene.id, )

    def influence_popup_url(influence):
        if influence.is_combiner():
            return '/regulator_popup/%d' % (influence.id, )
        elif not influence.type == 'ef':
            return gene_popup_url(models.find_gene_by_name(influence.name))
        else:
            return ""  # environmental factor -> not a gene, no mapping

    def motif_popup_url(motif):
        return '/motif_popup/%d' % (motif.id, )

    def bicluster_popup_url(bicluster):
        return '/bicluster_popup/%d' % (bicluster.id, )

    graph = nx.Graph()

    # compile sets of genes and influences from all requested biclusters
    genes = set()
    influences = set()
    for b in biclusters:
        genes.update(b.genes.all())
        influences.update(b.influences.all())

    # build networkx graph
    for gene in genes:
        graph.add_node(gene,
                       {'type':'gene',
                        'name':gene.display_name(),
                        'url': gene_popup_url(gene)
                        })
    for influence in influences:
        graph.add_node("inf:%d" % (influence.id,),
                       {'type':'regulator',
                        'name':influence.name,
                        'url': influence_popup_url(influence)
                        })
        
        # on request, we can add links for combiners (AND gates) to
        # the influences they're combining. This makes a mess of larger
        # networks, but works OK in very small networks (1-3 biclusters)
        if expand and influence.is_combiner():
            for part in influence.parts:
                if part not in influences:
                    graph.add_node("inf:%d" % (part.id,),
                                   {'type':'regulator',
                                    'name':part.name,
                                    'url': influence_popup_url(part),
                                    'expanded':True})
                graph.add_edge("inf:%d" % (influence.id,), "inf:%d" % (part.id,), {'expanded':True})
        
    for bicluster in biclusters:
        graph.add_node("bicluster:%d" %(bicluster.id,),
                       {'type':'bicluster',
                        'name':str(bicluster),
                        'url': bicluster_popup_url(bicluster)
                        })

        for gene in bicluster.genes.all():
            graph.add_edge("bicluster:%d" %(bicluster.id,), gene)
        for inf in bicluster.influences.all():
            graph.add_edge("bicluster:%d" %(bicluster.id,), "inf:%d" % (inf.id,))

        for motif in bicluster.motif_set.all():
            graph.add_node("motif:%d" % (motif.id,),
                           {'type':'motif',
                            'consensus':motif.consensus(),
                            'e_value':motif.e_value,
                            'name':"motif:%d" % (motif.id,),
                            'url': motif_popup_url(motif)
                            })
            graph.add_edge("bicluster:%d" %(bicluster.id,), "motif:%d" % (motif.id,))
    
    return graph
