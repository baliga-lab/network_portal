import os
import pandas

import WorkspaceClient as wsc
import CmonkeyClient as cmc
import UserAndJobStateClient as ujs
import InferelatorClient as inf

"""
KBase is a distributed platform which provides a REST API to its services.

This is an attempt to provide a Python friendly API to KBase for use with
with cmonkey and Inferelator.

It converts cmonkey standard datatypes to KBase datatypes and abstracts
calls.
"""

class UserAndJobState(object):
    def __init__(self, ujs_service, job_id):
        self.ujs_service = ujs_service
        self.job_id = job_id

    def get_job_description(self):
        return self.ujs_service.get_job_description(self.job_id)

    def get_job_status(self):
        return self.ujs_service.get_job_status(self.job_id)

    def get_detailed_error(self):
        return self.ujs_service.get_detailed_error(self.job_id)


class WorkspaceInstance(object):
    """representation of a KBase workspace instance"""

    def __init__(self, ws_service, ws_meta):
        self.ws_service = ws_service
        self.ws_meta = ws_meta

    def id(self):
        return self.ws_meta[6]

    def name(self):
        return self.ws_meta[0]

    def __repr__(self):
        return "{Workspace, name: %s, id: %d}" % (self.name(), self.id())

    def save_object(self, objtype, objid, data):
        """Generic way to store an object into KBase, class-specific save functions
        call this one"""
        return WorkspaceObject(self,
                               self.ws_service.save_object({'workspace': self.name(),
                                                            'type': objtype,
                                                            'id': objid,
                                                            'data': data})[11])

    def get_object(self, object_name):
        """returns the object data for the specified object"""
        return self.ws_service.get_object({'workspace': self.name(), 'id': object_name})


class WorkspaceObject(object):
    """an object that is stored in a workspace"""

    def __init__(self, ws_inst, id, version=1):
        self.ws = ws_inst
        self.id = id
        self.version = version
        self.obj = None

    def obj_ref(self):
        """Build an object reference"""
        return "%s/%s/%s" % (self.ws.id(), self.id, self.version)

    def data(self):
        """retrieves the data from the workspace service"""
        if self.obj is None:
            self.obj = ws.get_object(self.id)
        return self.obj['data']


def __workspaces(ws_service, exclude_global=True):
    no_global = 1 if exclude_global else 0
    for meta in ws_service.list_workspaces({'excludeGlobal': no_global}):
        yield WorkspaceInstance(ws_service, meta)


"""
Gene Expressions
"""

def save_expression_sample(ws, id, condition, gene_pvals, genome_id):
  """
  Saves the pvalue for each gene in an expression sample.
  gene_pvals is a dictionary that maps from gene name to pvalue

  condition -> source_id"""
  data = {'id': id,
          'source_id': condition,
          'type': 'microarray',
          'numerical_interpretation': 'undefined',
          'external_source_date': 'unknown',
          'expression_levels': gene_pvals,
          'genome_id': genome_id}

  return ws.save_object('KBaseExpression.ExpressionSample-1.2', id, data)


def save_expression_series(ws, name, source_file,
                           genome_id, samples):
    """
    Gene expressions in KBase are stored as a list of ExpressionSeries
    Parameters:
    - ws: Workspace service interface
    - workspace: workspace object
    - name: unique name the object should be stored under
    - source_file: source file
    - genome_id: the unique name of the genome this expression series is based on
    - sample_ids: a list of ExpressionSample ids, in KBase standard identifier format
    """
    sample_ids = [sample.obj_ref() for sample in samples]
    data = {'id': name, 'source_id': source_file,
            'external_source_date': 'unknown',
            'genome_expression_sample_ids_map': {genome_id: sample_ids}}
    return ws.save_object('KBaseExpression.ExpressionSeries-1.0', name, data)


def import_ratios_matrix(ws, name, genome_id, filepath, sep='\t'):
    """Reads a gene expression matrix and stores it in the specified
    workspace"""
    filename = os.path.basename(filepath)
    matrix = pandas.io.parsers.read_table(filepath, index_col=0)
    samples = []
    for i, colname in enumerate(matrix.columns):
        colvals = matrix.values[:, i]
        pvals = {rowname: colvals[j] for j, rowname in enumerate(matrix.index)}
        samples.append(save_expression_sample(ws, '%s-%d' % (name, i), colname,
                                              pvals, genome_id))
    return save_expression_series(ws, name, filename, genome_id, samples)


