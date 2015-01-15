import urllib2
import urllib
import json


def make_query_string(q):
    return '+'.join([urllib.quote(comp.encode('utf-8')) for comp in q.split(' ')])

def solr_search(baseurl, q, max_results=10000):
    """We send our query directly to Solr without going through the sunburnt library.
    Sunburnt creates funny query strings which can lead to less than optimal results.
    """
    query_string = make_query_string(q)
    response = urllib2.urlopen(baseurl, 'wt=json&rows=%d&q=%s' % (max_results, query_string))
    resp = json.loads(response.read())['response']
    start = resp['start']
    num_found = resp['numFound']
    docs = resp['docs']
    return docs
