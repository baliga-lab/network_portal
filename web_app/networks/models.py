from django.db import models
from django.db import connection
from django.contrib.auth.models import User
from helpers import synonym
import re
import numpy as np
import StringIO


class Species(models.Model):
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=64)
    ncbi_taxonomy_id = models.IntegerField(blank=True, null=True)
    ucsc_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField()
    
    def transcription_factors(self):
        return self.gene_set.filter(transcription_factor=True)
    
    def __unicode__(self):
        return self.name
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = "Species"

class Chromosome(models.Model):
    species = models.ForeignKey(Species)
    name = models.CharField(max_length=255)
    length = models.IntegerField()
    topology = models.CharField(max_length=64)
    refseq = models.CharField(max_length=64, blank=True, null=True)
    
    def ucsc_id(self):
        """Get the UCSC id for this chromosome from the synonym table"""
        ucsc_name = synonym(obj=self, synonym_type='ucsc')
        print "ucsc_name = %s" % (str(ucsc_name),)
        return ucsc_name if ucsc_name else self.name
    
    def __unicode__(self):
        return self.name

class Network(models.Model):
    species = models.ForeignKey(Species)
    name = models.CharField(max_length=255)
    data_source = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    version_id = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    
    def get_biclusters_regulated_by(regulator):
        biclusters = Bicluster.objects.filter(influences__name__contains=regulator)
    
    def __unicode__(self):
        return self.name
    

class Condition(models.Model):
    network = models.ForeignKey(Network)
    name = models.CharField(max_length=255)
    
    def expression(self):
        """
        Retrieve the expression vector for this condition.
        """
        try:
            cursor = connection.cursor()
            cursor.execute("""
                select e.gene_id, e.value
                from expression e
                where e.condition_id=%s
                order by e.gene_id;
                """,
                (self.id,))
            return cursor.fetchall();
        finally:
            cursor.close()
    
    def __unicode__(self):
        return self.name

def expression_matrix(conditions):
    """
    Retrieve an expression matrix from the database, for a given list of
    conditions. Input is a list of condition objects. Returns a DataMatrix
    object with three members:
    - conditions: a list of condition objects
    - genes: a list of gene objects
    - data: a numpy array of 2 dimensions containing gene expression
            data under the given conditions.
    """
    try:
        cursor = connection.cursor()
        
        # create and populate temp table
        cursor.execute("create temporary table temp_genes ( gene_id integer );")
        cursor.execute("""
            insert into temp_genes
            select distinct(gene_id)
            from expression
            where condition_id in (%s)
            order by gene_id;""" % (",".join([str(c.id) for c in conditions]),) )
        cursor.execute("""select gene_id from temp_genes;""")
        gene_ids = [ row[0] for row in cursor ]

        # create a numpy 2D array
        # print "%d, %d" % (len(gene_ids), len(conditions),)
        m = np.empty([len(gene_ids), len(conditions)])

        # left join with temp_genes so that we get all the genes, even if
        # expression data is sparse - different genes have data for different
        # conditions. Result may contain nulls.
        column_num = 0
        for condition in conditions:
            cursor.execute("""
                select e.value
                from temp_genes tg left join expression e on tg.gene_id=e.gene_id
                where e.condition_id = %s
                order by tg.gene_id;
                """ % (condition.id,))
            row_num = 0
            for row in cursor:
                m[row_num,column_num] = row[0]
                row_num += 1
            column_num += 1
            row_num = 0
        
        class DataMatrix:
            pass
        
        result = DataMatrix()
        result.genes = list(Gene.objects.filter(id__in=gene_ids))
        result.conditions = conditions
        result.data = m

        return result
    finally:
        if cursor:
            cursor.execute("drop table temp_genes;")
            cursor.execute("commit;")
        cursor.close()

