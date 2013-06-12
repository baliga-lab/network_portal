# Network Portal installation on ISB machines

## General remarks

Our goal should be to delegate software management to IT rather than trying to
manage then compiling our own packages - they know the server environments much
better than the developers !

## How to install Network Portal on ISB's standard CentOS Unix machines.

Network Portal is a Django web application. I built and installed Python 2.7.3 in /local/python and got several Python modules using PIP. We use the Apache web server and WSGI, Postgres, and Solr which depends on Java and Jetty.

Installation and configuration of each component is described below.

## Tools and Dependencies

  * git
  * apache2
  * python 2.7.x (>= 2.7.3), see section "Python"
  * python-pip
  * Postgres >= 8.x
  * Java 1.6+
  * Solr 4

## Python

ISB IT manages all Python-related modules. This includes mod_wsgi on Apache2.
Note that the current compiled Apache 2 is not compiled with mod_php or mod_ssl.
IT currently recommends to serve SSL related content through an additional
web server. Our Python 2.7.x installation on como is found under /tools/python-2.7.3

The following Python dependencies are installed:

  * pip
  * easy_install
  * django 1.5.x
  * django_openid_auth
  * networkx
  * numpy/scipy
  * psycopg2
  * python-openid


## Apache

Apache 2 is installed, these modules are most relevant to us:

  * mod_fcgid
  * mod_wsgi

### Editing apache configuration

<code>
export EDITOR=&lt;whatever is your favorite editor&gt;  
sudoedit /etc/httpd/conf/httpd.conf  
</code>

Note: keep the configuration clean, guys !

### Starting, stopping and restarting

<code>
sudo /etc/init.d/httpd start  
sudo /etc/init.d/httpd restart  
sudo /etc/init.d/httpd stop
</code>

### Reverse proxy Solr

...so we can access it from javascript in web pages.

<code>
&lt;IfModule mod_proxy.c&gt;  
  ProxyRequests Off  
  
  &lt;Proxy *&gt;  
  Order deny,allow  
  Allow from all  
  &lt;/Proxy&gt;
  
  ProxyPass /solr/select http://localhost:8983/solr/select  
  ProxyPassReverse /solr/select http://localhost:8983/solr/select  
  
  ProxyPass /solr/suggest http://localhost:8983/solr/suggest  
  ProxyPassReverse /solr/suggest http://localhost:8983/solr/suggest  
&lt;/IfModule&gt;  
</code>

## Postgres

=Authentication
Postgres authentication is tricky. There are several methods, of which we'll use two - ident and md5. Ident authentication uses your unix login to login to postgres. For example, one way to administer the database is through the psql client, which you can start like this:

sudo -u postgres psql

You're sudoing to the postgres user and logging into the DB as that user. The more normal way of logging in by supplying a username and password is the 'md5' method. Solr's DataImportHandler does this, as I couldn't get it to work with Ident authentication. It's login user is configured in:

/local/network_portal/solr/conf/data-config.xml

Logging into postgres from Python is configured in /local/network_portal/web_app/settings.py. Because Django runs as the user 'apache' we give permissions to that user in Postgres. User and Password can be left blank when using Ident authentication.

     'default': {
         'ENGINE': 'django.db.backends.postgresql_psycopg2', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
         'NAME': 'network_portal',        # Or path to database file if using sqlite3.
         'USER': '',               # Not used with sqlite3.
         'PASSWORD': '',            # Not used with sqlite3.
         'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
         'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
     }


Authentication methods are configured in the pg_hba.conf file. Google 'pg_hba.conf postgres 8.4 for more information:
/local/data/postgres/data/pg_hba.conf

=Data
Up to this point, the way we've populated the DB is by scripts that read cMonkey output from RData files and insert data into Postgres. These scripts are in the network portal project in the r-scripts folder: (extract-biclusters.R and functional.enrichment.R).

I work w/ this scripts and a separate instance of Postgres on my own machine, then dump the DB and reimport it into the production DB, like this:

scp bragi:/local/apache2/docs/gaggle/cbare/network_portal.dump.2012.03.19.gz .
gunzip < network_portal.dump.2012.03.19.gz | sudo -u postgres psql --dbname network_portal

=Starting, stopping, restarting
sudo /etc/init.d/postgresql start
sudo /etc/init.d/postgresql stop
sudo /etc/init.d/postgresql restart

=Reloading configuration
pg_ctl -D /var/lib/pgsql/data reload


## Java
====
Russ installed OpenJDK 1.6.x.
java -version
java version "1.6.0_22"


## Solr

The Solr search engine runs in the Jetty app server. I copied the war file into Jetty's webapps directory, 'cause weird things seemed to happen when I sym-linked it.

cp /local/lib/apache-solr-3.5.0/dist/apache-solr-3.5.0.war /local/jetty/jetty-hightide-8.1.4.v20120524/webapps/solr.war

To make use of Solr's DataImportHandler to build the index from database queries, Solr needs to be configured to talk to Postgres. I think putting the JDBC driver for postgres in /local/network_portal/solr/lib should be sufficient, but I also put it in /local/jetty/jetty-hightide-8.1.4.v20120524/lib/jdbc. Get the latest driver from: jdbc.postgresql.org.

DataImportHandler is configured in: /local/network_portal/solr/conf/data-config.xml

See the above Postgres section for setting up authentication.

Tell Solr to rebuild the index:
curl http://localhost:8983/solr/dataimport?command=full-import

## Andrew's notes:

Noted missing apxs which is required for mod_wsgi, apxs is part of httpd-devel (This also installed several dependency rpms)
yum install httpd-devel 

Noted /local/python was built without -enabled-shared which is required for mod_wsgi, coonfigured, rebuilt, and installed with them enabled
./configure --prefix /local/python --enable-shared
make
make install

Configured and built mod_wsgi
./configure --with-python=/local/python/bin/python2.7
make
make install (as root)

Add the LoadModule for mod_wsgi to /etc/httpd/conf/httpd.conf
LoadModule wsgi_module modules/mod_wsgi.so (sudo)

Restarted Apache and verified presece of mod_wsgi & python (sudo)
Apache/2.2.15 (Unix) DAV/2 mod_wsgi/3.3 Python/2.7.3 configured -- resuming normal operations

Verified install of django, psycopg2, networkx, and numpy (only psycopg2 needed to be installed)
/local/python/bin/pip install django
/local/python/bin/pip install psycopg2
/local/python/bin/pip install networkx
/local/python/bin/pip install numpy

Verified install of openjdk
java -version
java version "1.6.0_22"
OpenJDK Runtime Environment (IcedTea6 1.10.6) (rhel-1.43.1.10.6.el6_2-x86_64)
OpenJDK 64-Bit Server VM (build 20.0-b11, mixed mode)

Verified install of jetty  (it appears that solr comes with it's own jetty, so I'm not sure you need this)
jetty 6.1.24-2.el6

Confirmed that solr will start (I tested the newer 3.6):
cd /local/install/apache-solr-3.6.0/example
java -jar start.jar
2012-06-18 17:39:58.812:INFO::Logging to STDERR via org.mortbay.log.StdErrLog
2012-06-18 17:39:58.897:INFO::jetty-6.1-SNAPSHOT

