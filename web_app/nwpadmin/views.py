import traceback
from urllib2 import URLError
import urllib2
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponse, HttpResponseRedirect
from django.conf import settings
from django.contrib import messages
from django.db import transaction

import json
import MySQLdb

from networks.models import Species, Chromosome, Gene


MO_GENOME_URL = 'http://microbesonline.org/cgi-bin/genomeInfo.cgi?tId=%s;export=tab'
TFS_URL = settings.ORGANISM_SERVICE_HOST + '/tfs/%s'
SYNONYMS_URL = settings.ORGANISM_SERVICE_HOST + '/synonyms/%s'


MYSQL_HOST = 'pub.microbesonline.org'
MYSQL_USER = 'guest'
MYSQL_PASSWD = 'guest'
MYSQL_DB = 'genomics'

def mysql_connect():
    """create a database connection"""
    return MySQLdb.connect(host=MYSQL_HOST, user=MYSQL_USER,
                           passwd=MYSQL_PASSWD, db=MYSQL_DB)


def read_url(url):
    """convenience method to read a document from a URL using the
    MyURLopener"""
    infile = urllib2.urlopen(url, timeout=100)
    result = infile.read()
    infile.close()
    return result


def index(request):
    """entry point for the administration interface"""
    # make sure we don't allow unauthorized users
    if request.user.is_staff:
        species = Species.objects.filter(ncbi_taxonomy_id__gt=0)
        return render_to_response('index.html', locals(),
                                  context_instance=RequestContext(request))
    else:
        raise Exception('not authenticated')


def get_kegg2ncbi():            
    with open('nwpadmin/KEGG_taxonomy') as infile:
        kegg2ncbi = {}
        for line in infile:
            row = line.strip().split('\t')
            kegg2ncbi[row[1]] = (int(row[2]), row[3])
        return kegg2ncbi


def get_mo_genome(ncbi_code):
    """Note that MicrobesOnline will give you an empty list of genes instead of
    an error !"""
    print MO_GENOME_URL % ncbi_code
    content = read_url(MO_GENOME_URL % ncbi_code).split('\n')[1:]
    print "# genes read: %d" % (len(content) - 1)
    lines = [line.strip().split('\t') for line in content]
    return filter(lambda l: len(l) >= 10, lines)


def get_synonyms(keggcode):
    syncont = read_url(SYNONYMS_URL % keggcode)
    thesaurus = json.loads(syncont)
    synonyms = {}
    for primary, alternatives in thesaurus.items():
        for alt in alternatives:
            synonyms[alt] = primary
    return synonyms


def get_tfs(keggcode, synonyms):
    tfs = read_url(TFS_URL % keggcode).split('\n')
    print "# TFS: %d" % len(tfs)
    canon_tfs = set()
    for tf in tfs:
        if tf in synonyms:
            canon_tfs.add(synonyms[tf])
        else:
            canon_tfs.add(tf)
    return canon_tfs


def get_chrom_map(scaffold_ids):
    # at this point, we have everything to create the species
    # we might need user feedback for the chromosomes
    # names, we can obtain the length, topology and refseq
    conn = mysql_connect()
    cursor = conn.cursor()
    chrom_map = {}
    cursor.execute('select scaffoldId,chr_num,isCircular,length,file from Scaffold where scaffoldId in (' + ','.join(map(str, scaffold_ids)) + ') and isActive=1')
    for id, chr_num, is_circular, length, contig_file in cursor.fetchall():
        print "chr #%d, circ: %d, len: %d contig: %s" % (chr_num, is_circular,
                                                         length, contig_file)
        chrom_map[id] = (chr_num, is_circular == 1, length, contig_file)
    cursor.close()
    conn.close()
    return chrom_map