def expression_matrix_to_tsv_stream(matrix, ostr, coords=False):
    """
    Stream an expression matrix out to ostr, in a tab-separated-values format
    with conditions as columns and genes as rows. The matrix is a DataMatrix
    object as returned by the function expression_matrix.
    """
    ostr.write("GENE")
    for condition in matrix.conditions:
        ostr.write("\t")
        ostr.write(condition.name)
    ostr.write("\n")
    l = np.size(matrix.data, axis=0)
    w = np.size(matrix.data, axis=1)
    gene_names = [ gene.name for gene in matrix.genes]
    for i in range(l):
        if coords:
            gene = matrix.genes[i]
            ostr.write("%s%s:%d-%d" % (gene.chromosome.name, gene.strand, gene.start, gene.end,))
        else:
            ostr.write(gene_names[i])
        for j in range(w):
            ostr.write("\t")
            ostr.write(str(matrix.data[i,j]))
        ostr.write("\n")

def expression_matrix_to_tsv(matrix):
    """
    Output an expression matrix to a string in tab-separated format. The matrix
    is a DataMatrix object as returned by the function expression_matrix.
    """
    import StringIO
    ostr = StringIO.StringIO()
    expression_matrix_to_tsv_stream(matrix, ostr)
    return ostr.getvalue()


