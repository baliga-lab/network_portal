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


def dbconn():
    return psycopg2.connect("dbname=%s user=%s password=%s" % (config.get('Database', 'name'),
                                                               config.get('Database', 'user'),
                                                               config.get('Database', 'password')))


def extract_job_info(con, nwp_jobid, cm_result):
    cursor = con.cursor()
    cursor.execute('select species_id,ratios_file from inference_inferencejob where id=%s',
                   [nwp_jobid])
    species_id, ratios_file = cursor.fetchone()
    cursor.execute('select short_name from networks_species where id=%s', [species_id])
    orgcode = cursor.fetchone()[0]
    print "organism: ", orgcode
    print "start time: ", cm_result['data']['start_time']
    print "finish time: ", cm_result['data']['finish_time']
    print "ratios: ", ratios_file
    ratios_skel = get_object(ratios_file)
    
    # TODO
    # We need to map KBase genome ids to Network portal gene ids
    sample_ids_map = ratios_skel['data']['genome_expression_sample_ids_map']
    conditions = sample_ids_map.values()[0]
    num_conditions = len(conditions)
    print "# conditions: ", num_conditions
    ratios_sample1 = get_object(ratios_file + '-1')
    exp_levels = ratios_sample1['data']['expression_levels']
    num_genes = len(exp_levels)
    print "# genes: ", num_genes

    """
    genome_id = ratios_sample1['data']['genome_id']
    genome = get_object(genome_id)
    features = genome['data']['features']
    for feature in features:
        if 'aliases' in feature:
            print feature['id'] + str(feature['aliases'])
        else:
            print feature['id'] + ' (no aliases)'
    #with open('hal_genome.json', 'w') as outfile:
    #    outfile.write(json.dumps(genome))
    """
    nw_id = impcm.insert_network(cursor, orgcode, finish_time, (num_genes, num_conditions))


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