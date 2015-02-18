#!/usr/bin/env python

import pika
import ConfigParser
import argparse
import json
import time
import traceback
import psycopg2

import kbcmonkey.kbase as kbase
import kbcmonkey.WorkspaceClient as wsc
import util

config = ConfigParser.ConfigParser()
config.read('default.ini')


def start_cm_single(nwp_jobid, data_ws, input_ws, organism, timestamp,
                    ratios_obj_name, string_obj_name, operon_obj_name):
    print "uploading ratios..."
    data_ws_name = data_ws.name()
    input_ws_name = input_ws.name()
    string_obj_ref = None
    operon_obj_ref = None

    if string_obj_name is not None:
        string_obj_ref = '%s/%s' % (input_ws_name, string_obj_name)
    if operon_obj_name is not None:
        operon_obj_ref = '%s/%s' % (input_ws_name, operon_obj_name)

    # note that the results workspace is also the input workspace
    ratios_ref = '%s/%s' % (input_ws_name, ratios_obj_name)
    jobid = kbase.run_cmonkey(config.get('KBase', 'cm_service_url'),
                              config.get('KBase', 'user'),
                              config.get('KBase', 'password'),
                              input_ws_name,
                              ratios_ref,
                              '%s/%s.genome' % (data_ws_name, organism),
                              string_obj_ref, operon_obj_ref)
    print "started job with id: ", jobid
    con = psycopg2.connect("dbname=%s user=%s password=%s" % (config.get('Database', 'name'),
                                                              config.get('Database', 'user'),
                                                              config.get('Database', 'password')))
    cursor = con.cursor()
    cursor.execute('update inference_inferencejob set cm_job_id=%s, ratios_file=%s where id=%s',
                   (jobid, ratios_ref, nwp_jobid))
    con.commit()
    cursor.close()
    con.close()


def msg_consumer(channel, method, header, body):
    params = json.loads(body)
    print params
    try:
        print "logging in to KBase"
        ws_service = wsc.Workspace(config.get('KBase', 'ws_service_url'),
                                   user_id=config.get('KBase', 'user'),
                                   password=config.get('KBase', 'password'))

        data_ws = kbase.workspace(config.get('KBase', 'ws_service_url'),
                                  config.get('KBase', 'data_workspace'),
                                  ws_service_obj=ws_service)
        print "logged in to KBASE data workspace"

        # KBase is picky with identifier names, no colons, e.g.
        username = params['username']
        timestamp = str(time.time())

        if params['use_ensemble']:
            input_ws_name = 'cm_ensemble-%s-%s' % (username, timestamp)
        else:
            input_ws_name = 'cm_single-%s-%s' % (username, timestamp)

        input_ws_info = kbase.create_workspace(ws_service, input_ws_name)
        print "created input workspace under: ", input_ws_info
        input_ws = kbase.workspace(config.get('KBase', 'ws_service_url'),
                                   input_ws_name,
                                   ws_service_obj=ws_service)
        print "logged in to KBASE input workspace"

        organism = params['organism']
        genome_name = '%s.genome' % organism
        ratios_name = 'ratios-%s-%s' % (organism, timestamp)
        string_obj_name = None
        operon_obj_name = None

        kbase.import_ratios_matrix(input_ws, data_ws, ratios_name, genome_name,
                                   params['ratio_file_path'], sep='\t')

        if 'string_file_path' in params:
            string_obj_name = 'string-%s-%s' % (organism, timestamp)
            kbase.import_string_network(input_ws, string_obj_name,
                                        params['string_file_path'])
            print "uploaded STRING network"

        if 'operon_file_path' in params:
            print "uploading operome..."
            operon_obj_name = 'operon-%s-%s' % (organism, timestamp)
            kbase.import_mo_operome_file(input_ws, operon_obj_name,
                                         params['operon_file_path'])
            print "uploaded operome"

        start_cm_single(params['nwp_jobid'], data_ws, input_ws, organism, timestamp,
                        ratios_name, string_obj_name, operon_obj_name)


        channel.basic_ack(delivery_tag=method.delivery_tag)
    except:
        print "Error occurred"
        #channel.basic_cancel()
        channel.basic_ack(delivery_tag=method.delivery_tag)
        traceback.print_exc()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="cMonkey job handler")
    args = parser.parse_args()

    exchange = config.get('RabbitMQ', 'exchange')
    queue = config.get('RabbitMQ', 'queue')
    user = config.get('RabbitMQ', 'user')
    password = config.get('RabbitMQ', 'password')
    vhost = config.get('RabbitMQ', 'vhost')
    routing_key = config.get('RabbitMQ', 'routing_key')
    consumer_tag = config.get('RabbitMQ', 'consumer_tag')

    channel = util.setup_channel(exchange, user, password, vhost)
    channel.queue_declare(queue=queue)
    channel.queue_bind(queue=queue, exchange=exchange, routing_key=routing_key)
    channel.basic_consume(msg_consumer, queue=queue, consumer_tag=consumer_tag)
    channel.start_consuming()
