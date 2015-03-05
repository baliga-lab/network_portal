#!/usr/bin/env python

import json
import psycopg2
import ConfigParser
import kbcmonkey.kbase as kbase
from django.conf import settings

import import_cmonkey as impcm


config = ConfigParser.ConfigParser()
config.read('default.ini')


def get_result_object(jobid):
    """retrieve result data from the job service"""
    jobstate = kbase.user_job_state(config.get('KBase', 'ujs_service_url'),
                                    config.get('KBase', 'user'),
                                    config.get('KBase', 'password'),
                                    jobid)
    jobstatus = jobstate.get_job_status()
    status = jobstatus[1]
    if status == 'error':
        print "Problem: ", jobstatus[2]
        return None
    elif status == 'complete':
        result_ref = jobstate.get_results()['workspaceids'][0]
        print "result at: ", result_ref
        ws_name, inst_name = result_ref.split('/')

        result_ws = kbase.workspace(config.get('KBase', 'ws_service_url'),
                                    ws_name=ws_name,
                                    user=config.get('KBase', 'user'),
                                    password=config.get('KBase', 'password'))
        return result_ws.get_object(inst_name)


def get_object(objref):
    ws_name, inst_name = objref.split('/')
    result_ws = kbase.workspace(config.get('KBase', 'ws_service_url'),
                                ws_name=ws_name,
                                user=config.get('KBase', 'user'),
                                password=config.get('KBase', 'password'))
    result = result_ws.get_object(inst_name)

    # DEBUG: list workspace objects
    #objs = result_ws.ws_service.list_workspace_objects({'workspace': ws_name})
    #for obj in objs:
    #    print obj
    # DEBUG END
    return result


def get_objects_by_ref(objrefs):
    return kbase.get_objects_by_ref(config.get('KBase', 'ws_service_url'),
                                    user=config.get('KBase', 'user'),
                                    password=config.get('KBase', 'password'),
                                    objrefs=objrefs)


def extract_motif(cmr_cluster, used_features):
    result = []
    for motif in cmr_cluster['motifs']:
        cmr_sites = motif['sites']
        cmr_hits = motif['hits']
        hits = []
        for cmr_hit in cmr_hits:
            nwp_gene_id = used_features[cmr_hit['seq_id']][0]
            hits.append((cmr_hit['hit_pvalue'],
                         cmr_hit['hit_start'],
                         cmr_hit['strand'],  # - or +
                         nwp_gene_id))

        result.append((motif['pssm_id'], motif['evalue'], motif['pssm_rows'], len(cmr_sites),
                       hits))
    return result


def insert_biclusters(dstcur, nw_id, cluster_data, used_features, kb_cond_map, condition_map):
    """Create biclusters in the database and returns a mapping
    cluster numbers -> database id
    Input:

       cluster_data: a list of tuples, (cluster, residual, row_members, col_members, motifs)
    """
    cluster_ids = []
    for cluster, residual, row_members, col_members, motifs in cluster_data:
        #print "processing bicluster %d" % cluster
        dstcur.execute("insert into networks_bicluster (network_id,k,residual) values (%s,%s,%s) returning id", [nw_id, cluster, residual])
        cluster_id = dstcur.fetchone()[0]
        cluster_ids.append(cluster_id)

        for row_member in row_members:
            gene_id = used_features[row_member][0]
            dstcur.execute("insert into networks_bicluster_genes (bicluster_id,gene_id) values (%s,%s)", [cluster_id,gene_id])

        for col_member in col_members:
            cond_id = condition_map[kb_cond_map[col_member]]
            dstcur.execute("insert into networks_bicluster_conditions (bicluster_id,condition_id) values (%s,%s)", [cluster_id,cond_id])

        for i, motif in enumerate(motifs):
            pssm_id, evalue, pssm_rows, num_sites, hits = motif
            dstcur.execute("insert into networks_motif (bicluster_id,position,sites,e_value) values (%s,%s,%s,%s) returning id", [cluster_id,i+1,num_sites,evalue])
            motif_id = dstcur.fetchone()[0]

            # annotations
            for pval, pos, strand, gene_id in hits:
                dstcur.execute('insert into networks_motifannotation (motif_id,gene_id,position,reverse,pvalue) values (%s,%s,%s,%s,%s)', [motif_id,gene_id,pos, strand == '-',pval])

            # pssms
            for row, pssm_row in enumerate(pssm_rows):
                a, c, g, t = pssm_row
                dstcur.execute('insert into pssms (motif_id,position,a,c,g,t) values (%s,%s,%s,%s,%s,%s)', [motif_id, row, a, c, g, t])

    return cluster_ids

def process_clusters(cursor, nw_id, cm_result, used_features, kb_cond_map, condition_map):
    """
    a. bicluster + residual
    b. row members
    c. column members
    """
    cluster_data = [(cluster_num + 1, cluster['residual'], cluster['gene_ids'],
                     cluster['sample_ws_ids'],
                     extract_motif(cluster, used_features))
                    for cluster_num, cluster in enumerate(cm_result['data']['network']['clusters'])]
    cluster_ids = insert_biclusters(cursor, nw_id, cluster_data, used_features,
                                    kb_cond_map, condition_map)
    return cluster_ids