def check_import_species(request, keggcode=None):
    """This action does a pre-check which allows the user to check and then
    confirm the import"""
    species_exists = Species.objects.filter(short_name=keggcode).count() > 0
    if species_exists:
        result = {'status': 'error', 'message': 'Species exists already'}
        return HttpResponse(json.dumps(result), content_type='application/json')

    kegg2ncbi = get_kegg2ncbi()
    if keggcode not in kegg2ncbi:
        result = {'status': 'error', 'message': 'invalid kegg code: %s' % keggcode}
        return HttpResponse(json.dumps(result), content_type='application/json')

    ncbi_code, species_name = kegg2ncbi[keggcode]
    mo_genome_lines = get_mo_genome(ncbi_code)
    if  len(mo_genome_lines) == 0:
        result = {'status': 'error', 'message': 'no genome found for: %s' % keggcode}
        return HttpResponse(json.dumps(result), content_type='application/json')
    
    try:
        synonyms = get_synonyms(ncbi_code)
        print "synonyms retrieved"
    except URLError:
        result = {'status': 'error', 'message': 'no synonyms found for: %s' % keggcode}
        return HttpResponse(json.dumps(result), content_type='application/json')

    try:
        canon_tfs = get_tfs(ncbi_code, synonyms)
    except URLError:
        result = {'status': 'error', 'message': 'no TFS found for: %s' % keggcode}
        return HttpResponse(json.dumps(result), content_type='application/json')
        
    result = {'status': 'ok'}
    return HttpResponse(json.dumps(result), content_type='application/json')


def import_species(request, keggcode=None):
    """This action is to be called through Ajax.
    Import from RSAT if possible, and return with status data
    If the species exists already or not available, return with error
    """
    if request.user.is_staff:
        species_exists = Species.objects.filter(short_name=keggcode).count() > 0
        if species_exists:
            result = {'status': 'error', 'message': 'species already exists: %s' % keggcode}
        else:
            kegg2ncbi = get_kegg2ncbi()
            if keggcode not in kegg2ncbi:
                result = {'status': 'error', 'message': 'invalid kegg code: %s' % keggcode}
            else:
                ncbi_code, species_name = kegg2ncbi[keggcode]
                mo_genome_lines = get_mo_genome(ncbi_code)
                scaffold_ids = {int(line[3]) for line in mo_genome_lines if len(line) > 4}
                print "# scaffolds: %d -> %s" % (len(scaffold_ids), repr(scaffold_ids))

                synonyms = get_synonyms(ncbi_code)
                canon_tfs = get_tfs(ncbi_code, synonyms)
                chrom_map = get_chrom_map(scaffold_ids)

                num_tfs = 0
                genes = []
                for line in mo_genome_lines:
                    accession = line[1]
                    scaffold = int(line[3])
                    start = int(line[4])
                    stop = int(line[5])
                    strand = line[6]
                    sys_name = line[7]
                    name = line[8]
                    description = line[9]

                    if sys_name in canon_tfs:
                        is_tf = True
                    elif sys_name in synonyms:
                        is_tf = synonyms[sys_name] in canon_tfs
                    else:
                        is_tf = False

                    if is_tf:
                        num_tfs += 1
                    genes.append((accession, scaffold, start, stop, strand, sys_name, name, description, is_tf))
                print "# TFs found: %d" % num_tfs
                chrom_db = {}
                try:
                    with transaction.atomic():
                        species = Species(short_name=keggcode, name=species_name,
                                          ncbi_taxonomy_id = ncbi_code)
                        species.save()

                        for scaffoldId, value in chrom_map.items():
                            chrnum, is_circ, length, filename = value
                            if is_circ:
                                topology = 'circular'
                            else:
                                topology = 'linear'
                            chrom = Chromosome(species=species,
                                               name="Chromosome %d" % chrnum,
                                               length=length,
                                               topology=topology,
                                               refseq=filename)
                            chrom.save()
                            chrom_db[scaffoldId] = chrom
                        for accession, scaffold, start, stop, strand, sysname, name, desc, istf in genes:
                            gene = Gene(species=species, chromosome=chrom_db[scaffold],
                                        name=sysname, common_name=name,
                                        start=start, end=stop, strand=strand,
                                        description=desc[0:255], transcription_factor=istf)
                            gene.save()
                    result = {'status': "ok"}
                except:
                    traceback.print_exc()
                    result = {'status': 'error', 'message': 'problem while importing'}
                

        return HttpResponse(json.dumps(result), content_type='application/json')
    else:
        raise Exception('not authenticated')
