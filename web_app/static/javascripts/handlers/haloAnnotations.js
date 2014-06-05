/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 * send a list of terms to the SBEAMS halo annotations search page. 
 */

/*
This has the flaw that it can't handle large numbers of genes. You get this error from SBEAMS:

Server message number=8621 severity=17 state=88 line=2 server=TITAN text=Internal Query Processor Error: The query processor ran out of stack space during query optimization. at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/../../lib/perl/SBEAMS/Connection/DBInterface.pm line 958
	SBEAMS::Connection::DBInterface::selectSeveralColumns('SBEAMS::Connection=HASH(0x804cbcc)','\x{a}      SELECT  \x{a}           BS.biosequence_id AS "protein_bios...') called at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/GetHaloAnnotations line 582
	main::handle_request('ref_parameters','HASH(0x8b6ad14)') called at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/GetHaloAnnotations line 132
	main::main() called at /local/wwwSSL/html/sbeams/cgi/ProteinStructure/GetHaloAnnotations line 94
*/


function HaloAnnotations()
{
    handler_base.call(this, "Halo Annotations", true, "handlers/haloAnnotations.js", "http://baliga.systemsbiology.net/halobacterium/");
}

HaloAnnotations.prototype = new handler_base();

HaloAnnotations.prototype.constructor = HaloAnnotations;

/**
 * put a list of search terms in the search box on the Halo
 * annotations page.
 */
HaloAnnotations.prototype.handleNameList = function(namelist) {

    var species = namelist.getSpecies();
    var names = namelist.getData();
	var queryString = cg_util.join(names, "+");

	// https://db.systemsbiology.net/sbeams/cgi/ProteinStructure/GetHaloAnnotations?
	// search_scope=All&SBEAMSentrycode=DF45jasj23jh&protein_biosequence_set_id=2&
	// dna_biosequence_set_id=5&apply_action=QUERY&search_key=VNG7001%20VNG7002

	// construct a URL to search sbeams halo annotations
	var url = "https://db.systemsbiology.net/sbeams/cgi/ProteinStructure/GetHaloAnnotations?"
			+ "search_scope=FullGeneName"
			+ "&SBEAMSentrycode=DF45jasj23jh"
			+ "&protein_biosequence_set_id=2"
			+ "&dna_biosequence_set_id=5"
			+ "&apply_action=QUERY"
			+ "&search_key=" + queryString;

	// open the URL in a new tab
	console.log("HaloAnnotations open tab " + url);
	var iframeid = cg_util.generateUUID();
    cg_util.createIFrame(url, iframeid, ".divResultIFrames", "iframediv", "gaggleiframe");
}

// register website handler
var haloAnnotation = new HaloAnnotations();
