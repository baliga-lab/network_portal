import pika


def setup_channel(exchange, user, password, vhost, host='localhost'):
    credentials = pika.PlainCredentials(user, password)
    conn_params = pika.ConnectionParameters(host=host,
                                            credentials=credentials,
                                            virtual_host=vhost)
    conn_broker = pika.BlockingConnection(conn_params)
    channel = conn_broker.channel()
    channel.exchange_declare(exchange=exchange,
                             type='direct',
                             passive=False,
                             durable=False,
                             auto_delete=True)
    return channel

def dbconn():
    return MySQLdb.connect(host='localhost', user="root", passwd="root",
                           db="computeall")
