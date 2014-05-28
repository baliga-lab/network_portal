/*
 * Copyright (C) 2007 by Institute for Systems Biology,
 * Seattle, Washington, USA.  All rights reserved.
 *
 * This source code is distributed under the GNU Lesser
 * General Public License, the text of which is available at:
 *   http://www.gnu.org/copyleft/lesser.html
 */


var WEBHANDLERS_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // Update after 24 hour
//var GAGGLE_SERVER = "http://localhost:8000";
var GAGGLE_SERVER = "http://networks.systemsbiology.net";
var GAGGLE_HOME = "http://gaggle.systemsbiology.net";
var BOSS_JNLP = GAGGLE_SERVER + "/static/jnlp/boss.jnlp";
var HTTPBOSS_ADDRESS = "http://localhost:8082/";
var WEBHANDLER_BASEURL = GAGGLE_SERVER + "/static/javascripts/handlers/";
var OPENCPU_SERVER = "http://10.10.3.175/ocpu";

var cg_util = {

startBoss: function() {
    window.open(BOSS_JNLP);
},

bossStarted: function(callback) {
    console.log("Verifying if boss has started...");
    cg_util.urlExists(HTTPBOSS_ADDRESS, function(status){
        if(status == 200){
           // file was found
           callback(true);
        }
        else if(status == 404 || status == 0){
           // 404 not found
           callback(false);
        }
    });
},


// Retrieve data from storage
retrieveFrom: function(key, url, callback) {
    console.log("Retrieving " + key + " from " + url);

    try {
        var dataobj = {};
        var result = null;

        chrome.storage.local.get(key, function(items) {
            $.each(items, function(k, value) {
                if (value != null && value['code'] != null
                    && (Date.now() - value['lastUpdated'] <= WEBHANDLERS_UPDATE_INTERVAL))
                   result = value['code'];
            });

            //alert(result);
            //if (result == null || result == undefined)
            {
                // Get updated file, and if found, save it.
                cg_util.getFileFromUrl(url, function(downloadedcode) {
                    //console.log("Received code: " + downloadedcode);
                    if (!downloadedcode) return;
                    console.log("Save code to " + key);
                    var obj = {}
                    obj[key] = {lastUpdated: Date.now(), code: downloadedcode}
                    chrome.storage.local.set(obj);
                    if (callback != null)
                        callback(downloadedcode);
                });
            }
            //else if (callback != null) // Cached data is available, use it
            //    callback(result);
        });
    }
    catch (e) {
        console.log("Failed to retrieve code " + e);
    }
},

createIFrame: function(url, containerId, divClass, iframeClass) {
    if (containerId != null && url != null) {
        var div = document.createElement("div");
        div.className = divClass;
        var iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.className = iframeClass;
        div.appendChild(iframe);
        $(containerId)[0].appendChild(div);
        $("." + divClass).draggable(
        {
        });
        $("." + divClass).resizable({
            alsoResize : iframeClass
        });
    }
},


checkHandlerData: function (handler, processDataFunc) {
    if (handler == null)
        return;

    var url = document.location.href;
    if (url.indexOf(handler.getPageUrl()) >= 0)
    {
        // Ask the background page for data to be processed
        console.log(handler.getName() + ": Retrieving data from event page...");
        try {
            var msg = new Message(MSG_FROM_CONTENT, chrome.runtime, null, MSG_SUBJECT_RETRIEVEDATA,
                                 {handler: handler.getName()}, processDataFunc);
            msg.send();
        }
        catch (e) {
            console.log(handler.getName() + " failed to send message to event page: " + e);
        }
    }
},

getActiveTab: function(callback) {
    chrome.tabs.query({
          active: true,
          currentWindow: true
      }, function(tabs) {
          /* ...and send a request for the DOM info... */
          if (callback != null)
             callback(tabs[0]);
      });
},

openNewTab: function(url, callback) {
    var newURL = url;
    chrome.tabs.create({ url: newURL }, function(tab) {
        if (callback != null)
            callback(tab);
    });
},

injectJavascriptToTab: function(tabid, scripturl, callback) {
    console.log("Injecting javascript " + scripturl + " to tab " + tabid);
    chrome.tabs.executeScript(tabid, {file: scripturl}, function(result){
        if (callback != null) {
            callback(result);
        }
    });
},

injectCodeToTab: function(tabid, jcode, callback) {
    console.log("Injecting javascript code " + jcode + " to tab " + tabid);
    chrome.tabs.executeScript(tabid, {code: jcode}, function(result) {
        if (callback != null) {
            callback(result);
        }
    });
},

injectJavascript: function(scripturl, callback) {
    if (scripturl == null)
        return;

    console.log("Injecting " + scripturl + " to page...");
    var s = document.createElement('script');
    s.src = chrome.extension.getURL(scripturl);
    s.onload = function() {
        if (callback != null) {
            console.log("Call callback function...");
            callback();
        }
    };
    (document.head||document.documentElement).appendChild(s);
},

injectCode: function(code, callback) {
    console.log("Injecting code: " + code);
    if (code != null) {
        var script = document.createElement('script');
        script.textContent = code;
        (document.head||document.documentElement).appendChild(script);
        if (callback != null)
            callback();
    }
},


generateUUID: function() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
},

