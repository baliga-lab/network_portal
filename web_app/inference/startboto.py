#!/usr/bin/python

"""
A script to control a cmonkey EC2 instance - through Boto
"""

import boto
import boto.ec2
import time
import paramiko
import os.path
import errno

#INSTANCE_TYPE = 'm3.2xlarge'
INSTANCE_TYPE = None
SLEEP_SECS = 30
IMAGE = 'ami-854239ec'
KEY_NAME = 'cmonkeykey'

SECURITY_GROUPS = ['regular', 'default']
REGION = 'us-east-1'
KEY_FILENAME = os.path.expanduser('~/Dropbox/AWS/cmonkeykey.pem')
MAX_ATTEMPTS = 5

def get_region(name):
    return [r for r in boto.ec2.regions() if r.name == name][0]


class SSHHelper:
    def __init__(self, ip_address):
        self.ssh_client = paramiko.SSHClient()
        self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        for attempt in range(MAX_ATTEMPTS):
            try:
                self.ssh_client.connect(ip_address,
                                        username='ubuntu',
                                        key_filename=KEY_FILENAME)
            except EnvironmentError as exc:
                if exc.errno == errno.ECONNREFUSED:
                    print "could not connect SSH yet, retrying..."
                    time.sleep(SLEEP_SECS)
                else:
                    raise
            else:
                break
        else:
            raise RuntimeError("maximum number of unsuccessful connect attempts reached")
        self.sftp_client = self.ssh_client.open_sftp()

    def __put(self, localpath, remotepath):
        self.sftp_client.put(localpath, remotepath)

    def __get(self, remotepath, localpath):
        self.sftp_client.get(remotepath, localpath)

    def __exec_command(self, cmd):
        stdin, stdout, stderr = self.ssh_client.exec_command(cmd)
        errlines = stderr.readlines()
        outlines = stdout.readlines()
        return errlines, outlines

    ######################################################################
    #### Public interface
    ######################################################################

    def close(self):
        self.ssh_client.close()

    def start_cmonkey(self, orgcode, ratiosfile):
        self.__exec_command('cd cmonkey-python; export PYTHONPATH=cmonkey; nohup python cmonkey/cmonkey.py --logfile cmonkey.log --organism %s --ratios %s </dev/null > cm.log 2> cm.err &' % (orgcode, ratiosfile))

    def cmonkey_status(self):
        errlines, outlines = self.__exec_command("sqlite3 cmonkey-python/out/cmonkey_run.db 'select num_iterations, last_iteration from run_infos'")
        print outlines
        num_iterations, last_iteration = outlines[0].strip().split('|')
        print "# iterations: %s, last iteration: %s" % (num_iterations, last_iteration)

    def upload_ratios(self, path):
        pathcomps = os.path.split(path)
        filename = pathcomps[-1]
        print "uploading ratios, filename: ", filename
        self.__put(path, 'cmonkey-python/%s' % filename)
        return filename

    def download_results(self):
        self.__get('cmonkey-python/out/ratios.tsv.gz',
                   'downloaded_ratios.tsv.gz')
        self.__get('cmonkey-python/out/cmonkey_run.db',
                   'downloaded_cmonkey_run.db')


class EC2Starter:
    def __init__(self):
        self.conn = boto.ec2.EC2Connection(region=get_region(REGION))
        self.reservation = self.conn.run_instances(IMAGE,
                                                   key_name=KEY_NAME,
                                                   instance_type=INSTANCE_TYPE,
                                                   security_groups=SECURITY_GROUPS)
        instance = self.reservation.instances[0]
        while instance.state != 'running':
            print "retry, current state is: ", instance.state
            time.sleep(SLEEP_SECS)
            instance.update()

    def instance(self):
        return self.reservation.instances[0]

    def terminate_instance(self):
        instance = self.instance()
        instance.terminate()
        while instance.state != 'terminated':
            print "retry stop, state is: ", instance.state
            time.sleep(SLEEP_SECS)
            instance.update()

########################################################################
### OLD STYLE
########################################################################
########################################################################

def start_instance(ec2_conn):
    images = ec2_conn.get_all_images(image_ids=[IMAGE])
    reservation = images[0].run(min_count=1, max_count=1, key_name=KEY_NAME,
                                security_groups=SECURITY_GROUPS,
                                instance_type=INSTANCE_TYPE)
    instance = reservation.instances[0]
    while instance.state != 'running':
        print "retry, current state is: ", instance.state
        time.sleep(SLEEP_SECS)
        instance.update()

    return instance

def terminate_instance(instance):
    instance.terminate()
    while instance.state != 'terminated':
        print "retry stop, state is: ", instance.state
        time.sleep(SLEEP_SECS)
        instance.update()

if __name__ == '__main__':
    """
    ec2_conn = boto.connect_ec2()
    instance = start_instance(ec2_conn)
    dns = instance.public_dns_name
    print "started instance with DNS: ", dns
    time.sleep(300)
    terminate_instance(instance)
    """
    #starter = EC2Starter()
    #starter.ssh_connect()
    #starter.put('/home/weiju/risorg.ulx', 'risorg.ulx')
    #print "Done transferring to: ", starter.instance().ip_address
    ssh = SSHHelper('54.226.17.152')
    #ssh.put('/home/weiju/risorg.ulx', 'risorg.ulx')
    #ssh.cmonkey_status()
    #ssh.download_results()
    #ssh.upload_ratios('/home/weiju/tmp/pipeline-runs2/sco/sco-ratios.tsv')
    ssh.start_cmonkey('sco', 'sco-ratios.tsv')
