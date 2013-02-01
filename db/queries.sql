-- This is just a place to cut and paste queries so as not to have to type
-- them again. - Chris

-- get gene ids for a bicluster
select gene_id
from biclusters b join biclusters_genes bg on b.id=bg.bicluster_id
where network_id=1 and bicluster_id=2;

-- get genes for bicluster
select g.name, g.common_name
from biclusters b
join biclusters_genes bg on b.id=bg.bicluster_id
join genes g on bg.gene_id=g.id
where network_id=1 and bicluster_id=2;

-- for each pair of genes, count number of biclusters in which they co-occur
select bg1.gene_id, bg2.gene_id, count(*) as cooccurrence
from biclusters_genes bg1
join biclusters_genes bg2 on bg1.bicluster_id = bg2.bicluster_id
where bg1.gene_id < bg2.gene_id
group by bg1.gene_id, bg2.gene_id
order by cooccurrence desc
limit 20;


select f1.name as function, f2.name as subcategory
from networks_function f1 join networks_function_relationships r on f1.id=r.function_id
join networks_function f2 on r.target_id=f2.id where r.type='parent';


select * from networks_function
where id in (
  select function_id from networks_function_relationships
  where type='parent' and target_id=(
    select id from networks_function
    where name='Nucleotide and nucleoside interconversions'
    and type='tigr' and namespace='tigr role'));

delete from networks_function_relationships
  where function_id in (select id from networks_function where type='tigr');

delete from networks_gene_function
  where function_id in (select id from networks_function where type='tigr');
  
delete from networks_function where type='tigr';

delete from networks_function_relationships
  where function_id in (select id from networks_function where native_id='Accession')
  or target_id in (select id from networks_function where native_id='Accession');




# link influences with genes
insert into networks_influence_genes (influence_id, gene_id)
select ni.id, ng.id from networks_influence ni join networks_gene ng on ni.name=ng.name
where ni.type='tf';

insert into networks_influence_genes (influence_id, gene_id)
select ni.id, ng.id from networks_influence ni join networks_gene ng on ng.name = split_part(ni.name, '~~', 1)
where ni.type='combiner';

insert into networks_influence_genes (influence_id, gene_id)
select ni.id, ng.id from networks_influence ni join networks_gene ng on ng.name = split_part(ni.name, '~~', 2)
where ni.type='combiner';


# check for pairs of influence names like A~~B~~OP <-> B~~A~~OP 
select * from networks_influence ni1 join networks_influence ni2 on ni1.name = split_part(ni2.name, '~~', 2) || '~~' || split_part(ni2.name, '~~', 1) || '~~' || split_part(ni2.name, '~~', 3);


# get genes directly regulated by tf DVU3142
select ni.name, bi.bicluster_id
from networks_bicluster_influences bi join networks_influence ni on bi.influence_id=ni.id
where ni.name='DVU3142' and ni.type='tf';

# get genes indirectly regulated by tf DVU3142
select ni.name, bi.bicluster_id
from networks_bicluster_influences bi join networks_influence ni on bi.influence_id=ni.id
where ni.type='combiner' and ni.id in (
  select from_influence_id
  from networks_influence_parts nip join networks_influence ni on nip.to_influence_id=ni.id
  where ni.name='DVU3142');

# get all biclusters (of any network) that are regulated by a given gene
select bi.bicluster_id
from networks_bicluster_influences bi join networks_influence ni on bi.influence_id=ni.id
where (ni.type='tf' and ni.name='DVU3142')
or (ni.type='combiner' and ni.id in (
  select from_influence_id
  from networks_influence_parts nip join networks_influence ni on nip.to_influence_id=ni.id
  where ni.name='DVU3142'));

# get all biclusters of a specific network that are regulated by a given gene
select nb.*
from networks_bicluster nb
     join networks_bicluster_influences bi on nb.id=bi.bicluster_id
     join networks_influence ni on bi.influence_id=ni.id
where nb.network_id=1
and ((ni.type='tf' and ni.gene_id=3127)
  or (ni.type='combiner' and ni.id in (
    select from_influence_id
    from networks_influence_parts nip join networks_influence ni on nip.to_influence_id=ni.id
    where ni.gene_id=3127)));


# find GO terms and their parents
select f.native_id, f.name, f.namespace, f.type, r.id
from networks_function f left join networks_function_relationships r on f.id=r.function_id
where f.type='go' and r.type='parent'
limit 10;

# find top-level GO terms
select f.native_id, f.name, f.namespace, f.type
from networks_function f
where f.type='go' and f.obsolete=false
and f.id not in (select function_id from networks_function_relationships where type='is_a');

# find child terms of a GO term
select f.*
from networks_function f
where f.type='go'
and f.id in (select function_id from networks_function_relationships where type='is_a' and target_id=?)
order by native_id;


