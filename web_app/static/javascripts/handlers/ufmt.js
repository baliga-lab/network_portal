/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */

/**
 *  ufmt
 *
 *  Helper functions for reading data out of HTML microformats.
 */	
var ufmt = {

	/**
	 * trim leading and trailing spaces from a string
	 */
	trim : function(str) {
		return str.replace(/^\s+|\s+$/g,"");
	},
	
	isTagName: function(node, name) {
		return (node && node.tagName && node.tagName==name);
	},


	/**
	 * get all the text contained by a DOM node. NOT recursive.
	 */
	getText: function(node) {
		var txt = "";
		if (node) {
			if (node.nodeType == Node.TEXT_NODE) {
				return node.nodeValue;
			}
			if (node.childNodes) {
				for (var i=0,len=node.childNodes.length; i<len; i++) {
					if (node.childNodes[i].nodeType == Node.TEXT_NODE) {
						txt += node.childNodes[i].nodeValue;
					}
				}
			}
			return txt;
		}
	},


	/**
	 * Gets the text from the first child of node with
	 * a class attribute that has the given value.
	 *
	 * ex: 
	 *   <div class="gaggle-data">
	 *     <p>species=<span class="gaggle-species">Moose</span></p>
	 *     ...
	 *   </div>
	 *
	 * Here, "gaggle-species" is considered a property of the div tag. The value
	 * of the property is the text "Moose".
	 */
	getProperty: function(node, name) {
		return this.getText(this.first(this.getElementsByClassName(node, name)));
	},


	/**
	 * return the first item of a list or array.
	 */
	first: function(a) {
		if (a && a.length && a.length > 0)
			return a[0];
		else
			return null;
	},


	/**
	 * given an html list element (either ol or ul)
	 * return the contents as a list
	 */
	readHtmlList: function(listElement) {
		var listItems = [];
		if (listElement) {
			var listItemElements = listElement.getElementsByTagName("li");
			for (var i=0; i<listItemElements.length; i++) {
				var item = this.getText(listItemElements[i]);
				if (item && item.length > 0)
					listItems.push(item);
			}
		}
		return listItems;
	},


	/**
	 * Return an object holding key/value mappings extracted from an
	 * HTML definition list.
	 */
	readHtmlDl: function(dlElement) {
		var result = {};
		var txt = null;
		if (dlElement) {
			for (var i=0; i<dlElement.childNodes.length; i++) {
				var child = dlElement.childNodes[i];
				if (child.tagName) {
					if (child.tagName=="DT") {
						// if there was a DT with no following DD
						if (txt) {
							result[txt] = null;
						}
						txt = this.getText(child);
					}
					else if (child.tagName=="DD") {
						if (txt) {
							result[txt] = this.getText(child);
							txt = null;
						}
					}
				}
			}
			// in case the last element of the dictionary list was a
			// DT without a DD.
			if (txt) {
				result[txt] = null;
			}
		}
		return result;
	},


	/**
	 * Given an html table element, read the contents into
	 * an array of arrays: table[row][column]. The returned array
	 * can be "ragged" (that is, rows may be of different lengths).
	 */
	readTable: function(tableElement) {
		var table = [];
		if (tableElement) {

			// for each row
			var rows = tableElement.getElementsByTagName("TR");
			for (var i=0; i<rows.length; i++) {
				var row = rows[i];
				table[i] = [];

				// for each table cell
				for (var j=0,k=0; k<row.childNodes.length; k++) {
					if (row.childNodes[k].tagName=="TD" || row.childNodes[k].tagName=="TH") {
						var cell = row.childNodes[k];
						table[i][j++] = this.trim(this.getText(cell));
					}
				}
			}
		}
		return table;
	},


	/**
	 * find the first child element of the given node whose tagName
	 * is in the set of tagNames.
	 */
	findElementByTagName: function(node, tagNames) {
		if (node) {
			for (var i=1; i<arguments.length; i++) {
				if (node.tagName == arguments[i])
					return node;
			}
			for (var i=1; i<arguments.length; i++) {
				var tagName = arguments[i];
				var els = node.getElementsByTagName(tagName);
				if (els && els.length > 0)
					return els[0];
			}
		}
		return null;
	},


	/**
	 * return a list of descendents of the given node that are of a
	 * certain CSS class.
	 */
	getElementsByClassName: function(node, classname) {
		var results = [];
		var re = new RegExp('(^| )' + classname + '($| )');
		var els = node.getElementsByTagName("*");
		for(var i=0,j=els.length; i<j; i++) {
			if(els[i].className && re.test(els[i].className))
				results.push(els[i]);
		}
		return results;
	}

}