findDataByGuid: function(dataarray, guid) {
    console.log("Searching data by GUID " + guid);
    if (dataarray == null || guid == null)
        return null;

    for (var i = 0; i < dataarray.length; i++) {
        var data = dataarray[i];
        if (data != null && data.jsondata != null) {
            var pagedataobj = JSON.parse(data.jsondata);
            var dataguid = pagedataobj["guid"];
            if (guid == dataguid) {
                return data;
            }
        }
    }
    return null;
},

/**
 * strip off leading and trailing whitespace from a string
 */
trim: function (sInString) {
  sInString = sInString.replace( /^\s+/g, "" );// strip leading
  return sInString.replace( /\s+$/g, "" );// strip trailing
},



/**
 * Join the elements to a delimited string. There is a native
 * javascript join function, but this one works on java arrays
 * and javascript arrays too.
 */
join: function (items, delimiter) {
	var queryString = "";
	if (items.length > 0) {
		queryString += items[0];
	}
	for (var i=1; i<items.length; i++) {
		queryString += delimiter;
		queryString += items[i];
	}
	return queryString;
},



/**
 * log a message to the javascript console
 */
trace: function (msg) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
},


/**
 * Returns true if the string starts with the
 * prefix. Returns false otherwise.
 */
startsWith: function(string, prefix) {
	if (string.length >= prefix.length) {
		if (string.substring(0,prefix.length) == prefix)
			return true;
	}
	return false;
},

objectToString: function(o) {
	var first = true;
	var str = "{";
	for (var i in o) {
		if (first)
			first = false;
		else
			str += ", ";
		str += i + ":" + o[i];
	}
	str += "}";
	return str;
},

// Typically run within a few milliseconds
executeCode: function (code) {
    try
    {
        if (code != null) {
            console.log("Executing code...");
            window.eval(code);
        }
    }
    catch (e)
    {
        console.error("Failed to execute code: " + e);
    }
},

urlExists: function(url, callback){
    console.log("Checking url exists: " + url);
    try {
        jQuery.ajax({
            url:      url,
            dataType: 'text',
            type:     'GET',
            complete:  function(xhr){
                console.log("ajax completed " + xhr.status);
                if (callback != null)
                   callback(xhr.status);

            }
        });
    }
    catch (e) {
        alert(e);
    }
},

getFileFromUrl: function (url, callback) {
    console.log("Downloading file from " + url);
    try {
        var x = new XMLHttpRequest();
        x.onload = x.onerror = function()
        {
            if (callback != null)
                callback(x.responseText);
        };
        //alert("Open url");
        x.open('GET', url);
        //alert("Send request " + url);
        x.send();
    }
    catch(e) {
        //alert(e);
        console.log("Failed to access url " + e);
        if (callback != null) {
            callback("error");
        }
    }
},

httpGet: function(theUrl, callback)
{
    //alert("Http Get " + theUrl);
    var xmlHttp = null;
    try {
        xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                if (callback != null)
                    callback(xmlHttp.responseText);
            }
        };

        xmlHttp.open( "GET", theUrl, true );
        xmlHttp.send( null );
        return xmlHttp.responseText;
    }
    catch (e) {
        console.log("HTTP Get failed: " + e);
    }
},

doGet: function(url, data, datatype, successCallback) {
    //alert("Get: " + url);
    try {
        $.get(url, data,
            //dataType: datatype,
            function(result, textStatus, jqXHR){
                //alert("ajax completed " + result["0"]);
                if (successCallback != null)
                   successCallback(result);
            },
            datatype
        );
    }
    catch (e) {
        alert(e);
    }
},

doPost: function(url, data, contentType, dataType, callback) {
    $.ajax({
      type: "POST",
      contentType: contentType,
      url: url,
      data: data,
      success: callback,
      dataType: dataType
    });
}

}