def dbconn():
    return psycopg2.connect("dbname=%s user=%s password=%s" % (config.get('Database', 'name'),
                                                               config.get('Database', 'user'),
                                                               config.get('Database', 'password')))


def extract_job_info(con, nwp_jobid, cm_result):
    cursor = con.cursor()
    cursor.execute('select species_id,ratios_file,user_id from inference_inferencejob where id=%s',
                   [nwp_jobid])
    species_id, ratios_file, user_id = cursor.fetchone()
    cursor.execute('select short_name from networks_species where id=%s', [species_id])
    orgcode = cursor.fetchone()[0]
    print "organism: ", orgcode
    print "start time: ", cm_result['data']['start_time']
    finish_time = cm_result['data']['finish_time']
    print "finish time: ", finish_time
    series_ref = cm_result['data']['parameters']['series_ref']
    print "ratios file: ", ratios_file
    print "series_ref: ", series_ref
    # for consistency, take the expression from the result object
    ratios_skel = get_objects_by_ref([series_ref])[0]
    
    # We need to map KBase genome ids to Network portal gene ids
    sample_ids_map = ratios_skel['data']['genome_expression_sample_ids_map']
    conditions = sample_ids_map.values()[0]
    num_conditions = len(conditions)
    print "# conditions: ", num_conditions
    sample_refs = sample_ids_map.values()[0]

    # Extract the used conditions and genes here
    features = None
    used_features = {}
    kb_cond_map = {}

    #for samplenum in range(num_conditions):
    for ratios_sample in get_objects_by_ref(sample_refs):
        # the cond_id is used in the KBase result object, store it for later when
        # extracting the biclusters
        cond_name = ratios_sample['data']['source_id']
        kb_sample_id = ratios_sample['data']['id']

        # we need this to map column members in KBase's result format to
        # the original condition name
        kb_cond_map[kb_sample_id] = cond_name

        if features is None:
            exp_levels = ratios_sample['data']['expression_levels']
            num_genes = len(exp_levels)
            used_genes =  exp_levels.keys()
            genome_id = ratios_sample['data']['genome_id']
            genome = get_object(genome_id)
            features = genome['data']['features']

            for feature in features:
                if feature['id'] in used_genes:
                    for alias in feature['aliases']:
                        cursor.execute('select id,name from networks_gene where species_id=%s and (name=%s or common_name=%s)', (species_id, alias, alias))
                        matches = [(row[0], row[1]) for row in cursor.fetchall()]
                        if len(matches) > 0:
                            used_features[feature['id']] = matches[0]
                            break
    print "# used features: ", len(used_features)

    # Creates the network
    nw_id = impcm.insert_network(cursor, orgcode, finish_time, (num_genes, num_conditions),
                                 user_id)
    print "Created network with id: ", nw_id
    # 1. insert conditions
    condition_map = impcm.insert_conditions(cursor, nw_id, kb_cond_map.values())
    print condition_map

    # 2. create biclusters
    cluster_ids = process_clusters(cursor, nw_id, cm_result, used_features, kb_cond_map, condition_map)
    print "%d clusters created" % len(cluster_ids)

    con.commit()


def check_inf_jobs():
    con = dbconn()
    cursor = con.cursor()
    cursor.execute('select distinct id,cm_job_id,inf_job_id from inference_inferencejob where status=1 and cm_job_id is not null and inf_job_id is not null')
    for row in cursor.fetchall():
        nwp_jobid, cm_jobid, inf_jobid = row
        cm_result = get_result_object(cm_jobid)
        #inf_result = get_result_object(inf_jobid)
        extract_job_info(con, nwp_jobid, cm_result)
        """
        with open('cm_result.json', 'w') as outfile:
            outfile.write(json.dumps(cm_result))
        if inf_result is not None:
            with open('inf_result.json', 'w') as outfile:
                outfile.write(json.dumps(inf_result))
        """
    cursor.close()
    con.close()


def print_workspaces():
    """just for informational purposes, lists the user's workspaces"""
    wss = kbase.workspaces_for(config.get('KBase', 'ws_service_url'),
                               config.get('KBase', 'user'),
                               config.get('KBase', 'password'))
    for w in wss:
        print w.name()

def upload_tfs(organism):
    """uploads a gene list as transcription factors"""
    with open('%s.txt' % organism) as infile:
        tfs = [line.strip() for line in infile]
    data_ws = kbase.workspace(config.get('KBase', 'ws_service_url'),
                              ws_name=config.get('KBase', 'data_workspace'),
                              user=config.get('KBase', 'user'),
                              password=config.get('KBase', 'password'))    
    print "saving tfs..."
    kbase.save_gene_list(data_ws, '%s.tfs' % organism,
                         'nwportal:nwportal_data/%s.genome' % organism,
                         tfs)
    print "saved"

if __name__ == '__main__':
    #print_workspaces()
    check_inf_jobs()
