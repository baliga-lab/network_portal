// Workflow logic
var wfcnt = 0;
var currWorkflowID = "";
var sourceWFEndpointOptions = {
    anchor: "RightMiddle",
    endpoint: "Dot",
    isSource: true,
    maxConnections: -1,
    connector: "StateMachine",
    connectorStyle: { strokeStyle: "#666" },
    connectorOverlays: [
			    ["Arrow", { width: 5, length: 15, location: 1, id: "arrow"}],
			    ["Label", {label:"data", location:0.25, id: "connlabel"}]
            ]
};

var targetWFEndpointOptions = {
    anchor: "LeftMiddle",
    endpoint: "Rectangle",
    paintStyle: { width: 8, height: 10, fillStyle: '#666' },
    maxConnections: -1,
    connector: "StateMachine",
    isTarget: true
    //connectorStyle: { strokeStyle: "#666" },
};

$(document).ready(function () {
    $('.component').draggable({
        helper: 'clone'
    });

    $('.workflowcomponent').draggable({
        containment: "parent",
        helper: "original"
    });

    $('#workflowcanvas').droppable({
        drop: componentDropEvent
    });

});

function LoadHTML() {
    alert($("#htmlLoader").attr('value'));
    ifrm = document.createElement("IFRAME");
    ifrm.setAttribute("id", "ifrmGaggleData");
    ifrm.setAttribute("src", $("#htmlLoader").attr('value')); 
    ifrm.style.width = 640+"px"; 
    ifrm.style.height = 480+"px"; 
    //var ul = ($("#divWorkflow").children())[0]; // TODO use jquery to get the ul
            
    $("#divHTMLResult").append(ifrm);
    //document.body.appendChild(ifrm); 
}

function FilterHTML() {
    alert("Filtering...");
    var myIFrame = document.getElementById('ifrmGaggleData');
    alert(myIFrame.contentDocument);
    doc = myIFrame.contentDocument;
    alert(doc.getElementsByTagName("*"));    
    gaggleMicroformatHandler = new FG_GaggleMicroformatHandler;
    alert(gaggleMicroformatHandler);
    //if (gaggleMicroformatHandler.recognize(doc) && 
    alert("Filtered");
    alert(results);
}

function on_socket_get(message) {
    document.getElementById('result').innerHTML += message;
}


// Initialize the workflow canvas and reset the current workflow ID
function InitializeWorkflow()
{
    ClearWorkflowCanvas();
    CurrWorkflowID = "";
}

// Callback when a connection is established between two UI components
function ConnectionEstablished(connection) {
    //alert(connection.source);
    // show the connector type selection dialog

    // select all the connections between source and destination
    //var srcid = $(info.source).attr('id');
    //var targetid = $(info.target).attr('id');
    //alert(srcid);
    //var connections = jsPlumb.getConnections({scope: [source: srcid, target: targetid]});
    //var numconnections = connections.length;
    //alert(connections.length + " connections between " + srcid + " and " + targetid);
    //var overlays = connection.getOverlays();
    //alert(overlays.length);
    //for (var i = 0; i < overlays.length; i++)
    //{
    //    alert($(overlays[i]).attr("class"));

    //    var guid = jQuery.guid++;
    //    alert(guid);
    //    $(label).attr("id") = guid;
    //    alert(label.id);
    //    $(label).click(function(event) {
    //       var label = event.target;
    //       label.html("<input type='text' />");
    //    });
    //}
}