select split_part(name, '~~', 1) as regulator_1,
       split_part(name, '~~', 2) as regulator_2,
       split_part(name, '~~', 3) as op
from networks_influence
where position('~~' in name) > 0;


select distinct(u.regulator) from (
  select split_part(name, '~~', 1) as regulator
  from networks_influence
  where type='combiner'

  union

  select split_part(name, '~~', 2) as regulator
  from networks_influence
  where type='combiner'
) as u;



# count biclusters regulated by a transcription factor
select count(distinct(nb.id))
from networks_bicluster nb
     join networks_bicluster_influences bi on nb.id=bi.bicluster_id
     join networks_influence ni on bi.influence_id=ni.id
where nb.network_id=1
and ((ni.type='tf' and ni.gene_id=2074)
or (ni.type='combiner' and ni.id in (
  select from_influence_id
  from networks_influence_parts nip join networks_influence ni on nip.to_influence_id=ni.id
  where ni.gene_id=2074)));

# count genes regulated by a transcription factor
select count(distinct(g.id))
from networks_gene g
join networks_bicluster_genes bg on g.id = bg.gene_id
join networks_bicluster b on b.id = bg.bicluster_id
join networks_bicluster_influences bi on b.id=bi.bicluster_id
join networks_influence i on bi.influence_id=i.id
where b.network_id=1
and ((i.type='tf' and i.gene_id=2074)
or (i.type='combiner' and i.id in (
  select from_influence_id
  from networks_influence_parts ip join networks_influence i on ip.to_influence_id=i.id
  where i.gene_id=2074)));

# add synonyms for halo genes
insert into networks_synonym (target_id, target_type, name, type)
  select id as target_id, 
          'gene' as target_type,
          trim(trailing 'm' from name) as name,
          'vng:m' as type
    from networks_gene
    where species_id=2
    and name like '%m';

insert into networks_synonym (target_id, target_type, name, type) select id as target_id, 'gene' as target_type, 'xxxx' as name, 'vng:7/5' as type from networks_gene where species_id=2 and name = 'yyyy';

# get synonyms for genes in a species
select s.* from networks_synonym s 
join networks_gene g on g.id=s.target_id
where s.target_type='gene'
and g.species_id=2;


# for each bicluster, list genes and their functions
select b.id as bicluster_id, bg.gene_id as gene_id, f.id as function_id
from networks_bicluster b
join networks_bicluster_genes bg on b.id=bg.bicluster_id
join networks_gene_function gf on gf.gene_id=bg.gene_id
join networks_function f on gf.function_id=f.id
where f.type='kegg'
order by bicluster_id, gene_id, function_id
limit 50;

# count genes in each bicluster
select b.id as bicluster_id, count(bg.gene_id) as gene_count
from networks_bicluster b
join networks_bicluster_genes bg on b.id=bg.bicluster_id
group by b.id
order by b.id;

select b.id as bicluster_id, f.id as function_id, count(bg.gene_id) as count
from networks_bicluster b
join networks_bicluster_genes bg on b.id=bg.bicluster_id
join networks_gene_function gf on gf.gene_id=bg.gene_id
join networks_function f on gf.function_id=f.id
where f.type='kegg'
group by b.id, f.id
order by bicluster_id, function_id
limit 50;

# get a count of genes with each functional annotation in the organism
select gf.function_id, count(gf.gene_id)
from networks_gene_function gf
join networks_gene g on g.id = gf.gene_id
where g.species_id = 1 
group by gf.function_id
order by gf.function_id;

select count(distinct(e.gene_id))
from expression e
join networks_bicluster_conditions bc on e.condition_id = bc.condition_id
join networks_bicluster b on b.id = bc.bicluster_id
where b.network_id = 1

# get GO mappings for all genes in an organism
select gf.gene_id, f.native_id
from networks_function f
join networks_gene_function gf on gf.function_id=f.id
join networks_gene g on gf.gene_id=g.id
where g.species_id=1
and f.type='go'
and f.namespace='biological_process';


# get a translation table between kegg pathways and kegg subcategories
select f1.name, f1.type, f1.namespace, fr.type, f2.name, f2.namespace
from networks_function f1
join networks_function_relationships fr on f1.id = fr.target_id
join networks_function f2 on f2.id = fr.function_id
where fr.type='parent'
and f1.type='kegg'
and f1.namespace='kegg subcategory'

select f1.name, f1.type, f1.namespace, fr.type, f2.name, f2.namespace
from networks_function f1
join networks_function_relationships fr on f1.id = fr.target_id
join networks_function f2 on f2.id = fr.function_id
where fr.type='parent'
and f1.type='cog'
and f1.namespace='cog subcategory'
and f1.name != 'General function prediction only'
and f1.name != 'Function unknown'