class Gene(models.Model):
    species = models.ForeignKey(Species)
    chromosome = models.ForeignKey(Chromosome, blank=True, null=True)
    name = models.CharField(max_length=64)
    common_name = models.CharField(max_length=100, blank=True, null=True)
    geneid = models.IntegerField(blank=True, null=True)
    type = models.CharField(max_length=64, blank=True, null=True)
    start = models.IntegerField(blank=True, null=True)
    end = models.IntegerField(blank=True, null=True)
    strand = models.CharField(max_length=1, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    transcription_factor = models.BooleanField(default=False)
    functions = models.ManyToManyField('Function', through='Gene_Function')
    
    def display_name(self):
        return self.name if self.common_name is None or self.common_name=='' else self.name + " " + self.common_name
    
    def location(self):
        if self.chromosome:
            return "%s%s:%d-%d" % (self.chromosome.name, self.strand, self.start, self.end,)
        else:
            return None
            
    def synonyms(self):
        return [synonym.name for synonym in Synonym.objects.filter(target_id=self.id, target_type='gene')]

    def functions_by_type(self):
        """
        Returns a dictionary with function types as keys and 
        """
        functions = self.functions.all()
        results = {}
        for function in functions:
            if function.type not in results:
                results[function.type] = []
            results[function.type].append(function)
        return results
    
    def regulated_biclusters(self, network):
        """
        Return biclusters regulated by this gene, either directly or through (one level of) and-gates.
        """
        if not self.transcription_factor or network==None:
            return []
        else:
            if type(network)==int:
                network_id = network
            else:
                network_id = network.id
            return Bicluster.objects.raw("""
            select distinct(nb.*)
            from networks_bicluster nb
                 join networks_bicluster_influences bi on nb.id=bi.bicluster_id
                 join networks_influence ni on bi.influence_id=ni.id
            where nb.network_id=%s
            and ((ni.type='tf' and ni.gene_id=%s)
            or (ni.type='combiner' and ni.id in (
              select from_influence_id
              from networks_influence_parts nip join networks_influence ni on nip.to_influence_id=ni.id
              where ni.gene_id=%s)))
            order by nb.id;
            """, (network_id, self.id, self.id,))

    def count_regulated_biclusters(self, network):
        if not self.transcription_factor or network==None:
            return 0
        if type(network)==int:
            network_id = network
        else:
            network_id = network.id
        try:
            cursor = connection.cursor()
            cursor.execute("""
                select count(distinct(nb.id))
                from networks_bicluster nb
                     join networks_bicluster_influences bi on nb.id=bi.bicluster_id
                     join networks_influence ni on bi.influence_id=ni.id
                where nb.network_id=%s
                and ((ni.type='tf' and ni.gene_id=%s)
                or (ni.type='combiner' and ni.id in (
                  select from_influence_id
                  from networks_influence_parts nip join networks_influence ni on nip.to_influence_id=ni.id
                  where ni.gene_id=%s)));
            """, (network_id, self.id, self.id,))
            return cursor.fetchone()[0]
        finally:
            cursor.close()
    
    def neighbor_genes(self, network):
        """
        Return this genes neighbors, the set of genes with comembership in some bicluster with this gene.
        """
        if network==None:
            return set()
        elif type(network)==int:
            network_id = network
        else:
            network_id = network.id
        result = set()
        for bicluster in self.bicluster_set.filter(network=network_id):
            result.update(bicluster.genes.all())
        return sorted(result)
    
    def __cmp__(self, other):
        return cmp(self.name, other.name)
    
    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ['name']

def find_gene_by_name(name):
    try:
        return Gene.objects.get(name=name)
    except Exception as e:
        matches = Synonym.objects.filter(name=name, target_type='gene')
        if len(matches) > 0:
            return Gene.objects.get(id=matches[0].target_id)
        else:
            raise e

class Influence(models.Model):
    """
    Influences can be transcription factors, environmental factors or
    combinations of other influences. If the influence is a
    transcription factor, the gene field links to the entry in the gene table. If
    the influence is a combination of TFs, the individual TFs will be linked
    through the Influence_Combinations table.
    """
    name = models.CharField(max_length=255)
    gene = models.ForeignKey(Gene, blank=True, null=True)
    operation = models.CharField(max_length=32, blank=True, null=True)
    type = models.CharField(max_length=32, blank=True, null=True)
    parts = models.ManyToManyField('self')
    
    def is_combiner(self):
        return self.type=='combiner'
    
    # these two methods are redundant with parts
    def get_part_names(self):
        # return ~~ delimited parts, removing the last bit which is the combining operation ('min')
        return self.name.split('~~')[:-1]

    def get_parts(self):
        parts = []
        for part_name in self.get_part_names():
            parts.append(Influence.objects.get(name=part_name))
        return parts
    
    def __unicode__(self):
        return self.name

class Bicluster(models.Model):
    network = models.ForeignKey(Network)
    k = models.IntegerField()
    residual = models.FloatField(blank=True, null=True)
    conditions = models.ManyToManyField(Condition)
    genes = models.ManyToManyField(Gene)
    influences = models.ManyToManyField(Influence, symmetrical=False)
    functions = models.ManyToManyField('Function', through='Bicluster_Function')
    
    def __unicode__(self):
        return "Bicluster " + str(self.k)

    class Meta:
        ordering = ['k']

# find biclusters with a given function
# optionally, restrict to a particular network, or filter by
# bonferroni p value or benjamini-hochberg p value
def find_biclusters_with_function(function, network=None, p_b_cutoff=None, p_bh_cutoff=None):
    args = {'functions':function}
    if network:
        args['network'] = network
    if p_b_cutoff:
        args['bicluster_function__p_b__lte'] = p_b_cutoff
    elif p_bh_cutoff:
        args['bicluster_function__p_bh__lte'] = p_bh_cutoff
    return Bicluster.objects.filter(**args)

class PSSM():
    """
    Position specific scoring matrix. Not a Django model 'cause one PSSM is
    not a single row in the DB but several (one row per position).
    At each position, 
    """
    def __init__(self):
        self.positions=[]

    def add_position(self, dict):
        self.positions.append(dict)

    def get_position(self, p):
        return self.positions[p]
    
    def __iter__(self):
        i = 0
        while i < len(self.positions):
            yield self.positions[i]
            i += 1
    
    def __len__(self):
        return len(self.positions)
    
    def as_string(self):
        """
        Serialize the PSSM out to a string to stick in a URL and send to RegPredict
        """
        ostr = StringIO.StringIO()
        ostr.write("POSITION A C G T ")
        i = 1
        for p in self.positions:
            ostr.write(str(i))
            ostr.write(" ")
            ostr.write(" ".join([ str(p[base]) for base in ('a', 'c', 'g', 't')]))
            ostr.write(" ")
            i += 1
        return ostr.getvalue()
    
    def consensus(self):
        letters = []
        for p in self.positions:
            max_letter = 'a'
            for letter in p.keys():
                if p[letter] > p[max_letter]:
                    max_letter = letter
            if p[max_letter] > 0.8:
                letters.append(max_letter.upper())
            elif p[max_letter] > 0.4:
                letters.append(max_letter)
            else:
                letters.append('.')
        return "".join(letters)

    def __len__(self):
        return len(self.positions)

class Motif(models.Model):
    bicluster = models.ForeignKey(Bicluster)
    position = models.IntegerField(blank=True, null=True)
    sites = models.IntegerField(blank=True, null=True)
    e_value = models.FloatField(blank=True, null=True)

    def consensus(self):
        return self.pssm().consensus()
    
    def pssm(self):
        try:
            cursor = connection.cursor()

            # Data retrieval operation - no commit required
            cursor.execute("select position, a, c, g, t from pssms where motif_id=%s order by position;", [self.id])
            rows = cursor.fetchall()
        
            pssm = PSSM()
            for row in rows:
                pssm.add_position({'a':row[1], 'c':row[2], 'g':row[3], 't':row[4]})

            self._pssm = pssm
            return pssm
        finally:
            cursor.close()

# A generalized annotation field. Put annotation on any type of object.
class Annotation(models.Model):
    target_id = models.IntegerField()
    target_type = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=255, blank=True, null=True)