function componentDropEvent(ev, component) {
    //alert($(component.draggable).attr("class"));
    var originalclass = $(component.draggable).attr("class");
    if (originalclass != undefined && originalclass.indexOf("ui-dialog") >= 0)
        return;
    if ($(component.helper) != null) {
        var uid = $(component.helper).attr("id");
        if (uid == undefined) {  // the component is dragged from the category div
            // clone the helper element and add it to the container
            cloned = $(component.helper).clone(true).removeClass('ui-draggable ui-draggable-dragging');

            // Make all the child fields visible
            $(cloned).children().removeClass("componentchildinput").addClass("workflowcomponentchildinput");
            var closebutton = ($(cloned).children())[1];
            $(closebutton).removeClass("componentclose workflowcomponentchildinput").addClass("workflowcomponentclose");

            // we include the id of the original component to be able to retrieve it later to generate
            // the workflow
            var cid = 'wfcid' + wfcnt + '_' + component.draggable.attr("id");
            //alert(cid);
            cloned.attr('id', cid);
            wfcnt++;

            cloned.attr('class', 'workflowcomponent');
            //var clonedhtml = $(cloned).html();
            //cloned.html("<div style='float: right'>X</div>" + clonedhtml);
            $(this).append(cloned);

            //alert("Adding endpoints...");

            // Add the source and target endpoints to the component
            jsPlumb.addEndpoint(cid, sourceWFEndpointOptions);
            jsPlumb.addEndpoint(cid, targetWFEndpointOptions);

            //jsPlumb.makeTarget(cid, {
            //    anchor: "Continuous",
            //    endpoint: "Rectangle",
            //    paintStyle: { width: 5, height: 5, fillStyle: '#666' },
            //    maxConnections: -1,
            //    connector: ""
            //});

            //  set the component to be draggable
            jsPlumb.draggable(cid, {
                containment: "parent",
                helper: "original"
            });

            $('.workflowcomponentclose').click(function(clickevent){RemoveComponent(clickevent.target)});
        }
    }

    //jsPlumb.makeTarget(e2);
    //jsPlumb.connect({ source: e1, target: e2, anchor: "Continuous" });
}

var WF_edges = {};
var WF_nodes = {};
var WF_endpoints = {};
// Extract workflow from UI
function ExtractWorkflow() {
    WF_edges = {};
    WF_nodes = {};
    var connectionList = jsPlumb.getConnections();
    //alert(connectionList.length);

    for (i = 0; i < connectionList.length; i++) {
        var conn = connectionList[i];
        var source = conn.source;
        var target = conn.target;
        var srcidstr = $(conn.source).attr("id");
        var targetidstr = $(conn.target).attr("id");

        if (srcidstr != undefined && targetidstr != undefined) {
            var srcid = GetComponentId(srcidstr);
            //alert(srcid);
            var targetid = GetComponentId(targetidstr);
            //alert(targetid);
            if (srcid != undefined && targetid != undefined) {
                // populate the workflow nodes object
                if (WF_nodes[srcidstr] == undefined)
                {
                    var nameelement = ($(source).children())[0];
                    //alert(nameelement);
                    //if (nameelement != undefined)
                    //    alert($(nameelement).children()[0]);

                    var serviceurlelement = $(source).children()[2];
                    //alert(serviceurlelement);
                    alert("Service uri: " + $(serviceurlelement).attr("value"));
                    var subactionelement = $(source).children()[3];
                    var dataurielement = $(source).children()[4];
                    //alert($(dataurielement).attr("value"));

                    var wfnode = {};
                    wfnode.id = srcidstr;
                    //var namevalueelement = $((nameelement).children())[0];
                    //alert("Name value: " + $(nameelement).html());
                    wfnode.name = $(nameelement).html();
                    wfnode.serviceuri = $(serviceurlelement).attr("value");
                    //alert("Service uri: " + wfnode.serviceuri);
                    wfnode.subaction = $(subactionelement).attr("value");
                    wfnode.datauri = $(dataurielement).attr("value");
                    wfnode.componentid = srcid;
                    WF_nodes[srcidstr] = wfnode;
                }


                if (WF_nodes[targetidstr] == undefined)
                {
                    //alert("Save target node");
                    var nameelement = $(target).children()[0];
                    var serviceurlelement = $(target).children()[2];
                    //alert($(serviceurlelement).attr("value"));
                    var subactionelement = $(target).children()[3];
                    var dataurielement = $(target).children()[4];

                    var wfnode = {};
                    wfnode.id = targetidstr;
                    wfnode.name = $(nameelement).html();
                    wfnode.serviceuri = $(serviceurlelement).attr("value");
                    wfnode.subaction = $(subactionelement).attr("value");
                    wfnode.datauri = $(dataurielement).attr("value");
                    wfnode.componentid = targetid;
                    WF_nodes[targetidstr] = wfnode;
                }

                //WF_edges[key]. = $(conn.source); // remember the html element of the source node
                //alert("Save edge");
                var fieldname = "sourceid_" + i.toString();
                WF_edges[fieldname] = srcidstr;
                //alert(WF_edges[fieldname]);
                
                fieldname = "targetid_" + i.toString();
                WF_edges[fieldname] = targetidstr;
                //alert(WF_edges[fieldname]);

                fieldname = "datatype_" + i.toString();
                WF_edges[fieldname] = "Any Data";  // TODO handle edge data type (network, list, names etc)

                fieldname = "datatypeid_" + i.toString();
                WF_edges[fieldname] = "7";  // TODO handle edge data type (network, list, names etc)

                fieldname = "isparallel_" + i.toString();
                WF_edges[fieldname] = "1"; // TODO handle edge parallel type (parallel, sequential, parallel by default)
            }
        }
    }
    //alert("extraction done!");
}