select f1.id, f1.name
from networks_function f1
join networks_function_relationships fr on f1.id = fr.target_id
join networks_function f2 on f2.id = fr.function_id
where fr.type='parent'
and f2.id = 

select * from networks_function where id in (40535,40616,40751,40753,40775,40797,40892,40905,41177,41240,41287,41288,41296,41412,41838,41895,42021,42073,42093,42124,42206,42207,42210,42323,42891,42953,43063);


# get biclusters with significant enrichment for the kegg subcategory 'cellular motility'
select b.id as bicluster_id, b.k as bicluster_k, f.type, f.namespace, f.native_id, f.name, bf.gene_count, bf.k, bf.p_bh
from networks_bicluster_function bf
join networks_function f on bf.function_id=f.id
join networks_bicluster b on b.id=bf.bicluster_id
where f.name ilike '%motil%'
and f.namespace='kegg subcategory'
and bf.p_b < 0.05
and b.network_id=1;


# how many conditions are there for a species?
select count(distinct(condition_id)) from expression where gene_id in (select id from networks_gene where species_id=1);

# get conditions as a table

# extract expression matrix
# 1) get full list of genes (data may conceivable be sparse - some genes missing for a given condition - although shouldn't be currently)
create temporary table temp_genes ( gene_id integer );
insert into temp_genes select distinct(gene_id) from expression where condition_id in (1,2,3,4,5) order by gene_id;
# 2) select several columns in the matrix
select tg.gene_id, e.value
from temp_genes tg left join expression e on tg.gene_id=e.gene_id
where e.condition_id in (1,2,3,4,5)
oeder by tg.gene_id;
# 3) select a column
select tg.gene_id, e.value
from temp_genes tg left join expression e on tg.gene_id=e.gene_id
where e.condition_id = 1
order by tg.gene_id;
# 4) ditch the temporary table
drop table temp_genes;


# find mismarked influences - genes that are mismarked as EF's 'cause the gene
# name is not the standard gene name
update networks_influence
set gene_id = s.target_id, type='tf'
from networks_synonym s
where networks_influence.name = s.name
and s.target_type='gene';

# find influences who's name is a synonym (rather than a canonical name)
select *
from networks_influence i join networks_synonym s on i.name = s.name;

# get all influence for network id 3
select distinct(i.name)
from networks_influence i
  join networks_bicluster_influences bi on i.id=bi.influence_id
  join networks_bicluster b on bi.bicluster_id=b.id
where b.network_id=3;

select distinct(n.name) from
(select distinct(i.name)
from networks_influence i
  join networks_bicluster_influences bi on i.id=bi.influence_id
  join networks_bicluster b on bi.bicluster_id=b.id
where b.network_id=3
and i.type!='combiner'
union
select substring(i.name from '.*~~(.*)~~.*') as name
from networks_influence i
  join networks_bicluster_influences bi on i.id=bi.influence_id
  join networks_bicluster b on bi.bicluster_id=b.id
where b.network_id=3
and i.type='combiner'
union
select substring(i.name from '(.*)~~.*~~.*') as name
from networks_influence i
  join networks_bicluster_influences bi on i.id=bi.influence_id
  join networks_bicluster b on bi.bicluster_id=b.id
where b.network_id=3
and i.type='combiner') as n
order by n.name;


-- get GO annotations for a gene
select g.id, g.name, f.native_id
from networks_gene g
  join networks_gene_function gf on g.id=gf.gene_id
  join networks_function f on gf.function_id=f.id
where 
f.type='go' and f.namespace='biological_process'
and g.species_id=1
and g.name='DVU0443';


-- select GO annotations for a bicluster
select b.id, f.native_id, bf.gene_count, bf.m, bf.k, bf.p, bf.p_bh, bf.method
from
  networks_function f
  join networks_bicluster_function bf on bf.function_id=f.id
  join networks_bicluster b on bf.bicluster_id=b.id
where
  f.type='go'
  and bf.p_bh <= 0.05
  and b.network_id=1
order by b.id, f.id;

-- show duplicate function annotations
select f.id, f.native_id, foo.*
from networks_function f join
  (select gene_id, function_id, count(id) as c from networks_gene_function group by gene_id,function_id) as foo on f.id=foo.function_id
where foo.c > 1 order by f.native_id;

-- find duplicate GO annotatons
select gf.id, foo.* from networks_gene_function gf join
(select gene_id, function_id, count(id) as c from networks_gene_function group by gene_id,function_id) as foo
on gf.gene_id=foo.gene_id and gf.function_id=foo.function_id
where foo.c > 1


-- count genes that have duplicate entries for GO annotations (caused by synonyms)
select b.id as bicluster_id, f.id as function_id, count(distinct(bg.gene_id)) as count
from networks_bicluster b
join networks_bicluster_genes bg on b.id=bg.bicluster_id
join networks_gene_function gf on gf.gene_id=bg.gene_id
join networks_function f on gf.function_id=f.id
where b.network_id = 1
and f.type='go'
group by b.id, f.id
order by b.id, f.id;