# alternate names for genes, species, maybe influences or functions
class Synonym(models.Model):
    target_id = models.IntegerField()
    target_type = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=64, blank=True, null=True)

# functions as defined by some system
# type specifies the naming system {GO, COG, KEGG, etc.}
# native_id is the id within the naming system, GO_ID, Kegg pathway ID, etc.
# genes can have functions, biclusters can be enriched for functions
class Function(models.Model):
    native_id = models.CharField(max_length=64, blank=True, null=True)
    name = models.CharField(max_length=255)
    namespace = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=64, blank=True, null=True)
    obsolete = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)
    
    def child_functions(self):
        """
        Get child functions, if there are any.
        Returns a Django RawQuerySet.
        """
        return Function.objects.raw("""
        select f.*
        from networks_function f
        where f.type=%s
        and f.id in (select function_id from networks_function_relationships where type=%s and target_id=%s)
        order by native_id;""", (self.type, self.parent_relation(), self.id,))
    
    def count_child_functions(self):
        """
        Count child functions of this function.
        """
        try:
            cursor = connection.cursor()
            cursor.execute("""
                select count(function_id) from networks_function_relationships where type=%s and target_id=%s;""",
                (self.parent_relation(), self.id,))
            return cursor.fetchone()[0];
        finally:
            cursor.close()
    
    def parent_functions(self):
        return Function.objects.raw("""
        select f.*
        from networks_function f
        where f.type=%s
        and f.id in (select target_id from networks_function_relationships where type=%s and function_id=%s)
        order by native_id;""", (self.type, self.parent_relation(), self.id,))
    
    def count_parent_functions(self):
        """
        Count parent functions of this function.
        """
        try:
            cursor = connection.cursor()
            cursor.execute("""
                select count(target_id) from networks_function_relationships where type=%s and function_id=%s;""",
                (self.parent_relation(), self.id,))
            return cursor.fetchone()[0];
        finally:
            cursor.close()
    
    def display_id(self):
        """
        Returns the native ID, if one exists, otherwise the database primary key ID.
        """
        return self.native_id if self.native_id else self.id
    
    def parent_relation(self):
        if self.type=='go':
            return 'is_a'
        else:
            return 'parent'

    def link_to_term(self, organism=None):
        if self.type=='go':
            return "http://amigo.geneontology.org/cgi-bin/amigo/term_details?term=%s" % (self.native_id,)
        elif self.type=='cog':
            return "http://www.ncbi.nlm.nih.gov/COG/grace/wiew.cgi?%s" % (self.native_id,)
        elif self.type=='tigr':
            return "http://www.jcvi.org/cgi-bin/tigrfams/HmmReportPage.cgi?acc=%s" % (self.native_id,)
        elif self.type=='kegg':
            m = re.match(r'path:(\d+)', self.native_id)
            if m:
                pathway = m.group(1)
            if organism:
                return "http://www.genome.jp/kegg-bin/show_pathway?org_name=%s&mapno=%s&show_description=show" % (organism, pathway)
            else:
                return "http://www.genome.jp/kegg-bin/show_pathway?map%s" % (pathway,)
        else:
            link_to_term_url = "http://www.google.com/search?q=%s" % (self.native_id,)

    class Meta:
        ordering = ['native_id']
    
    def __unicode__(self):
        fields = [ self.native_id, self.name, self.namespace, self.type, "obsolete" if self.obsolete else None ]
        fields = [ field for field in fields if field is not None ]
        return "Function: " + ", ".join(fields)

