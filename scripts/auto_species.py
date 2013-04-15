#!/usr/bin/python

import os.path
import psycopg2
import urllib

#MO_BASEURL = 'http://microbesonline.org/cgi-bin/genomeInfo.cgi?tId=243231;export=tab'
MO_BASEURL = 'http://microbesonline.org/cgi-bin/genomeInfo.cgi?'
#KEGG_BASEURL = 'http://www.biowebdb.org/pub/kegg/genes/organisms/pae/pae_pathway.list'
KEGG_BASEURL = 'http://www.biowebdb.org/pub/kegg/genes/organisms/'

class CMonkeyURLopener(urllib.FancyURLopener):
    """An URL opener that can detect 404 errors"""

    def http_error_default(self, url, fp, errcode, errmsg, headers):
        # pylint: disable-msg=R0913
        # pylint: disable-msg=C0103
        """overriding the default error handling method to handle HTTP 404
        errors"""
        if (errcode == 404):
            raise DocumentNotFound(url)

        # call super class handler.
        # note that urllib.FancyURLopener is not a new-style class
        return urllib.FancyURLopener.http_error_default(
            self, url, fp, errcode, errmsg, headers)

class Species:
    def __init__(self, id, short_name, name, taxonomy_id):
        self.id = id
        self.short_name = short_name
        self.name = name
        self.taxonomy_id = taxonomy_id
        self.chromosome_map = {}

    def __str__(self):
        return "%d - %s (%s) %d [%s]" % (self.id, self.short_name, self.name,
                                    self.taxonomy_id, self.chromosome_map)

    def __repr__(self):
        return str(self)


def download_keggfile(code):
    cache_filename = 'cache/%s_pathway.list' % code
    url = KEGG_BASEURL + ('%s/%s_pathway.list' % (code, code))
    if not os.path.exists(cache_filename):
        CMonkeyURLopener().retrieve(url, cache_filename)
    return cache_filename

def download_mo_genomeinfo_file(code, taxonomy_id):
    cache_filename = 'cache/%s_genomeInfo.txt' % code
    url = MO_BASEURL + ('tId=%d;export=tab' % taxonomy_id)
    if not os.path.exists(cache_filename):
        CMonkeyURLopener().retrieve(url, cache_filename)
    return cache_filename

def load_species_info(conn):
    cursor = conn.cursor()
    cursor.execute('select id, short_name, name, ncbi_taxonomy_id from networks_species')
    
    species = [Species(s_id, short_name, name, tax_id)
               for s_id, short_name, name, tax_id in cursor.fetchall()]
    species_map = {}
    for s in species:
        cursor.execute('select name from networks_chromosome where species_id = %s',
                       [s.id])
        for row in cursor.fetchall():
            chromosome = row[0]
            s.chromosome_map[chromosome] = chromosome
        species_map[s.short_name] = s
    return species_map

if __name__ == '__main__':
    conn = psycopg2.connect("dbname=network_portal user=dj_ango password=django")
    species_map = load_species_info(conn)
    print species_map
    download_keggfile('pae')
    download_mo_genomeinfo_file('pae', 208964)