function ConstructWorkflowJSON(name, description, workflowid, userid) {
    //alert("ContructJSON workflowid: " + workflowid);

    var jsonObj = {}; //declare array
    jsonObj.type = "workflow";
    jsonObj.workflownodes = WF_nodes;
    jsonObj.workflowedges = WF_edges;
    jsonObj.workflowid = workflowid;
    jsonObj.name = name;
    jsonObj.desc = description;
    jsonObj.userid = userid.toString();
    //jsonObj.edgelist = WF_edges;

    //alert(jsonObj["name"]);
    //alert(jsonObj["edgelist"]);

    return jsonObj;
}

// Show the Save workflow Dialog
// for user to input the name and description
// of the workflow
function ShowSaveWorkflowDlg()
{
    $( "#dlgsaveworkflow" ).dialog({
            resizable: false,
            height:300,
            modal: true,
            buttons: {
                "Save": function() {
                    var p1 = ($("#dlgsaveworkflow").children())[0];
                    var nameinput = ($(p1).children())[0];
                    var name = $(nameinput).attr("value");
                    alert("Workflow name: " + name);

                    var p2 = ($("#dlgsaveworkflow").children())[1];
                    var descinput = ($(p2).children())[0];
                    var desc = $(descinput).attr("value");

                    //alert("Saving workflow " + currWorkflowID);
                    SaveWorkflow(name, desc, currWorkflowID, 1);
                    $( this ).dialog( "close" );
                },
                Cancel: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
}

function SubmitWorkflow() {
    //Start boss
    //SubmitWorkflowToBoss("Test");

    if (ConnectToGaggle()) {
        ExtractWorkflow();
        var jsonObj = ConstructWorkflowJSON("Workflow", "Hello world", currWorkflowID, "1");
        var jsonString = JSON.stringify(jsonObj);
        //alert(jsonString);
        SubmitWorkflowToBoss(jsonString);
    }
}

// Processes the workflow starting from a particular node 
// Enumerate through all the edges
function ProcessWorkflowforNode(node, edges, data) {
    alert("Process node " + node);
    if (node != undefined && edges != undefined && edges.length > 0) {
        for (i = 0; i < edges.length; i++) {
            sourceelement = edges[i]["sourceelement"];
            alert($(sourceelement).attr("id"));
            nextnode = edges[i]["node"];
            edgetype = edges[i]["type"];

            var goosenameelement = ($(sourceelement).children())[1];
            var goosecommandelement = ($(sourceelement).children())[2];
            alert($(goosenameelement).attr("value"));
            alert($(goosecommandelement).attr("value"));

            //ProcessAction($(goosenameelement).attr("value"), $(goosecommandelement).attr("value"), "", "", 1);
        }
    }
}

// Save the workflow to the DB
function SaveWorkflow(name, desc, workflowid, userid) {
    //alert("save workflow " + workflowid);
    ExtractWorkflow();
    if (WF_edges.length == 0) {
        alert("No workflow components. Save failed");
        return;
    }
    var jsonObj = ConstructWorkflowJSON(name, desc, workflowid, userid);

    //alert("Send workflow");
    // Send the workflow data for saving
    jQuery.ajax({
        url: "/workflow/save",
        type: "POST",
        data: JSON.stringify(jsonObj), //({"name": "workflow", "desc": "Hello World", "userid": "1"}),
        contentType: "application/json; charset=UTF-8",
        dataType: "json",
        beforeSend: function (x) {
            if (x && x.overrideMimeType) {
                x.overrideMimeType("application/json;charset=UTF-8");
            }
        },
        success: function (result) {
            //Write your code here
            //alert(result['id']);
            //alert(($("#divWorkflow").children().length));
            if (workflowid == undefined || workflowid == "")
            {
                var link = "<li><a href='" + "javascript:GetWorkflow(\"" + result['id'] + "\")'>" + result['name'] + "</a></li>";
                alert(link);
                var ul = ($("#divWorkflow").children())[0]; // TODO use jquery to get the ul
                $(ul).append(link);
                currWorkflowID = result['id'];
            }
        }
    });
}

// Contact the server to get information of a workflow
// Info includes name, description, owner, and edges
function GetWorkflow(wfid) {
    // Send the workflow data for saving
    //alert("get workflow");
    //alert(wfid);
    $.get("/workflow/" + wfid + "/",
            function (data) {
                //alert("Get workflow " + wfid);
                currWorkflowID = wfid.toString();
                //alert("Set current workflow ID: " + currWorkflowID);
                DisplayWorkflow(data);
                $('.workflowcomponentclose').click(function(clickevent){RemoveComponent(clickevent.target)});
            }
        );
}

WF_processednodes = {};

// Given a nodeid, search if it is already added to the workflow canvas.
// If not, create the node and add it to the workflow canvas
function SearchAndCreateNode(nodes, nodeid, nodecnt) {
    var node = nodes[nodeid];
    var nodecomponentid = node.componentid; // the id of the component in DB
    var sourceid = 'wfcid' + wfcnt.toString() + "_" + 'component_' + nodecomponentid;
    wfcnt++;

    //alert(sourceid);
    var nodeobj = {};
    // Find existing node for the same component
    //var searchstr = "[id*='_component_" + nodecomponentid + "']";
    var nodeelement = WF_processednodes[nodeid];
    //alert(elements.length);
    var sourcelement = null;
    if (nodeelement == undefined) {
        //alert("add node");
        var componentid = "component_" + nodecomponentid; //  nodeid;
        //alert(componentid);
        var source = document.getElementById(componentid); // this is the component in the component list
        //alert($(source).attr('id'));
        //$(source).clone().appendTo("#workflowcanvas");
        //sourcelement = $(source).clone();
        sourcelement = $(source).clone().removeClass('ui-draggable');
        //alert(sourcelement);
        if (sourcelement != undefined) {
            $(sourcelement).attr('class', 'workflowcomponent');
            $(sourcelement).attr('id', sourceid);
            $(sourcelement).children().removeClass("componentchildinput").addClass("workflowcomponentchildinput");
            var closebutton = ($(sourcelement).children())[1];
            $(closebutton).removeClass("componentclose workflowcomponentchildinput").addClass("workflowcomponentclose");

            // configure the parameters of the component
            var serviceuriinput = $(sourcelement).children()[2];
            $(serviceuriinput).attr("value", node.serviceuri);
            var subactioninput = $(sourcelement).children()[3];
            $(subactioninput).attr("value", node.subaction);
            var datauriinput = $(sourcelement).children()[4];
            $(datauriinput).attr("value", node.datauri);

            var canvasposition = $("#workflowcanvas").position();
            //var tableposition = $("#tblWorkflow").offset();
            //alert("Canvas top: " + canvasposition.top + "Canvas left: " + canvasposition.left);
            //alert("Table top: " + tableposition.top + "Table left: " + tableposition.left);
            var leftv = canvasposition.left + 10 + ((nodecnt % 2 == 0) ? 0 : 1) * 250;
            var topv = canvasposition.top + 10 + Math.floor(nodecnt / 2) * 100;
            var stylestr = "position: absolute; top: " + topv.toString() + "px; left: " + leftv.toString() + "px";
            //alert(stylestr);
            $(sourcelement).attr('style', stylestr);
            $(sourcelement).appendTo("#workflowcanvas");

            srcEP = jsPlumb.addEndpoint(sourceid, sourceWFEndpointOptions);
            targetEP = jsPlumb.addEndpoint(sourceid, targetWFEndpointOptions);
            nodeobj.Element = sourcelement;
            nodeobj.SourceEP = srcEP;
            nodeobj.TargetEP = targetEP;
            nodeobj.IsNew = true;

            // store the endpoints for retrieve later
            WF_endpoints[sourceid] = {};
            WF_endpoints[sourceid].SourceEP = srcEP;
            WF_endpoints[sourceid].TargetEP = targetEP;
            // Save the nodeobj
            WF_processednodes[nodeid] = sourcelement;

            //  set the component to be draggable
            jsPlumb.draggable(sourceid, {
                containment: "parent",
                helper: "original"
            });
        }
    }
    else {
        // The node already exists, we retrieve its jsPlumb endpoints
        //alert("Existing node");
        //alert($(sourcelement).attr('id'));
        sourcelement = WF_processednodes[nodeid];
        nodeobj.Element = sourcelement;
        nodeobj.SourceEP = WF_endpoints[$(sourcelement).attr('id')].SourceEP;
        nodeobj.TargetEP = WF_endpoints[$(sourcelement).attr('id')].TargetEP;

        // This doesn't work so I have to save all the endpoints in a dictionary :(
        //            jsPlumb.selectEndpoints({ source: $(sourcelement).attr('id') }).each(
        //                function (ep) {
        //                    alert(Object.prototype.toString.call(ep));
        //                    nodeobj.SourceEP = ep;
        //                });

        //                jsPlumb.selectEndpoints({ target: $(sourcelement).attr('id') }).each(
        //                function (ep) {
        //                    nodeobj.TargetEP = targetep;
        //                }
        //            );

        nodeobj.IsNew = false;
    }
    return nodeobj;
}

// Display a workflow fetched from the server
function DisplayWorkflow(flowdata) {
    if (flowdata != undefined) {
        //alert(flowdata.name);
        nodes_obj = flowdata.nodes;
        edges_obj = flowdata.edges;
        var processedNodes = {};

        //alert(edges_obj);
        //alert(edges_obj["0"]);
        i = 0;
        nodecnt = 0;
        WF_processednodes = {};
        while (edges_obj[i] != undefined) {
            if (i == 0) {
                ClearWorkflowCanvas();
            }

            edge = edges_obj[i.toString()];
            //alert(edge['source']);
            //alert(edge['target']);
            var sourcenode = SearchAndCreateNode(nodes_obj, edge['sourcenodeid'], nodecnt);
            if (sourcenode.IsNew)
                nodecnt++;
            var targetnode = SearchAndCreateNode(nodes_obj, edge['targetnodeid'], nodecnt);
            if (targetnode.IsNew)
                nodecnt++;
            var srcid = $(sourcenode.Element).attr('id');
            var targetid = $(targetnode.Element).attr('id');
            var lblid = "lbl_" + srcid + "_" + targetid;
            var c = jsPlumb.connect({
                source: sourcenode.SourceEP,
                target: targetnode.TargetEP,
                //overlays: [
		        //            ["Label", { label: "FOO", id: lblid}]
	            //        ]
            });
            i++;
        }
    }
}

function ClearWorkflowCanvas() {
    $("#workflowcanvas").empty();  // clean up the canvas
    jsPlumb.deleteEveryEndpoint();
    WF_endpoints = {};
    wfcnt = 0;
}

// Extract the id of the component from the id string
// The id string looks like this: wfcid[id1]_component_[id2]
// The function returns id2
function GetComponentId(idstr) {
    if (idstr != undefined) {
        return idstr.substr(idstr.lastIndexOf("_") + 1);
    }
    return undefined;
}

function RemoveComponent(clicktarget)
{
     //alert("In RemoveComponent");
     var target = clicktarget;
     var component = $(target).parent();
     var componentid = $(component).attr("id");
     //alert($(component).attr("id"));

     /*var connectionList = jsPlumb.getConnections();
     for (i = 0; i < connectionList.length; i++) {
          var conn = connectionList[i];
          var source = conn.source;
          var target = conn.target;
          var sourceid = $(source).attr("id");
          var targetid = $(target).attr("id");
          alert("Connection source ID: " + $(source).attr("id") + " target ID: " + $(target).attr("id"));
          if (sourceid == componentid || targetid == componentid)
          {
              //alert("Remove connection...");
              jsPlumb.detach(conn);
          }
     } */

     jsPlumb.selectEndpoints({ source: component }).each(
                                          function (ep) {
                                              jsPlumb.deleteEndpoint(ep);
                                          });

     jsPlumb.selectEndpoints({ target: component }).each(
                                               function (ep) {
                                                   jsPlumb.deleteEndpoint(ep);
                                               });

     $(component).remove();
}


jsPlumb.ready(function () {
    jsPlumb.Defaults.Container = $(".main");

    // Bind to the connection established event
    //jsPlumb.bind("jsPlumbConnection", ConnectionEstablished);
});




// Global variables
var java_socket_bridge_ready_flag = false;

// Applet reports it is ready to use
function java_socket_bridge_ready() {
    alert("Proxy ready!");
    java_socket_bridge_ready_flag = true;
}

// Connect to a given url and port
function socket_connect(url, port) {
    if (java_socket_bridge_ready_flag) {
        return get_java_socket_bridge().connect(url, port);
    }
    else {
        on_socket_error("Java Socket Bridge cannot connect until the applet has loaded");
    }
}

// Disconnect
function socket_disconnect() {
    if (java_socket_bridge_ready_flag) {
        return get_java_socket_bridge().disconnect();
    }
    else {
        on_socket_error("Java Socket Bridge cannot disconnect until the applet has loaded");
    }
}

// Write something to the socket
function socket_send(message) {
    if (java_socket_bridge_ready_flag) {
        return get_java_socket_bridge().send(message);
    }
    else {
        on_socket_error("Java Socket Bridge cannot send a message until the applet has loaded");
    }
}

// Get something from the socket
function on_socket_get(message) { }

// Report an error
function on_socket_error(message) {
    alert(message);
}

// Get the applet object
function get_java_socket_bridge() {
    return document.getElementById('GaggleProxy');
}

function get_proxyapplet() {
    return document.getElementById('GaggleProxy');
}

function ConnectToGaggle() {
    var proxy = get_proxyapplet();
    if (proxy != undefined) {
        alert("Connecting to gaggle");
        if (!proxy.ConnectGaggle()) 
        {
            $("#dialog").dialog("open");
            return false;
            //prompt("Boss is not running. Click <a href='http://localhost:8000/static/jnlp/boss.jnlp'>here</a> to start the boss");
        }
    }
    return true;
}

function ProcessAction(sourcename, sourcecommand, targetname, targetcommand, type)
{
    var proxy = get_proxyapplet();
    if (proxy != undefined) {
        alert("Process action " + sourcename);
        proxy.ProcessAction(sourcename, sourcecommand, targetname, targetcommand, type);
        alert("action done");
    }
}

function SubmitWorkflowToBoss(jsonworkflow) {
    var proxy = get_proxyapplet();
    if (proxy != undefined) {
        //alert("Submit workflow");
        proxy.SubmitWorkflow(jsonworkflow);
        //alert("workflow action done");
    }
}

$(function () {
    // this initializes the dialog (and uses some common options that I do)
    $("#dialog").dialog({ autoOpen: false, modal: true, show: "blind", hide: "blind" });
});
