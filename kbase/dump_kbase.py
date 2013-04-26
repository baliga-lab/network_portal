#!/usr/bin/python
import psycopg2
import MySQLdb

DEBUG = True
PSQL = "dbname='network_portal' user='dj_ango' host='localhost' password='django'"

def kbase_conn():
    return MySQLdb.connect(host='localhost', user='root', passwd='root', db='kbase')


def mo_conn():
    return MySQLdb.connect(host='pub.microbesonline.org', user='guest', passwd='guest', db='genomics')

SYNONYM_TYPE_GENE = 0
LOCUS_TYPE_GENE   = 1

class MicrobesOnline:
    """connection to MicrobesOnline, used build lookup tables for genes
    We probably can get away with just looking up the names"""
    def __init__(self):
        self.conn = mo_conn()

    """
    def lookup_for(self, ncbi_taxonomy_id):
        cursor = self.conn.cursor()
        cursor.execute('select scaffoldId from Scaffold where taxonomyId = %s and isActive = 1', [ncbi_taxonomy_id])
        scaffold_ids = [row[0] for row in cursor.fetchall()]
        print "Scaffold ids: ", scaffold_ids
    """

    def find_synonym(self, ncbi_taxonomy_id, synonym):
        """returns the MicrobesOnline locus id for the synonym"""
        cursor = self.conn.cursor()
        cursor.execute('select distinct sy.locusId, sy.version from Synonym sy join Locus l on sy.locusId = l.locusId join Scaffold s on l.scaffoldId = s.scaffoldId where taxonomyId = %s and sy.name = %s',
                       [ncbi_taxonomy_id, synonym])
        synonyms = cursor.fetchall()
        return synonyms[0][0] if len(synonyms) > 0 else None


class KBase:
    """KBase lookup table connection"""
    def __init__(self):
        self.conn = kbase_conn()
        self.locustag_maps = {}
        self.locusid_maps = {}
    
    def genome_kbaseid(self, ncbi_taxonomy_id):
        """lookup the kbase id for a genome, given the NCBI taxonomy id"""
        cursor = self.conn.cursor()
        cursor.execute('select value, kbaseid from KBaseLookup where taxonomyId = %s and termId = 0', [ncbi_taxonomy_id])
        return cursor.fetchone()[1]

    def locustag_kbaseid(self, ncbi_taxonomy_id, name):
        """lookup the kbase id for a locus tag, given the locus tag name"""
        if ncbi_taxonomy_id not in self.locustag_maps:
            cursor = self.conn.cursor()
            cursor.execute('select value, kbaseId from KBaseLookup where taxonomyId = %s and termId = 2', [ncbi_taxonomy_id])
            self.locustag_maps[ncbi_taxonomy_id] = {row[0]: row[1]
                                                    for row in cursor.fetchall()}
            #print self.locustag_maps[ncbi_taxonomy_id]
        return self.locustag_maps[ncbi_taxonomy_id].get(name, None)

    def locusid_kbaseid(self, ncbi_taxonomy_id, locus_id):
        """lookup the kbase id for a locus id, given the locus id"""
        if ncbi_taxonomy_id not in self.locusid_maps:
            cursor = self.conn.cursor()
            cursor.execute('select value, kbaseId from KBaseLookup where taxonomyId = %s and termId = 1', [ncbi_taxonomy_id])
            self.locusid_maps[ncbi_taxonomy_id] = {int(row[0]): row[1]
                                                   for row in cursor.fetchall()}
        return self.locusid_maps[ncbi_taxonomy_id].get(locus_id, None)



def get_gene_name(row):
    return row[1] if (row[1] != '' and row[1] != None) else row[0]

if __name__ == '__main__':
    pgconn = psycopg2.connect(PSQL)
    cur = pgconn.cursor()
    cur.execute('select n.id, n.species_id, n.name, n.description, s.ncbi_taxonomy_id from networks_network n join networks_species s on n.species_id = s.id')
    nw_id = 2
    dest_cluster_id = 1
    dest_gene_id = 1
    kbase = KBase()
    mo = MicrobesOnline()

    networks = {}
    for row in cur.fetchall():
        networks[nw_id] = row
        nw_id += 1

    for dsid, entry in networks.items():
        # see Pavel Novichkov's email, this is a desired hack
        ncbi_taxonomy_id = entry[4]
        if ncbi_taxonomy_id == 83333:
            ncbi_taxonomy_id = 511145

        genome_kbaseid = kbase.genome_kbaseid(ncbi_taxonomy_id)
        if DEBUG == True:
            print "/* ncbi: %d -> kbase id = '%s' */" % (ncbi_taxonomy_id, genome_kbaseid)
            
        cur.execute('select id, name, common_name from networks_gene where species_id = %s', [entry[1]])
        id_genes = {row[0]: get_gene_name(row[1:]) for row in cur.fetchall()}

        cur.execute('select id, k from networks_bicluster where network_id = %s', [entry[0]])
        id_clusters = {row[0]: row[1] for row in cur.fetchall()}

        cur.execute('select bicluster_id, gene_id from networks_bicluster_genes where bicluster_id in (select id from networks_bicluster where network_id = %s)', [entry[0]])
        cluster_genes = {}
        for cluster_id, gene_id in cur.fetchall():
            if cluster_id not in cluster_genes:
                cluster_genes[cluster_id] = []
            cluster_genes[cluster_id].append(gene_id)
        
        # dump the SQL
        print 'insert into Dataset (datasetId,name,description,networkType,sourceReference,genomeKBaseId) values (%d,\'%s\',\'%s\',\'REGULATORY_NETWORK\',\'CMONKEY\',\'%s\');' % (dsid, entry[2], entry[3], genome_kbaseid)

        for cluster_id, cluster in id_clusters.items():
            print 'insert into Bicluster (biclusterId,datasetId,name) values (%d,%d,\'%s\');' % (dest_cluster_id, dsid, str(cluster))
            gene_ids = cluster_genes[cluster_id] if cluster_id in cluster_genes else []
            dest_genes = [id_genes[gene_id] for gene_id in gene_ids]
            #print dest_genes

            for gene in dest_genes:
                gkbase_id = kbase.locustag_kbaseid(ncbi_taxonomy_id, gene)
                if gkbase_id == None:
                    # we could not find the locus tag, but we can try to look up
                    # the id in the synonyms
                    locus_id = mo.find_synonym(ncbi_taxonomy_id, gene)
                    if locus_id != None:
                        gkbase_id = kbase.locusid_kbaseid(ncbi_taxonomy_id, locus_id)
                        #print "found gkbase id in synonyms: ", gkbase_id

                gene = gene.replace("'", "\\'")
                if gkbase_id != None:
                    print "insert into Gene (geneId,datasetId,biclusterId,name,kbaseId) values (%d,%d,%d,'%s','%s');" % (dest_gene_id, dsid, dest_cluster_id, gene, gkbase_id)
                else:
                    print "insert into Gene (geneId,datasetId,biclusterId,name) values (%d,%d,%d,'%s');" % (dest_gene_id, dsid, dest_cluster_id, gene)
                    #print "WARNING - not found: '%s'" % gene

                dest_gene_id += 1
            dest_cluster_id += 1
