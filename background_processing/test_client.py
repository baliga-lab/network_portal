#!/usr/bin/env python
"""test_client.py
"""
import pika
import ConfigParser
import json

import util


PARAMS = {
    "tfsfile": "/home/weiju/Projects/ISB/cmonkey-python/inferelator/eco.txt",
    "resultdir": "/home/weiju/Projects/ISB/cmonkey-python/out"
}

if __name__ == "__main__":
    config = ConfigParser.ConfigParser()
    config.read('default.ini')

    exchange = config.get('RabbitMQ', 'exchange')
    queue = config.get('RabbitMQ', 'queue')
    user = config.get('RabbitMQ', 'user')
    password = config.get('RabbitMQ', 'password')
    vhost = config.get('RabbitMQ', 'vhost')
    routing_key = config.get('RabbitMQ', 'routing_key')
    consumer_tag = config.get('RabbitMQ', 'consumer_tag')

    channel = util.setup_channel(exchange, user, password, vhost)
    channel.confirm_delivery()

    msg_props = pika.BasicProperties(content_type="application/json", delivery_mode=1)
    msg = json.dumps(PARAMS)
    if channel.basic_publish(body=msg, exchange=exchange,
                             properties=msg_props, routing_key=routing_key):
        print "message confirmed"
    else:
        print "not confirmed"
    channel.close()
