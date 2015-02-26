#!/usr/bin/env python

import json
import psycopg2
import ConfigParser
import kbcmonkey.kbase as kbase

config = ConfigParser.ConfigParser()
config.read('default.ini')


def start_inferelator(conn, cm_job_id, cm_result_ref):
    cursor = conn.cursor()
    target_ws = cm_result_ref.split('/')[0]
    cursor.execute('select ij.id, short_name, ratios_file from inference_inferencejob ij join networks_species s on ij.species_id=s.id where cm_job_id=%s', [cm_job_id])
    nwp_jobid, organism, expression_ref = cursor.fetchone()
    tf_ref = '%s/%s.tfs' % (config.get('KBase', 'data_workspace'), organism)

    print "organism: ", organism
    print "expression: ", expression_ref
    print "TFs: ", tf_ref
    print "Starting Inferelator..."
    jobid = kbase.run_inferelator(config.get('KBase', 'inf_service_url'),
                                  config.get('KBase', 'user'),
                                  config.get('KBase', 'password'),
                                  target_ws,
                                  tf_ref,
                                  cm_result_ref,
                                  expression_ref)
    print "Started Inferelator job with job id: ", jobid
    cursor.execute('update inference_inferencejob set inf_job_id=%s where id=%s',
                   (jobid, nwp_jobid))
    conn.commit()
    cursor.close()


def check_cm_jobs():
    con = psycopg2.connect("dbname=%s user=%s password=%s" % (config.get('Database', 'name'),
                                                              config.get('Database', 'user'),
                                                              config.get('Database', 'password')))
    cursor = con.cursor()
    cursor.execute('select cm_job_id from inference_inferencejob where status=1 and inf_job_id is null')
    for row in cursor.fetchall():
        jobid = row[0]
        if jobid is not None:
            jobstate = kbase.user_job_state(config.get('KBase', 'ujs_service_url'),
                                            config.get('KBase', 'user'),
                                            config.get('KBase', 'password'),
                                            jobid)
            jobstatus = jobstate.get_job_status()
            #print jobstatus
            status = jobstatus[1]
            if status == 'error':
                print "Problem: ", jobstatus[2]
            elif status == 'complete':
                #print "Decription: ", jobstate.get_job_description()
                #print "Info: ", jobstate.get_job_info()
                cm_result_ref = jobstate.get_results()['workspaceids'][0]
                print "result at: ", cm_result_ref
                start_inferelator(con, jobid, cm_result_ref)
            else:
                print jobstatus
    cursor.close()
    con.close()


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


def upload_tfs(organism):
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
    #upload_tfs('hal')
    check_cm_jobs()