-- delete GO annotations 
delete from networks_bicluster_function where method='hypergeometric' and function_id in (select id from networks_function where type='go');
vacuum;



-- get genes in a network that are in some network
select distinct(bg.gene_id)
from networks_bicluster_genes bg
join networks_bicluster b on b.id = bg.bicluster_id
where b.network_id=1
order by bg.gene_id;

-- count genes in each bicluster for a network
select b.id as bicluster_id, count(distinct(bg.gene_id)) as gene_count
from networks_bicluster b 
join networks_bicluster_genes bg on b.id=bg.bicluster_id
where b.network_id = 1
group by b.id
order by b.id;


-- get functions for biclusters
select b.id as bicluster_id, bf.function_id, f.namespace, f.native_id, bf.method
from networks_bicluster b 
join networks_bicluster_function bf on b.id=bf.bicluster_id
join networks_function f on f.id=bf.function_id
where b.network_id = 1
and f.type='go'
and bf.method='topgo'
order by b.id;

-- what types of annotations exist for a network
select distinct(f.type)
from networks_bicluster b 
join networks_bicluster_function bf on b.id=bf.bicluster_id
join networks_function f on f.id=bf.function_id
where b.network_id = 4;

-- do we have higher levels of the GO hierarchy?
select b.id as bicluster_id, bf.function_id, f.namespace, f.native_id
from networks_bicluster b 
join networks_bicluster_function bf on b.id=bf.bicluster_id
join networks_function f on f.id=bf.function_id
where b.network_id = 1
and f.type='go'
and f.id not in 
 (select distinct(f.id) from networks_gene_function gf join networks_function f on f.id=gf.function_id join networks_gene g on g.id=gf.gene_id where g.species_id=1)
order by b.id;

-- get functional annotations for a bicluster
select b.id as bicluster_id, bf.function_id, f.namespace, f.native_id
from networks_bicluster b 
join networks_bicluster_function bf on b.id=bf.bicluster_id
join networks_function f on f.id=bf.function_id
where b.network_id = 1
and f.type='go'
order by b.id;

-- find screwed up enrichments
select * from networks_bicluster_function bf join networks_function f on bf.function_id=f.id where gene_count > k;
select count(*) from networks_bicluster_function bf join networks_function f on bf.function_id=f.id where gene_count > k and bf.method='hypergeometric2';

select count(*)
from networks_bicluster_function bf join networks_function f on bf.function_id=f.id
where f.type='cog' and f.namespace='cog' and bf.method='hypergeometric2';

(select bf.bicluster_id, bf.function_id
from networks_bicluster_function bf join networks_function f on bf.function_id=f.id
where f.type='kegg' and f.namespace='kegg pathway' and bf.method='hypergeometric2')
except
(select bf.bicluster_id, bf.function_id
from networks_bicluster_function bf join networks_function f on bf.function_id=f.id
where f.type='kegg' and f.namespace='kegg pathway' and bf.method='hypergeometric')
order by bicluster_id;

select distinct(bf.bicluster_id, bf.function_id)
from networks_bicluster_function bf join networks_function f on bf.function_id=f.id
where f.type='kegg' and f.namespace='kegg pathway' and bf.method='hypergeometric2'

select distinct(type,namespace) from networks_function;

(select id from function where namespace in ('cog category', 'cog subcategory', 'kegg category', 'kegg subcategory'))

select bf.*, bf2.gene_count, bf2.m, bf2.n, bf2.k, bf2.p
from networks_bicluster_function bf
  join networks_bicluster_function bf2
  on bf.bicluster_id=bf2.bicluster_id and bf.function_id=bf2.function_id
  join networks_function f
  on bf.function_id=f.id
where bf.method='hypergeometric' and bf2.method='hypergeometric2'
and f.namespace='kegg pathway'

select bf.*, bf2.gene_count, bf2.m, bf2.n, bf2.k, bf2.p
from networks_bicluster_function bf
  join networks_bicluster_function bf2
  on bf.bicluster_id=bf2.bicluster_id and bf.function_id=bf2.function_id
  join networks_function f
  on bf.function_id=f.id
where bf.method='hypergeometric' and bf2.method='hypergeometric2'
and f.namespace='kegg pathway'

select bg.gene_id, gf.function_id
from networks_bicluster b 
  join networks_bicluster_genes bg on b.id=bg.bicluster_id
  join networks_gene_function gf on bg.gene_id=gf.gene_id
  join networks_function f on f.id=gf.function_id
where b.id=873
  and f.namespace='kegg pathway';

select count(*)
from networks_bicluster_function bf
  join networks_function f on f.id=bf.function_id
where f.namespace='kegg pathway'
  and bf.gene_count>1;