"""
Interaction Sets
"""
def save_interaction_set(ws, name, nwtype, edges, score_name):
    """Save an interaction set, this is for things like STRING networks and operons
    Edges are a list of triples (node1, node2, weight)
    """
    def dataset_source(id, desc, url):
        return {'id': id, 'name': id,
                'reference': 'N/A',
                'description': desc,
                'resource_url': url}

    def interaction(id, node1, node2, nwtype, weight):
        return {'id': id, 'type': nwtype,
                'entity1_id': node1, 'entity2_id': node2,
                'scores': {score_name: weight} }

    interactions = []
    for i, edge in enumerate(edges):
        n1, n2, weight = edge
        interactions.append(interaction('edge-%d' % i, n1, n2, nwtype, weight))

    data = {'id': name, 'name': name,
            'description': 'my network',
            'type': 'somenetwork',
            'source': dataset_source('%s-source' % name, 'some description', ''),
            'interactions': interactions}

    return ws.save_object('KBaseNetworks.InteractionSet-1.0', name, data)


def import_network(ws, name, nwtype, filepath, sep='\t'):
    filename = os.path.basename(filepath)
    if nwtype == 'STRING':
        score_name = 'STRING_SCORE'
    else:
        score_name = 'pval'

    with open(filename) as infile:
        edges = []
        for line in infile:
            n1, n2, w = line.strip().split(sep)
            edges.append((n1, n2, float(w)))
        return save_interaction_set(ws, name, nwtype, edges, score_name)


def import_string_network(ws, name, filepath, sep='\t'):
    """Import a STRING network from a tab separated file"""
    return import_network(ws, name, 'STRING', filepath, sep)


"""
Gene Lists
"""

def save_gene_list(ws, id, genes):
  """Saves a gene list"""
  data = {'id': id,
          'source_id': 'Microbes Online',
          'description': 'Transcription factors',
          'genes': genes}
  return ws.save_object('Inferelator.GeneList-1.0', id, data)


"""
High-level Service Access
"""

def workspaces_for(user, password, service_url):
    ws_service = wsc.Workspace(service_url, user_id=user, password=password)
    return [ws for ws in __workspaces(ws_service)]


def workspace(user, password, service_url, ws_name, search_global=False):
    ws_service = wsc.Workspace(service_url, user_id=user, password=password)
    for ws in __workspaces(ws_service, not search_global):
        if ws.name() == ws_name:
            return ws
    raise Exception("no workspace named '%s' found !" % ws_name)


def user_job_state(user, password, service_url, jobid):
    ujs_service = ujs.UserAndJobState(service_url, user_id=user, password=password)
    return UserAndJobState(ujs_service, jobid)


def run_cmonkey(user, password, service_url, target_workspace,
                series_ref, genome_ref, network_ref, operome_ref):
  cm_service = cmc.Cmonkey(service_url, user_id=user, password=password)
  return cm_service.run_cmonkey(target_workspace,
                                {'series_ref': series_ref,
                                 'genome_ref': genome_ref,
                                 'operome_ref': operome_ref,
                                 'network_ref': network_ref,
                                 'networks_scoring': 1,
                                 'motifs_scoring': 1})


class CmonkeyResult(object):
    def __init__(self, data):
        self.data = data['data']
        self.__clusters = None
    
    def num_clusters(self):
        return self.data['network']['clusters_number']

    def num_rows(self):
        return self.data['network']['rows_number']

    def num_columns(self):
        return self.data['network']['columns_number']

    def clusters(self):
        if self.__clusters is None:
            self.__clusters = []
            for i, clusterdata in enumerate(self.data['network']['clusters']):
                residual = clusterdata['residual']
                columns = clusterdata['sample_ws_ids']
                rows = clusterdata['gene_ids']
                self.__clusters.append((rows, columns, residual))
        return self.__clusters

    def __repr__(self):
        return "CmonkeyResult - %d rows, %d cols, %d clusters" % (self.num_rows(),
                                                                  self.num_columns(),
                                                                  self.num_clusters())


def run_inferelator(service_url, user, password, target_workspace,
                    tf_ref, result_ref, expression_ref):
    """abstracts the Inferelator service"""
    inf_service = inf.Inferelator(service_url, user_id=user, password=password)
    return inf_service.run_inferelator(target_workspace,
                                       {'tf_list_ws_ref': tf_ref,
                                        'cmonkey_run_result_ws_ref': result_ref,
                                        'expression_series_ws_ref': expression_ref})