class Function_Relationships(models.Model):
    """
    Define relationships among functions, such as the GO hierarchy or the categories/subcategories of KEGG.
    """
    function = models.ForeignKey(Function, related_name='relationships')
    target = models.ForeignKey(Function, related_name='+')
    type = models.CharField(max_length=255, blank=True, null=True)

class Gene_Function(models.Model):
    function = models.ForeignKey(Function)
    gene = models.ForeignKey(Gene)
    source = models.CharField(max_length=255, blank=True, null=True)

class Bicluster_Function(models.Model):
    bicluster = models.ForeignKey(Bicluster)
    function = models.ForeignKey(Function)
    gene_count = models.IntegerField(blank=True, null=True)
    m = models.IntegerField(blank=True, null=True)
    n = models.IntegerField(blank=True, null=True)
    k = models.IntegerField(blank=True, null=True)
    p = models.FloatField(blank=True, null=True)
    p_bh = models.FloatField(blank=True, null=True)
    p_b = models.FloatField(blank=True, null=True)
    method = models.CharField(max_length=30, blank=True, null=True)

class WorkflowCategories(models.Model):
    name = models.CharField(max_length=255)

#class ComponentTypes(models.Model):
#    name = models.CharField(max_length=64)
#    description = models.CharField(max_length = 255)

#class ComponentIOTypes(models.Model):
#    name = models.CharField(max_length=64)
#    description = models.CharField(max_length=1024)
#    type = models.IntegerField(blank=True, null=True)
    
    
class WorkflowComponents(models.Model):
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=64)
    category = models.ForeignKey(WorkflowCategories)
    description = models.CharField(max_length = 1024, blank=True, null=True)
    imgurl = models.CharField(max_length = 1024, blank=True, null=True)
    guistring = models.CharField(max_length = 2048, blank=True, null=True)
    serviceurl = models.CharField(max_length = 1024, blank=True, null=True)
    arguments = models.CharField(max_length=1024, null=True)

class Users(models.Model):
    firstname = models.CharField(max_length=255)
    lastname = models.CharField(max_length=255)
    email = models.CharField(max_length=255)
    password = models.CharField(max_length=2048, blank=True, null=True)
    organization = models.CharField(max_length=255, blank=True, null=True)

class Workflows(models.Model):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=1024, blank=True, null=True)
    owner = models.ForeignKey(Users)
    shared = models.BooleanField(default=True)

class WorkflowNodes(models.Model):
    serviceuri = models.CharField(max_length=1024)
    arguments = models.CharField(max_length=1024, null=True)
    subaction = models.CharField(max_length=255, blank=True, null=True)
    datauri = models.CharField(max_length=1024, blank=True, null=True)
    workflow = models.ForeignKey(Workflows)
    component = models.ForeignKey(WorkflowComponents)


class WorkflowEdgeDataTypes(models.Model):
    name = models.CharField(max_length=64)

class WorkflowEdges(models.Model):
    workflow = models.ForeignKey(Workflows)
    sourcenode = models.ForeignKey(WorkflowNodes, related_name='sourcenode')
    targetnode = models.ForeignKey(WorkflowNodes, related_name='targetnode')
    #sourceid = models.CharField(max_length = 255)
    #targetid = models.CharField(max_length = 255)
    datatype = models.ForeignKey(WorkflowEdgeDataTypes, related_name='datatype')
    paralleltype = models.IntegerField(default = 1)
