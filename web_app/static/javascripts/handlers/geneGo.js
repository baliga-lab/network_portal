/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

var target_ids=[];
var url='';
var el='';
var results=[];
var genegolist_ids=[];
var completeNetwork = javaFiregooseLoader.createNetwork();

FG_trace("starting...");
dump("here we are working...\n");

/**
 * constructor.
 */
function GeneGO() {

};

dump("here we are working... 1\n");

/**
 * check the given doc to see if we can parse it.
 */
GeneGO.prototype.recognize = function(doc) {
	if (doc) {
		url = doc.location.href;
		if (url.indexOf("http://portal.genego.com/")>=0){
			return true;
		}
		else if (url.indexOf("http://portal.genego.com/cgi/set_genes.cgi?do_action=view_gene")>=0){
			return true;
		}
		else if (url.indexOf("http://portal.genego.com/cgi/regulation/regulation_info.cgi?")>=0){
			return true;
		}

		else if (url.indexOf("http://portal.genego.com/cgi/network/net_net.cgi?")>=0){
			return true;
		}		
		else if (url.indexOf("http://portal.genego.com/cgi/regulation/regulation_search.cgi?")>=0){
			return true;
		}
		else{
			return true;
		}
	}
	else {
		return false;
	}
};

dump("here we are working... 2 \n");

/**
 * open the website in a browser tab
 */
GeneGO.prototype.show = function(url) {
	var newTab = getBrowser().addTab(url);
	getBrowser().selectedTab = newTab;
};

dump("here we are working... 3 \n");

/**
 * retrieve the data from the manager interface.
 */
GeneGO.prototype.getPageData = function(doc) {
	dump("getPageData\n");
	var species = "Human";
	var names=[7157, 4193,4436];
	results.push(
	new FG_GaggleData(
	"Test list",
	"NameList",
	names.length,
	species,
	names));
	//datamanager view
	//offers complete network and genelist
	if (url.indexOf("http://portal.genego.com/cgi/set_genes.cgi?do_action=view_gene")>=0 || url.indexOf("http://portal.genego.com/cgi/regulation/regulation_search.cgi?")>=0) {
		var genegolist_ids=[];
		results.splice(0,results.length);
		dump("manager page\n");
		var completeNetworkData = new FG_GaggleData(
	    "Complete network",
	    "Network",
	    null,
		species,
		null);
		var document = window.content.document;
		if (url.indexOf("http://portal.genego.com/cgi/set_genes.cgi?do_action=view_gene")>=0){
			var table=document.getElementById('genes_list_table');
		}
		else{
			var table=document.getElementById('selected_table');
		}
		var arr=table.getElementsByTagName('input');
		for (i=0; i<arr.length; i++){
			var el=arr[i];
			if (el.value!==''){
		    	genegolist_ids.push(el.value);
			}
		}
	}	
		dump(genegolist_ids);	
	//network view should support the completeNetwork too but it needs an alternative way to get the starting ids
	if (url.indexOf("http://portal.genego.com/cgi/regulation/regulation_search.cgi?")>=0){
		completeNetworkData.isAsynch = true;
		completeNetworkData.genego = this;
		results.push(completeNetworkData);
		completeNetworkData.asynchronouslyFetchData = function(callback) {
			dump("asynchronous callback\n");
			if (!this._data){
				this._callback = callback; 
				this.genego.buildNetwork(completeNetworkData, genegolist_ids);
			}
		}
	}	
	//network view
	//offer rendered network
	if (url.indexOf("http:\/\/portal.genego.com/cgi/network/net_net.cgi?")>=0){
		var filteredNetworkData = new FG_GaggleData(
	    "Filtered network",
	    "Network",
	    null,
		species,
		null);
		filteredNetworkData.isAsynch = true;
		filteredNetworkData.genego = this;
		results.push(filteredNetworkData);
		filteredNetworkData.asynchronouslyFetchData = function(callback) {
			dump("asynchronous callback\n");
			if (!this._data) {
				this._callback = callback; 
				this.genego.captureNetwork(filteredNetworkData, url+"&xml=1");
			} 
		}
	}	
	return results;
};

dump("here we are working... 4 handleNameList\n");

//handleNamelist
GeneGO.prototype.handleNameList = function(species, names) {
	var request1 = new XMLHttpRequest();
	// define the callback that will run when the request completes
	request1.onreadystatechange = function() {
		var translated_names=request1.responseText;
		if (request1.readyState == 4) {	
			if (request1.status == 200) {
				show("http://portal.genego.com/cgi/regulation/regulation_search.cgi?selected_ids="+translated_names);
			}
		}
	};
	var url="http://sdee.t1dbase.org/cgi-bin/gaggle_translator.cgi/mode/1/ids/"+names.join(',');
	FG_trace(url);
	request1.open("GET", url);
	request1.setRequestHeader("User-Agent", "XMLHttpRequest");
	request1.setRequestHeader("Accept-Language", "en");
	request1.send(null);
};

dump("here we are working... 5 captureNetwork\n");

