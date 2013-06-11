import sys
import psycopg2
import synonyms

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print 'Usage: mark_tfs.py <orgcode> <tfs-file>'
    else:
        print "Marking genes for %s..." % sys.argv[1]
        if sys.argv[1] == 'eco':
            synonyms = synonyms.read_synonyms(sys.argv[3])

        with open(sys.argv[2], 'r') as infile:
            tfs = sorted([line.strip() for line in infile])
            if sys.argv[1] == 'syf':
                tfs = [gene.replace('Synpcc7942', 'Synpcc7942_') for gene in tfs]
            if sys.argv[1] == 'bth':
                tfs = [gene.replace('BT', 'BT_') for gene in tfs
                       if not gene.startswith('BT_')]
        con = psycopg2.connect(
            "dbname=network_portal user=dj_ango password=django")
        cur = con.cursor()
        cur.execute("""select id from networks_species
where short_name = %s""", (sys.argv[1], ))
        species_id = cur.fetchone()[0]
        print "species id: ", species_id
        
        for gene in tfs:
            if sys.argv[1] == 'eco':
                if gene in synonyms:
                    print "%s -> %s" % (gene, synonyms[gene])
                    gene = synonyms[gene]
            cur.execute("""select id, name, common_name
from networks_gene where (name = %s or common_name = %s) and species_id = %s""",
                        (gene, gene, species_id))
            rows = cur.fetchall()
            if len(rows) == 0:
                print "not found: ", gene
            elif len(rows) == 1:
                print "found: ", gene
                cur.execute("""update networks_gene set transcription_factor = true where (name = %s or common_name = %s) and species_id = %s""",
                            (gene, gene, species_id))
            else:
                print "DUPLICATE found: ", gene
        con.commit()
        con.close()
        print "Done."