//captureNetwork
GeneGO.prototype.captureNetwork = function(filteredNetworkData, url) {
	FG_trace("captureNetwork");
	FG_trace(url);
	var request1 = new XMLHttpRequest();
	// define the callback that will run when the request completes
	request1.onreadystatechange = function() {
		if (request1.readyState == 4) {
			if (request1.status == 200) {
				FG_trace(request1.responseXML);
				var xml=request1.responseXML;
				FG_trace(xml);
				//convert node ids
				//match original array with translated array
				var nodes=xml.evaluate("//node", xml, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				FG_trace(nodes);
				
				var edges=xml.evaluate("//edge", xml, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				FG_trace(edges);
				//eliminate need for passing xml?
				filteredNetworkData.genego.buildFilteredNetwork(filteredNetworkData, nodes, edges, xml);
				if (gaggleData._callback()) {
					gaggleData._callback();
				}
				else
				{
					gaggleData.genego._requestFailed(request);
				}
			}
		}
		else {
			return null;
		}
	};
	request1.open("GET", url);
	request1.setRequestHeader("User-Agent", "XMLHttpRequest");
	request1.setRequestHeader("Accept-Language", "en");
	request1.send(null);
};


dump("here we are working... 6 buildFilteredNetwork\n");

//translate GeneGO_ids from filtered network and creates a network object
GeneGO.prototype.buildFilteredNetwork = function(filteredNetworkData, nodes, edges, xml) {
	FG_trace("buildFilteredNetwork");
	var request2 = new XMLHttpRequest();
	request2.onreadystatechange = function() {
		if (request2.readyState == 4) {
			if (request2.status == 200) {
				//construct translation table
				FG_trace(request2.responseText);
				FG_trace("node ids: " + node_ids);
				var translated_ids=request2.responseText.split(',');
				FG_trace("translated ids: " + translated_ids);
				var translation=new Array();
				for (i=0;i<node_ids.length;i++) {
					FG_trace(node_ids[i].toString()+"->"+translated_ids[i]);
					translation[node_ids[i].toString()]=translated_ids[i];
					FG_trace("result: " + translation[node_ids[i].toString()]);
				}
				FG_trace("translation table");
				FG_trace(translation);
				// build network
				var filteredNetwork = javaFiregooseLoader.createNetwork(); 
												
				var edgeElement = edges.iterateNext();
				while (edgeElement !== null) {
					var edge = new Object();
					// FG_trace("edge");
					edge.source = (xml.evaluate("@src", edgeElement, null, XPathResult.NUMBER_TYPE, null)).numberValue;
					// FG_trace("source"+edge.source);
					edge.target = (xml.evaluate("@dst", edgeElement, null, XPathResult.NUMBER_TYPE, null)).numberValue;
					// FG_trace("target"+edge.target);
					FG_trace("source: " + edge.source + "target: " + edge.target);
					edge.translated_source=translation[edge.source.toString()];
					edge.translated_target=translation[edge.target.toString()];
					FG_trace("translated");
					FG_trace(edge.translated_source);
					FG_trace(edge.translated_target);
					if (edge.translated_source!="0" && edge.translated_target!="0") { 
						FG_trace("true");
						FG_trace("source: "+edge.translated_source+", "+"target: "+edge.translated_target);
						// if both translated not zero		
						interaction = javaFiregooseLoader.createInteraction(edge.translated_source, edge.translated_target, "group");
						filteredNetwork.add(interaction);
					}
					edgeElement = edges.iterateNext();
				}
				FG_trace(filteredNetwork);
				filteredNetworkData._data = filteredNetwork;
				if (filteredNetworkData._callback()){
					filteredNetworkData._callback();
				}
				else {
					gaggleData.genego._requestFailed(request);
				}
			}
		}
		else {
			return null;
		}
	};
	var nodeElement = nodes.iterateNext();
	//collect networkobj_ids from nodes
	var node_ids= new Array();
	while (nodeElement != null) {
		var node = new Object();
		FG_trace("node");
		var node_value=(xml.evaluate("@id", nodeElement, null, XPathResult.NUMBER_TYPE, null)).numberValue
		if (node_value!==NaN){
			node_ids.push(node_value);
		}
		nodeElement = nodes.iterateNext();
	}
	FG_trace("translate url");
	var translate_nodes_url="http://sdee.t1dbase.org/cgi-bin/gaggle_translator.cgi/mode/3/ids/"+node_ids.join(',');
	FG_trace(translate_nodes_url);
	request2.open("GET", translate_nodes_url);
	request2.setRequestHeader("User-Agent", "XMLHttpRequest");
	request2.setRequestHeader("Accept-Language", "en");
	request2.send(null);
};

dump("here we are working... 7 buildNetwork\n");

//build complete network
GeneGO.prototype.buildNetwork=function(completeNetworkData, genegolist_ids){
	FG_trace("buildNetwork");
	var request1 = new XMLHttpRequest();

	for (i=0;i<genegolist_ids.length;i++){
		var network_id=genegolist_ids[i];
		completeNetworkData.genego.getIxnData(completeNetworkData, network_id);
	}	

	var final_url="http://portal.genego.com/cgi/network/network.cgi?node_id="+genegolist_ids.join(",");
	FG_trace(final_url);
	var newTab = getBrowser().addTab(final_url);
	
	completeNetworkData._data = completeNetwork;

	if (completeNetworkData._callback()){
		completeNetworkData._callback();
	}
	else
	 {
		gaggleData.genego._requestFailed(request);
	}
};


dump("here we are working... 8 getIxnData\n");

GeneGO.prototype.getIxnData = function(completeNetworkData, network_id) {
	dump("getIxnData\n");
	//need to form url from translated id
	// var url = "http://portal.genego.com/cgi/regulation/regulation_info.cgi?id=1075";
	//need loop for gene_ids
	// var url = "http://portal.genego.com/cgi/regulation/regulation_info.cgi?id=2942";
	// var url = doc.location.href;
	//this is probably redundant since we can get the DOM directly from the gene page if we're already there

	var request2 = new XMLHttpRequest();

	// define the callback that will run when the request completes
	request2.onreadystatechange = function() {
		if (request2.readyState == 4) {
			if (request2.status == 200) {			
				dump(request2.responseText);
				completeNetworkData.genego.parseIxnData(request2.responseText, network_id);
			}
		}
		else{
			return null;
		}
		
	}
	
	// alert(network_id);
	var network_url="http://portal.genego.com/cgi/regulation/regulation_info.cgi?id="+network_id;
	
	dump(network_url);
	
	
	request2.open("GET", network_url);
	request2.setRequestHeader("User-Agent", "XMLHttpRequest");
	request2.setRequestHeader("Accept-Language", "en");
	request2.send(null);
};

dump("here we are working... 9 parseIxnData\n");


GeneGO.prototype.parseIxnData=function(text, network_id){

	dump("parseIxnData\n");
	dump(text);
	dump(network_id);
	var request3 = new XMLHttpRequest();
	
	var request3 = new XMLHttpRequest();
	// define the callback that will run when the request completes
	request3.onreadystatechange = function() {
		if (request3.readyState == 4) {
			if (request3.status == 200) {
				dump(request3.responseText);
				updateNetwork(request3.responseText);
			}
		}
		else{
			return null;
		}
	}
	
	dump("parseIxnData\n");
	dump(text);
	//regex to extract array from text
	re = new RegExp("TREE_ITEMS\\s=\\s\\[\\s*(.|\\s)*?(\\],\\s){4}\\s*\\]\\s*\\];");
	m = text.match(re);
	// alert(m);
	dump("TREE_ITEMS: \n");
	dump(m);
	// dump("test point: " + m);
	var interactors=[];
	interactors=parse_ixns(m);
	var source_id=network_id;
	dump("source id\n");
	dump(source_id); 
	//getting source_id from genelist page instead of indv pages
	interactors.splice(0,0,source_id);
	interactors_string=interactors.join(",");
	url="http://sdee.t1dbase.org/cgi-bin/gaggle_translator.cgi/mode/3/ids/"+interactors_string;
	request3.open("GET", url);
	request3.setRequestHeader("User-Agent", "XMLHttpRequest");
	request3.setRequestHeader("Accept-Language", "en");
	request3.send(null);
};

dump("here we are working... 10\n");

updateNetwork=function(id_string){
	dump("updateNetwork\n");
	var ids=[];
	ids=id_string.toString().split(",");
	dump(ids);
		//place source id in beginning of string to translate
		var source=ids.shift();
		dump("source\n");
		dump(source);
		for (i=1;i<ids.length;i++){
			//if id couldn't be translated
			if (ids[i]!=0){
				interaction = javaFiregooseLoader.createInteraction(source, ids[i], "group");
				completeNetwork.add(interaction);
			}
		}
	// alert("iterating"+completeNetwork);
	dump("iterating"+completeNetwork);
};

dump("here we are working... 11\n");


function parse_ixns(arr_string){
	dump("parse_ixns\n");
	dump(arr_string);
	ixn_partners=[];
	// re = new RegExp("(\\w|-|\\s)+\\s\\[\\d{1,2}\\]","g");
	re = new RegExp("(\\w|-|\\s)+\\s\\[\\d{1,2}\\]',\\s'-*\\d*'","g");
	if (arr_string){
		dump("arr_string: " + arr_string);
		m = arr_string.toString().match(re);
		// m=re.exec(arr_string);
		for (i=0; i<m.length; i++){
		// re2=new RegExp("((\\w|-|\\s)*)");
			re2=new RegExp("'(-*\\d*)'");
			n=m[i].match(re2);
			ixn_partners.push(n[1]);
		}
		dump(ixn_partners);
		}
	return ixn_partners;
};


function fetch_source_id(){
	re = new RegExp("id=(-*\\d*)");
	m=url.match(re);
	dump("source id\n");
	dump(m);
	return m[1];
};

dump("here we are working... 12 register GeneGo\n");

// create and register a websiteHandler
FG_addWebsiteHandler("GeneGO", new GeneGO());

dump("finished!!! It worked!\n");


