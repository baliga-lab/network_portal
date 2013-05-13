// Workflow logic
var wfcnt = 0;
var wflabelcnt = 0;
var currWorkflowID = "";
var currWorkflowName = "";
var currWorkflowDesc = "";
var WorkflowEdgeDataTypes = {};
var currConnection = null;
var WF_edges = {};
var WF_nodes = {};
var WF_endpoints = {};
var WF_rid = "";
var WF_startNode = "";
var WF_timercnt = 0;
var currSessionID = "";
var mouseX;
var mouseY;
var WF_dataSignal = 0;

var WF_selectedDataApplication = null;
var WF_processWorkflow = false;
var WF_batchedData = null;
var WF_batchrunNotification = true;
var WF_currDatapoint = 0;
var WF_nodecnt = 0;
var WF_groupcnt = -1;
var WF_captureddataid = -1;
var WF_currOrganism = "Generic";

// Below are the index of UI elements in the component div.
// Everytime a UI element is added, we should modify the index here if necessary.
var serviceuriindex = 2
var componenttitledivindex = 0;
var componenttitlelinkindex = 0;
var componentsubactioninputindex = 4;
var componentdatauriindex = 5;

var WF_dataAppliedHistory = [];

var sourceWFEndpointOptions = {
    anchor: "RightMiddle",
    endpoint: "Dot",
    isSource: true,
    maxConnections: -1,
    connector: "StateMachine",
    connectorStyle: { strokeStyle: "#666" },
    connectorOverlays: [
			    ["Arrow", { width: 5, length: 15, location: 1, id: "arrow"}]
                //,["Label", {label:"Data", location:0.5, id: "connlabel", overlayClass: "dataLabel"}]
            ]
};

var targetWFEndpointOptions = {
    anchor: "LeftMiddle",
    endpoint: "Rectangle",
    paintStyle: { width: 12, height: 12, fillStyle: '#666' },
    maxConnections: -1,
    connector: "StateMachine",
    isTarget: true
    //connectorStyle: { strokeStyle: "#666" },
};

$(document).ready(function () {
    $('#accordion').accordion({ active: false,
                                collapsible: true,
				                heightStyle: "content"});
    $('#accordion p').bind('click', function (event) {
       var source = event.target || event.srcElement;
       if (source != null)
       {
          //alert($(source).attr("id"));
          var srcid = $(source).attr("id");
          var splitted = srcid.split("_");
          var wfid = splitted[1];
          if (wfid != null)
          {
            //alert(wfid);
            GetWorkflow(wfid);
          }
       }
    } );

    $('#wfgrpaccordion').accordion({ active: false,
                                collapsible: true,
    				            heightStyle: "content"});

    $('#divstatedataaccordion').accordion({ active: false,
                                    collapsible: true,
        				            heightStyle: "content"});

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

    $(".componenthelp").colorbox({inline: true, width: "50%"});

    setTimeout(function() { TimerFunc() }, 3000);
    GetEdgeDataTypes();
    LoadDataWorkspaceComponentMenu();

    LoadDataSpace();
});


function TimerFunc()
{
    CheckDataInjection();
    UpdateGeeseInfo();
}

function UpdateGeeseInfo()
{
    var proxy = get_proxyapplet();
    if (proxy != undefined) {
        var geeseList = proxy.getGeeseList();
        if (geeseList != null) {

        }
    }
}


// Load the data workspace menu for group opening feature
function LoadDataWorkspaceComponentMenu()
{
    $("#components").children().each(function() {
        //alert($(this).attr("id"));
        // Make all the child fields visible
        // include workflow index in component name
        var titleelement = ($(this).children())[0];
        var titleahref = ($(titleelement).children())[0];
        var goosename = $(titleahref).text();
        //alert(goosename);

        // Add the goose name to the context menu div
        var li = document.createElement("li");
        var checkedtext = (goosename.toLowerCase().indexOf("firegoose") >= 0) ? "checked" : "";
        li.innerHTML = ("<input type='radio' name='grpgoose' " + checkedtext + " onchange='javascript:SetDataPass(this)' />" + goosename
           + "<input type='hidden' value='" + $(this).attr("id") + "' />");
        $("#ulctxcomponents").append(li);
    });
}

function SetDataPass(event)
{
    var source = event.target || event.srcElement;
    if (source == null)
        source = event;
    if (source != null) {
        var checked = $(source).prop("checked");
        if (checked) {
            var li = $(source).parent();
            var goosename = $(li).text();
            //alert(goosename);
            $("#inputNameValue").prop("checked", false);
            if (goosename.toLowerCase().indexOf("firegoose") >= 0)
            {
                // Pass name to Firegoose by default
                $("#inputNameValue").prop("checked", true);
            }
        }
    }
}


// Load data space data
function LoadDataSpace()
{
    var queryobj = {};
    WF_currOrganism = $("#organismSelect").val();
    if (WF_currOrganism == null || WF_currOrganism.length ==0)
        return;

    //alert(WF_currOrganism);
    queryobj['organism'] = WF_currOrganism;
    queryobj['userid'] = $("#authenticated").val();

    jQuery.ajax({
        url: "/workflow/getdataspace",
        type: "POST",
        data: JSON.stringify(queryobj), //({"name": "workflow", "desc": "Hello World", "userid": "1"}),
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
            if (result != null)
            {
                //alert("loading data space...");
                var index = 0;
                $("#wfdataspace").children().each(function() {
                    uldata = $(this).children()[2];
                    $(uldata).empty();
                });
                var finished = false;
                do
                {
                   var pair = result[index.toString()];
                   if (pair != null)
                   {
                       //alert(index);
                       var targetid = "#ul";
                       var organism = pair['organism'];
                       var datatype = pair['datatype'];
                       //alert("organism: " + organism);
                       //alert("data type: " + datatype);
                       if (organism == WF_currOrganism)
                       {
                            targetid += datatype;
                       }

                       //alert(targetid);
                       if (targetid != "#ul")
                           InsertDataToTarget(targetid, pair);
                       index++;
                   }
                   else {
                      //alert("terminated at " + index);
                      finished = true;
                   }
                }
                while (!finished);
            }
        }
    });
}

// Periodically polls to check if data has been injected to the page.
// When detected, add context menu to the newly injected data
function CheckDataInjection()
{
    var newsignal = parseInt($("#inputDataSignal").val());
    if (newsignal != WF_dataSignal)
    {
        $(".dataspacehoverimage").hover(function(e){
              //alert("moseover...");
              //alert($("#divDataspaceMenu").css("display"));
              //if ($("#divDataspaceMenu").css("display") != "none")
              //    return;
              var pos = [e.pageX + 25,e.pageY];
              $('#divDataspaceMenu').dialog( {position: pos, height:300,
                buttons: {
                    "Select All": function() {
                        $("#ulctxgoosenames").children().each(function() {
                           var checkbox = $(this).children()[0];
                           $(checkbox).prop('checked', true);
                        });
                    },
                    "Apply": function() {
                        var optiontext = "";
                        var optionvalue = "";
                        $("#ulctxgoosenames").children().each(function() {
                               var checkbox = $(this).children()[0];
                               if ($(checkbox).prop('checked'))
                               {
                                  // current object is the hover image
                                  var imageobj = e.delegateTarget;
                                  // source object is the label
                                  var sourceobj = $(imageobj).parent();
                                  //alert(sourceobj);
                                  var datalink = $(sourceobj).children()[1];
                                  var link = $(datalink).prop("href");
                                  var inputcomponentid = $(this).children()[1];
                                  //alert($(inputcomponentid).val());
                                  var cid = "#" + $(inputcomponentid).val();
                                  var dataurlelement = $(cid).children()[componentdatauriindex];
                                  $(dataurlelement).val(link);

                                  // Record the history for future use
                                  optiontext += $(this).text();
                                  optiontext += ";";

                                  optionvalue += $(inputcomponentid).val();
                                  optionvalue += ";";
                               }
                        });
                        if (optiontext.length > 0)
                        {
                            //alert(optiontext);
                            var option = new Option(optiontext, optionvalue);
                            /// jquerify the DOM object 'o' so we can use the html method
                            $(option).html(optiontext);
                            $("#selectDataAppliedHistory").append(option);
                        }
                    },
                    "Close": function() {
                        $('#divDataspaceMenu').dialog('close');
                    }

                }
              });
              //$('#divDataspaceMenu').dialog('open');
            },
            function()
            {
                //$('#divDataspaceMenu').dialog('close');
            });

        WF_dataSignal = newsignal;
    }
    setTimeout(function() { CheckDataInjection() }, 3000);
}

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
    ToggleCurrentWorkflowLink(currWorkflowID, "");
    currWorkflowID = "";
    currWorkflowName = "";
    currWorkflowDesc = "";
    WF_startNode = "";
    currSessionID = "";

    // clean up the context menu
    $("#ulctxgoosenames").empty();
}


function HasLabelOverlay(overlays)
{
    if (overlays != null)
    {
        for (var i = 0; i < overlays.length; i++)
            if (overlays[i].getLabel != undefined)
                return i;
    }
    return -1;
}

function OnConnectionMouseEnter(connection, event)
{
    //alert("MouseEnter: " + connection);
    currConnection = connection;
}

function EditCallback(value, settings) {
    //alert(value);
    //alert(currConnection);
    if (currConnection != null)
    {
        var overlays = currConnection.overlays;
        //alert(overlays);
        var label = overlays[1];
        if (label == undefined || label.getLabel == undefined)
            label = overlays[0];
        label.setLabel(value);
        currConnection = null;
    }
 }

// User clicked on the connection
// We add the label overlay if not yet
// And hook up the mouseenter event
function ConnectionClicked(connection)
{
    var overlays = connection.overlays;
    connection.bind("mouseenter", OnConnectionMouseEnter)
    //alert("ConnectionClicked: " + overlays);
    if (HasLabelOverlay(overlays) < 0)
    {
        // Add label to the connection
        if (overlays == null)
            connection.overlays = new Array();
        connection.addOverlay(["Label", {label:"Data", location:0.5, id: ("connlbl_" + wflabelcnt.toString())}], false);
        wflabelcnt++;
    }

    //alert(label.getLabel());
    //if (overlays != null && )

    // Somehow in ConnectionEstablished callback, the connector of the
    // current connection is not ready yet. Which will cause the label of the "last"
    // connection not editable. We doit in the click event to enable it as well.
    $('._jsPlumb_overlay').editable(//'/workflow/saveedge',
                                                "/workflow/saveedge/", //SaveWorkflowEdge,
                                                { loadurl: "/workflow/getedgedatatypes/",
                                                    type: "select",
                                                    submit: "OK",
                                                    callback : EditCallback,
                                                    //onblur: "submit",
                                                    //method : "post",
                                                    placeholder: ""
                                                    }
                                                    );
}

// Callback when a connection is established between two UI components
function ConnectionEstablished(connection) {

    /*$('._jsPlumb_overlay').editable(//'/workflow/saveedge',
                                                "/workflow/saveedge/", //SaveWorkflowEdge,
                                                { loadurl: "/workflow/getedgedatatypes/",
                                                    type: "select",
                                                    //submit: "OK",
                                                    onblur: "submit",
                                                    //method : "post",
                                                    placeholder: ""
                                                    }
                                                    );
    */
    if (connection != null)
    {
        //alert("connection established...");
        connection.bind("click", ConnectionClicked);
    }
}


function GetEdgeDataTypes()
{
    $.get("/workflow/getedgedatatypes/",
                function (data) {
                    //alert("Get workflow edge data types" + data);
                    WorkflowEdgeDataTypes = data;
                }
            );
}

function componentDropEvent(ev, component) {
    var originalclass = $(component.draggable).attr("class");
    if (originalclass != undefined && originalclass.indexOf("ui-dialog") >= 0)
        return;
    if ($(component.helper) != null) {
        var uid = $(component.helper).attr("id");
        if (uid == undefined) {  // the component is dragged from the category div
            // clone the helper element and add it to the container
            cloned = $(component.helper).clone(true).removeClass('ui-draggable ui-draggable-dragging');
            //alert("cloned!");
            // Make all the child fields visible
            $(cloned).children().removeClass("componentchildinput").addClass("workflowcomponentchildinput");

            $($((cloned).children())[0]).removeClass("workflowcomponentchildinput");
            // include workflow index in component name
            var titleelement = ($(cloned).children())[0];
            var titleahref = ($(titleelement).children())[0];
            var goosename = $(titleahref).text();
            $(titleahref).text(goosename + "-" + wfcnt);

            // we include the id of the original component to be able to retrieve it later to generate
            // the workflow
            var cid = 'wfcid' + wfcnt + '_' + component.draggable.attr("id");
            //alert(cid);
            cloned.attr('id', cid);

            // Add the goose name to the context menu div
            var li = document.createElement("li");
            li.id = "ctx_" + goosename + "-" + wfcnt.toString();
            li.innerHTML = ("<input type='checkbox' />" + goosename + "-" + wfcnt.toString()
               + "<input type='hidden' value='" + cid + "' />");
            $("#ulctxgoosenames").append(li);

            // include workflow index in the hidden field
            $($((cloned).children())[10]).val(wfcnt.toString());

            var closebutton = ($(cloned).children())[1];
            $(closebutton).removeClass("componentclose workflowcomponentchildinput").addClass("workflowcomponentclose");

            $(($(cloned).children())[3]).removeClass("workflowcomponentchildinput componentquestion").addClass("workflowcomponentquestion");

            $(($(cloned).children())[componentsubactioninputindex]).removeClass("workflowcomponentchildinput componentsubactions").addClass("workflowcomponentsubactions");

            var serviceuriinput = ($(cloned).children())[2];
            if (window.localStorage != null)
            {
                //alert(component.draggable.attr("id"));
                var uri = window.localStorage.getItem(component.draggable.attr("id"));
                //alert(uri);
                if (uri != null)
                    $(serviceuriinput).val(uri);
            }

            //var serviceurlelement = ($(cloned).children())[2];
            //alert(serviceurlelement);

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

            $(".workflowcomponentquestion").colorbox({inline:true, width:"50%"});
        }
    }
}

// Start download a url based on OS
function startDownload(url)
{
    //var url='http://server/folder/file.ext';
    if (url != null && url.length > 0)
    {
        var index = -1;
        if (navigator.appVersion.indexOf("Win") != -1 )
            index = 0;
        else if (navigator.appVersion.indexOf("MacOS") != -1 || navigator.appVersion.indexOf("Macintosh") != -1)
            index = 1;
        else if (navigator.appVersion.indexOf("Linux") != -1 )
            index = 2;

        //alert(index);
        if (index >= 0)
        {
            var splitted = url.split(";");
            //alert(splitted[index]);
            window.open(splitted[index],'Download');
        }
    }
}


function NodeProcessed(node, processednodes) {
    //alert($(node).attr('id'));
    //alert(processednodes.length);
    for (i = 0; i < processednodes.length; i++) {
        //alert($(processednodes[i]).attr('id'));
        if ($(processednodes[i]).attr('id') == $(node).attr('id'))
            return true;
    }
    return false;
}

// Extract workflow from UI
function ExtractWorkflow(nodelist) {
    WF_edges = {};
    WF_nodes = {};

    //var allnodes = new Array();
    var processednodes = new Array();
    // first extract all the nodes

    var nodes = $("#workflowcanvas").children();
    //alert("Nodes: " + nodes.length);
    if (nodelist != null)
        nodes = nodelist;

    if (nodelist == null)
    {
        var connectionList = jsPlumb.getConnections();
        //alert(connectionList.length);
        for (i = 0; i < connectionList.length; i++) {
            var conn = connectionList[i];
            var source = conn.source;
            var target = conn.target;
            processednodes.push(source);
            processednodes.push(target);
            var srcEP = conn.endpoints[0];
            //alert(srcEP);
            //srcEP.
            var overlays = conn.overlays;
            //alert(overlays.length);
            var label = overlays[1];
            if (label == undefined || label.getLabel == undefined)
                label = overlays[0];
            //alert(label.constructor.toString());
            var connlabel = "Data";  // default
            if (label.getLabel != undefined)
            {
                //alert(label.getLabel());
                connlabel = label.getLabel();
            }

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
                        var nameelement = ($(source).children())[7];
                        //alert(nameelement);
                        //if (nameelement != undefined)
                        //    alert($(nameelement).children()[0]);

                        var serviceurlelement = $(source).children()[2];
                        //alert(serviceurlelement);
                        //alert("Service uri: " + $(serviceurlelement).val());
                        var argumentselement = $(source).children()[9];
                        //alert(argumentselement);
                        var subactionelement = $(source).children()[componentsubactioninputindex];
                        var dataurielement = $(source).children()[componentdatauriindex];
                        //alert($(dataurielement).attr("value"));
                        var goosenameelement = $(source).children()[6];
                        var componentworkflownodeidelement = $(source).children()[8];
                        var componentworkflowindex = $(source).children()[10];

                        var wfnode = {};
                        wfnode.id = srcidstr;
                        wfnode.wfnodeid = $(componentworkflownodeidelement).val(); //attr("value");

                        //var namevalueelement = $((nameelement).children())[0];
                        //alert(srcidstr);
                        wfnode.name = $(nameelement).val();
                        wfnode.goosename = $(goosenameelement).val();
                        wfnode.serviceuri = $(serviceurlelement).val();
                        wfnode.arguments = $(argumentselement).val();
                        //alert("Service uri arguments: " + wfnode.arguments);
                        var subaction = $(subactionelement).val();
                        if (subaction == "Select a subaction" || subaction == "------------")
                            subaction = "";
                        wfnode.subaction = subaction;

                        wfnode.datauri = $(dataurielement).val();
                        wfnode.componentid = srcid;
                        wfnode.workflowindex = $(componentworkflowindex).val();

                        WF_nodes[srcidstr] = wfnode;
                        //alert("Source node stored");
                    }


                    if (WF_nodes[targetidstr] == undefined)
                    {
                        //alert("Save target node");
                        var nameelement = $(target).children()[7];
                        var serviceurlelement = $(target).children()[2];
                        var argumentselement = $(target).children()[9];
                        //alert($(argumentselement).attr("value"));
                        var subactionelement = $(target).children()[componentsubactioninputindex];
                        var dataurielement = $(target).children()[5];
                        var goosenameelement = $(target).children()[6];
                        var componentworkflownodeidelement = $(target).children()[8];
                        var componentworkflowindex = $(target).children()[10];

                        var wfnode = {};
                        wfnode.id = targetidstr;
                        wfnode.wfnodeid = $(componentworkflownodeidelement).val(); //attr("value");
                        wfnode.name = $(nameelement).val(); //attr("value");
                        wfnode.goosename = $(goosenameelement).val();//.attr("value");
                        wfnode.serviceuri = $(serviceurlelement).val(); //attr("value");
                        wfnode.arguments = $(argumentselement).val(); //attr("value");
                        var subaction = $(subactionelement).val();
                        if (subaction == "Select a subaction" || subaction == "------------")
                            subaction = "";
                        wfnode.subaction = subaction; //attr("value");
                        wfnode.datauri = $(dataurielement).val(); //attr("value");
                        wfnode.componentid = targetid;
                        wfnode.workflowindex = $(componentworkflowindex).val();
                        WF_nodes[targetidstr] = wfnode;
                    }

                    //alert("Save edge");
                    var fieldname = "sourceid_" + i.toString();
                    WF_edges[fieldname] = srcidstr;
                    //alert(WF_edges[fieldname]);

                    fieldname = "targetid_" + i.toString();
                    WF_edges[fieldname] = targetidstr;
                    //alert(WF_edges[fieldname]);

                    fieldname = "datatype_" + i.toString();
                    WF_edges[fieldname] = connlabel;

                    fieldname = "datatypeid_" + i.toString();
                    WF_edges[fieldname] = FindDataTypeID(connlabel);

                    fieldname = "isparallel_" + i.toString();
                    WF_edges[fieldname] = "1"; // TODO handle edge parallel type (parallel, sequential, parallel by default)
                }
            }
        }
    }

    for (j = 0; j < nodes.length; j++)
    {
        //alert(j);
        if (!NodeProcessed(nodes[j], processednodes))
        {
            var source = nodes[j];
            var srcidstr = $(source).attr('id');
            //alert(srcidstr);
            var srcid = GetComponentId(srcidstr);
            //alert(srcid);
            if (srcid != undefined && srcid != "")
            {
                var nameelement = ($(source).children())[7];
                //alert(nameelement);
                //if (nameelement != undefined)
                //    alert($(nameelement).children()[0]);

                var serviceurlelement = $(source).children()[2];
                //alert(serviceurlelement);
                //alert("Service uri: " + $(serviceurlelement).attr("value"));
                var argumentselement = $(source).children()[9];
                //alert(argumentselement);
                var subactionelement = $(source).children()[componentsubactioninputindex];
                var dataurielement = $(source).children()[5];
                //alert($(dataurielement).attr("value"));
                var goosenameelement = $(source).children()[6];
                var componentworkflownodeidelement = $(source).children()[8];
                var componentworkflowindex = $(source).children()[10];

                var wfnode = {};
                wfnode.id = srcidstr;
                //var namevalueelement = $((nameelement).children())[0];
                //alert(srcidstr);
                wfnode.name = $(nameelement).val(); //.attr("value");
                wfnode.goosename = $(goosenameelement).val(); //.attr("value");
                wfnode.serviceuri = $(serviceurlelement).val(); //.attr("value");
                wfnode.arguments = $(argumentselement).val(); //.attr("value");
                //alert("Service uri arguments: " + wfnode.arguments);
                var subaction = $(subactionelement).val();
                if (subaction == "Select a subaction" || subaction == "------------")
                    subaction = "";
                wfnode.subaction = subaction; //.attr("value");
                wfnode.datauri = $(dataurielement).val(); //.attr("value");
                wfnode.wfnodeid = $(componentworkflownodeidelement).val(); //attr("value");
                wfnode.componentid = srcid;
                wfnode.workflowindex = $(componentworkflowindex).val();

                //alert("add node " + srcid);
                WF_nodes[srcidstr] = wfnode;
            }
        }
    }
    //alert("extraction done!");
}

function FindDataTypeID(label)
{
    //alert("Searching label " + label);
    if (WorkflowEdgeDataTypes != null)
    {
        for (key in WorkflowEdgeDataTypes)
            if (WorkflowEdgeDataTypes[key] == label)
            {
                return key;
            }
    }
    return -1;
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
    jsonObj.startNode = WF_startNode;
    //jsonObj.edgelist = WF_edges;

    //alert(jsonObj["name"]);
    //alert(jsonObj["edgelist"]);

    return jsonObj;
}

function ConstructDataGroupJSON(name, description, workflowid, userid, data) {
    //alert("ContructJSON workflowid: " + workflowid);

    var jsonObj = {}; //declare array
    jsonObj.type = "datagroup";
    jsonObj.data = data;
    jsonObj.groupid = workflowid;
    jsonObj.name = name;
    jsonObj.desc = description;
    jsonObj.userid = userid.toString();
    //jsonObj.edgelist = WF_edges;

    //alert(jsonObj["name"]);
    //alert(jsonObj["edgelist"]);

    return jsonObj;
}


function organismSelected(sel)
{
    LoadDataSpace();

    var nodes = $("#workflowcanvas").children();
    if (nodes.length > 0)
    {
        var organismvalue = sel.value;
        //alert(organismvalue);
        if (organismvalue != null && organismvalue.length > 0)
        {
            var cytowebstarturl = "http://networks.systemsbiology.net/static/jnlp/cytoscape-" + organismvalue + ".jnlp";
            var mevwebstarturl = "http://networks.systemsbiology.net/static/jnlp/mev-" + organismvalue + ".jnlp";

            for (var i = 0; i < nodes.length; i++)
            {
                var source = nodes[i];
                var srcidstr = $(source).attr('id');
                var titleelement = ($(source).children())[componenttitledivindex];
                var titleahref = ($(titleelement).children())[componenttitlelinkindex];
                var goosename = $(titleahref).text();
                //alert(goosename);
                if (goosename.indexOf("Cytoscape") >= 0)
                {
                    var serviceurlelement = $(source).children()[2];
                    $(serviceurlelement).val(cytowebstarturl);
                }
                else if (goosename.indexOf("MeV") >= 0)
                {
                    var serviceurlelement = $(source).children()[2];
                    $(serviceurlelement).val(mevwebstarturl);
                }
            }
        }
    }
}


function DeleteClicked()
{
    //alert("Delete clicked");
    if (currWorkflowID != null && currWorkflowID != "")
    {
        $( "#dlgdeletealert" ).dialog({
                    resizable: false,
                    height:200,
                    modal: true,
                    buttons: {
                        "Yes": function() {
                            // Delete the workflow
                            $.get("/workflow/delete/" + currWorkflowID + "/",
                                        function (data) {
                                            //alert("Get workflow " + wfid);
                                            //alert("Remove workflow: " + data);
                                            if (data == "1")
                                            {
                                                //var liid = "#liwf_" + currWorkflowID;
                                                //$(liid).remove();
                                                RemoveWorkflowItem(currWorkflowID);
                                                InitializeWorkflow();
                                            }
                                        }
                                    );

                            $( this ).dialog( "close" );
                        },
                        Cancel: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                });
    }
}


function SaveClicked()
{
    //alert($("#authenticated").attr("value"));
    if ($("#authenticated").val() != "")
        ShowSaveWorkflowDlg();
    else
        ShowAuthenticationAlert();
}

// Show the authenticate alert dlg
function ShowAuthenticationAlert()
{
    $( "#dlgauthenticationalert" ).dialog({
            resizable: false,
            height:200,
            modal: true,
            buttons: {
                "Yes": function() {
                    // Go to the authentication page
                    window.location = "/openid/login";
                    $( this ).dialog( "close" );
                },
                Cancel: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
}

// Show the Save workflow Dialog
// for user to input the name and description
// of the workflow
function ShowSaveWorkflowDlg()
{
    var p1 = ($("#dlgsaveworkflow").children())[0];
    var nameinput = ($(p1).children())[0];
    $(nameinput).attr("value", currWorkflowName);
    //alert("Workflow name: " + name);

    var p2 = ($("#dlgsaveworkflow").children())[1];
    var descinput = ($(p2).children())[0];
    $(descinput).val(currWorkflowDesc);

    $( "#dlgsaveworkflow" ).dialog({
            resizable: false,
            height:300,
            modal: true,
            buttons: {
                "Save": function() {
                    var p1 = ($("#dlgsaveworkflow").children())[0];
                    var nameinput = ($(p1).children())[0];
                    var name = $(nameinput).val();
                    currWorkflowName = name;
                    //alert("Workflow name: " + name);

                    var p2 = ($("#dlgsaveworkflow").children())[1];
                    var descinput = ($(p2).children())[0];
                    var desc = $(descinput).val();
                    currWorkflowDesc = desc;

                    var p3 = ($("#dlgsaveworkflow").children())[2];
                    var newworkflowinput = ($(p3).children())[0];
                    var newworkflow = $(newworkflowinput).attr("checked");
                    //alert(newworkflow);
                    var workflowid = currWorkflowID;
                    if (newworkflow != undefined)
                        workflowid = "";
                    //alert(workflowid);

                    //alert("Saving workflow " + currWorkflowID);
                    var userid = $("#authenticated").val(); //.attr("value");
                    SaveWorkflow(name, desc, workflowid, userid);
                    $( this ).dialog( "close" );
                },
                Cancel: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
}

function SubmitWorkflow(nodelist) {
    //Start boss
    //SubmitWorkflowToBoss("Test");

    //if (ConnectToGaggle())
    {
        //alert("submitting workflow..." + nodelist);
        ExtractWorkflow(nodelist);
        //alert("nodes to submit " + WF_nodes);
        //if (WF_nodes.length > 0) {
            var userid = $("#authenticated").val(); //.attr("value");
            var jsonObj = ConstructWorkflowJSON(currWorkflowName, currWorkflowDesc, currWorkflowID, userid);
            var jsonString = JSON.stringify(jsonObj);
            //alert(jsonString);
            SubmitWorkflowToBoss(jsonString);
            WF_timercnt = 0;
            setTimeout(function() { CheckSessions() }, 15000);
        //}
    }
}

function OnSubmitWorkflow(jsongooseinfo)
{
    //alert("Workflow response: " + jsongooseinfo);
    var jsonobj = JSON.parse(jsongooseinfo);
    for (var key in jsonobj)
    {
        var exepath = jsonobj[key];
        //alert("Executable for " + key + ": " + exepath);
        if (exepath != undefined && exepath.length > 0)
        {
            var componentid = "#" + key;
            var serviceuriinput = ($(componentid).children())[2];
            var serviceuri = $(serviceuriinput).val();
            if (serviceuri == null || serviceuri.length == 0 || serviceuri.toLowerCase().indexOf('.jnlp') < 0)
            {
                // We reset the uri if it is not a jnlp path

                //alert("Current value: " + $(serviceuriinput).html());
                $(serviceuriinput).val(exepath);
                //alert(window.localStorage);
                if (window.localStorage) {
                  // window.localStorage is available!
                  var componentinfo = key.split("_");
                  //alert(componentinfo[1]);
                  window.localStorage.setItem((componentinfo[1] + "_" + componentinfo[2]), exepath);
                  //alert(componentinfo[2]);
                } else {
                  // no native support for HTML5 storage :(
                  // maybe try dojox.storage or a third-party solution
                }
            }
        }
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

function AppendOrUpdateWorkflowItem(wfid, workflowjsonstring)
{
    if (wfid != null && workflowjsonstring != null)
    {
        var wfcontrolid = "a#liwf_" + wfid;
        var wfdivid = "divwf_" + wfid;
        var newhtml = "<p id='h3wf_" + wfid + "'><a href='#' id='liwf_" + wfid + "'>" + workflowjsonstring['name'] + "</a></p>";
        var newdivhtml = "<p>" + workflowjsonstring['desc'] + "</p>";
        //alert(newhtml);
        //alert(newdivhtml);
        //alert($(wfdivid));
        var textdiv = document.getElementById(wfdivid);
        if (textdiv != null)
        {
            // Update the workflow
            //alert("Update " + $(wfcontrolid).text());
            $(wfcontrolid).text(workflowjsonstring['name']);

            if ($("#" + wfdivid) != null)
            {
                $(("#" + wfdivid)).html(newdivhtml);
            }
        }
        else
        {
            var ahrefelement = document.createElement('a');
            $(ahrefelement).html(newhtml);
            var divelement = document.createElement("div");
            divelement.setAttribute("id", ("divwf_" + wfid));
            $(divelement).html(newdivhtml);
            //alert("Append elements " + $(ahrefelement).html());
            $("#accordion").append($(ahrefelement));
            $("#accordion").append($(divelement)).accordion('destroy').accordion({ active : -1});
            $('#accordion p').bind('click', function (event) {
                   var source = event.target || event.srcElement;
                   if (source != null)
                   {
                      //alert($(source).attr("id"));
                      var srcid = $(source).attr("id");
                      var splitted = srcid.split("_");
                      var wfid = splitted[1];
                      if (wfid != null)
                      {
                        //alert(wfid);
                        GetWorkflow(wfid);
                      }
                   }
                } );
        }
    }
}

function RemoveWorkflowItem(wfid)
{
    if (wfid != null)
    {
        var wfcontrolid = "#liwf_" + wfid;
        var wfdivid = "#divwf_" + wfid;
        $(wfcontrolid).parent().remove();
        $(wfdivid).remove();
    }
}

// Save the workflow to the DB
function SaveWorkflow(name, desc, workflowid, userid) {
    //alert("save workflow " + workflowid);
    ExtractWorkflow(null);
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
            if (result['id'] != undefined && result['id'].length > 0)
            {
                AppendOrUpdateWorkflowItem(result['id'], result);
                if (currWorkflowID == null || currWorkflowID.length == 0 || currWorkflowID != result['id'])
                    // If the saved workflow is a new workflow, we need to reload it so that all the components
                    // has their workflownodeid saved to be able to generate workflow reports (which requires
                    // workflownodeid to save to the sessionreportdata table
                    GetWorkflow(result['id']);
                else
                    currWorkflowID = result['id'];



                /*var link = "<li class='unselectedworkflow' id=\"liwf_" + result['id'] + "\"><a title=\"" + result['desc'] + "\" href='" + "javascript:GetWorkflow(\"" + result['id'] + "\")'>" + result['name'] + "</a></li>";
                //alert(link);
                var ul = ($("#divWorkflow").children())[0];
                var liid = "liwf_" + result['id'];
                //alert("li ID: " + liid);
                var wflink = document.getElementById(liid);
                //var wflink = $(liid);
                //alert(wflink);
                if (wflink == undefined)
                    $(ul).append(link);
                else
                    $(wflink).html(link);
                ToggleCurrentWorkflowLink(currWorkflowID, result['id']);
                currWorkflowID = result['id'];  */
            }
        }
    });
}

// Start or Stop recording workflows
function ToggleRecording()
{
    var proxy = get_proxyapplet();
    if (proxy != undefined)
    {
        //alert($("#btnRecord"));
        if ($("#btnRecord").val() == "Record")
        {
            // First clean up everything
            InitializeWorkflow();

            // Now we start recording
            var id = proxy.StartRecording();
            if (id != null)
            {
               $("#btnRecord").val("Stop");
               WF_rid = id;
            }
            else
                alert("Failed to start recording. Make sure the boss is started.")
        }
        else
        {
            $("#btnRecord").val("Record");
            //alert(WF_rid);
            var jsonworkflow = proxy.StopRecording(WF_rid);
            //alert(jsonworkflow);
            var jsonobj = JSON.parse(jsonworkflow);
            DisplayWorkflow(jsonobj, "");
        }
    }
}

function TogglePause()
{
     var proxy = get_proxyapplet();
    if (proxy != undefined)
    {
        //alert($("#btnRecord"));
        if ($("#btnPause").val() == "Pause")
        {
            // Now we pause the recording
            var jsonworkflow = proxy.PauseRecording(WF_rid);
            var jsonobj = JSON.parse(jsonworkflow);
            DisplayWorkflow(jsonobj, "");
            $("#btnPause").val("Resume");
        }
        else
        {
            $("#btnPause").val("Pause");
            //alert(WF_rid);
            proxy.ResumeRecording(WF_rid);
        }
    }
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
                //alert("Set current workflow ID: " + currWorkflowID);
                //var ul = $("#divWorkflow").children()[0];
                //$(ul).children().css();
                //alert(data);
                DisplayWorkflow(data, wfid);
                $('.workflowcomponentclose').click(function(clickevent){RemoveComponent(clickevent.target)});
                WF_timercnt = 10; // we do not incur multiple check in this case
                setTimeout(function() { CheckSessions() }, 2000);
            }
        );
}

WF_processednodes = {};

function FindComponentId(componentname, componentarray)
{
    for (var i = 0; i < componentarray.length; i++)
    {
        //alert(componentarray[i]);
        var componentinfo = componentarray[i].split(",");
        if (componentname.indexOf(componentinfo[0]) >= 0)
            return componentinfo[1];
    }
    return null;
}

function AppendComponent(node, nodeid, componentid, sourceid, nodecnt)
{
    //alert(componentid);
    var nodeobj = {};
    var sourcelement = null;
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

        $($((sourcelement).children())[0]).removeClass("workflowcomponentchildinput");
        // include workflow index in component name
        var titleelement = ($(sourcelement).children())[componenttitledivindex];
        var titleahref = ($(titleelement).children())[componenttitlelinkindex];
        var goosename = $(titleahref).text();
        //alert(goosename);
        $(titleahref).text(goosename + "-" + nodecnt);
        // Also add to the context menu
        var li = document.createElement("li");
        li.id = "ctx_" + goosename + "-" + wfcnt.toString();
        li.innerHTML = ("<input type='checkbox' />" + goosename + "-" + wfcnt.toString()
                         + "<input type='hidden' value='" + sourceid + "' />");
        $("#ulctxgoosenames").append(li);


        var closebutton = ($(sourcelement).children())[1];
        $(closebutton).removeClass("componentclose workflowcomponentchildinput").addClass("workflowcomponentclose");

        $(($(sourcelement).children())[3]).removeClass("workflowcomponentchildinput componentquestion").addClass("workflowcomponentquestion");

        $(($(sourcelement).children())[componentsubactioninputindex]).removeClass("componentsubactions workflowcomponentchildinput").addClass("workflowcomponentsubactions");


        // configure the parameters of the component
        var serviceuriinput = $(sourcelement).children()[2];
        if (node != null)
            $(serviceuriinput).val(node.serviceuri);
        var serviceuri = $(serviceuriinput).val();
        //alert(serviceuri);
        if (serviceuri == null || serviceuri.length == 0 || serviceuri.toLowerCase().indexOf('.jnlp') < 0)
        {
            if (window.localStorage != null)
            {
                var uri = window.localStorage.getItem(componentid); //(("component_" + nodecomponentid));
                //alert(uri);
                if (uri != null)
                    $(serviceuriinput).attr("value", uri);
            }
        }

        if (node != null) {
            var argumentsinput = $(sourcelement).children()[9];
            $(argumentsinput).val(node.arguments);
            var subactioninput = $(sourcelement).children()[componentsubactioninputindex];
            $(subactioninput).val(node.subaction);
            var datauriinput = $(sourcelement).children()[componentdatauriindex];
            $(datauriinput).val(node.datauri);
        }
        // set the node id
        var componentworkflownodeid = $(sourcelement).children()[8];
        $(componentworkflownodeid).val(nodeid);

        $($((sourcelement).children())[10]).val(wfcnt.toString());

        var canvasposition = $("#workflowcanvas").position();
        //var tableposition = $("#tblWorkflow").offset();
        //alert("Canvas top: " + canvasposition.top + "Canvas left: " + canvasposition.left);
        //alert("Table top: " + tableposition.top + "Table left: " + tableposition.left);
        var leftv = canvasposition.left + 10 + ((nodecnt % 2 == 0) ? 0 : 1) * 400;
        var topv = canvasposition.top + 10 + Math.floor(nodecnt / 2) * 250;
        var stylestr = "position: absolute; top: " + topv.toString() + "px; left: " + leftv.toString() + "px";
        //alert(stylestr);
        $(sourcelement).attr('style', stylestr);
        $(sourcelement).appendTo("#workflowcanvas");

        var srcWFEndpointOptions = {
                            anchor: "RightMiddle",
                            endpoint: "Dot",
                            isSource: true,
                            maxConnections: -1,
                            connector: "StateMachine",
                            connectorStyle: { strokeStyle: "#666" },
                            connectorOverlays: [
                                        ["Arrow", { width: 5, length: 15, location: 1, id: "arrow"}]
                                        //,["Label", {label:"Data", location:0.5, id: "connlabel", overlayClass: "dataLabel"}]
                                    ]
        };
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
        //alert("Node id: " + nodeid);
        if (nodeid.length > 0)
            WF_processednodes[nodeid] = sourcelement;

        //  set the component to be draggable
        jsPlumb.draggable(sourceid, {
            containment: "parent",
            helper: "original"
        });
    }
    //alert("component appended");
    $('.workflowcomponentclose').click(function(clickevent){RemoveComponent(clickevent.target)});
    wfcnt++;
    WF_nodecnt++;
    return nodeobj;
}

// Given a nodeid, search if it is already added to the workflow canvas.
// If not, create the node and add it to the workflow canvas
function SearchAndCreateNode(nodes, nodeid, nodecnt, componentarray, startnodeid) {
    var node = nodes[nodeid];
    var nodeobj = {};
    //alert(node);
    var nodecomponentid = node.componentid; // the id of the component in DB
    var componentname = node.name;
    if (nodecomponentid == undefined) {
        // This is a recorded workflow, we need to find out the componentid
        //alert(componentname);
        nodecomponentid = FindComponentId(componentname, componentarray);
        //alert("found component id: " + nodecomponentid);
    }

    if (nodecomponentid != null && nodecomponentid != "")
    {
        var sourceid = 'wfcid' + wfcnt.toString() + "_" + 'component_' + nodecomponentid;
        if (componentname == WF_startNode || nodeid == startnodeid)
            // Record the ID of the start node if there is one
            WF_startNode = sourceid;

        //alert(sourceid);

        // Find existing node for the same component
        //var searchstr = "[id*='_component_" + nodecomponentid + "']";
        var nodeelement = WF_processednodes[nodeid];
        //alert(elements.length);
        if (nodeelement == undefined) {
            //alert("add node");
            var componentid = "component_" + nodecomponentid; //  nodeid;
            //alert(componentid);
            nodeobj = AppendComponent(node, nodeid, componentid, sourceid, nodecnt);
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
    return null;
}

function ToggleCurrentWorkflowLink(currworkflowid, newworkflowid)
{
    if (currworkflowid != newworkflowid)
    {
        //alert(currworkflowid);
        if (currworkflowid != undefined && currworkflowid != "")
        {
            var liid = "liwf_" + currworkflowid;
            //alert("curr li ID: " + liid);
            var wflink = document.getElementById(liid);
            //$(wflink).css("list-style-type", "");
            $(wflink).removeClass("selectedworkflow");
            $(wflink).addClass("unselectedworkflow");
        }
        if (newworkflowid != undefined && newworkflowid != "")
        {
            var liid = "liwf_" + newworkflowid;
            //alert("new li ID: " + liid);
            var wflink = document.getElementById(liid);
            //alert($(wflink).css('list-style-image'));
            $(wflink).removeClass("unselectedworkflow");
            $(wflink).addClass("selectedworkflow"); //.css('list-style-image', "/static/images/righthand.jpg");
        }
    }
}

// Display a workflow fetched from the server
function DisplayWorkflow(flowdata, workflowid) {
    if (flowdata != undefined) {
        //alert("Display workflow...");
        ClearWorkflowCanvas();
        ToggleCurrentWorkflowLink(currWorkflowID, workflowid);
        currWorkflowID = workflowid.toString();
        currWorkflowName = flowdata.name;
        currWorkflowDesc = flowdata.desc;
        nodes_obj = flowdata.nodes;
        edges_obj = flowdata.edges;
        startnodeid = "";
        if (flowdata.startNode != undefined)
        {
            startnodeid = flowdata.startNode;
        }
        var processedNodes = {};

        //alert(edges_obj);
        //alert(edges_obj["0"]);
        //i = 0;
        WF_nodecnt = 0;
        WF_processednodes = {};
        var components = $("#componentstring").val(); //.attr("value");
        //alert(components);
        var componentarray = components.split(";");

        for (var key in nodes_obj)
        {
            //alert(key);
            SearchAndCreateNode(nodes_obj, key, WF_nodecnt++, componentarray, startnodeid);
        }

        var j = 0;
        while (edges_obj[j] != undefined) {
            edge = edges_obj[j.toString()];
            //alert(edge['sourcenodeid']);
            //alert(edge['target']);
            var sourcenode = SearchAndCreateNode(nodes_obj, edge['sourcenodeid'], WF_nodecnt, componentarray, startnodeid);
            //if (sourcenode.IsNew)
            //    nodecnt++;
            var targetnode = SearchAndCreateNode(nodes_obj, edge['targetnodeid'], WF_nodecnt, componentarray, startnodeid);
            if (sourcenode != null && targetnode != null)
            {
                //if (targetnode.IsNew)
                //    nodecnt++;
                var srcid = $(sourcenode.Element).attr('id');
                //alert(srcid);
                var targetid = $(targetnode.Element).attr('id');
                var lblid = "lbl_" + srcid + "_" + targetid;

                //alert("Connecting...");
                //alert(sourcenode.SourceEP.connectorOverlays[1]);

                // remove the default Label overlay.
                // if we do not do this, there will be two labels
                //sourcenode.SourceEP.connectorOverlays.pop();
                var c = jsPlumb.connect({
                    source: sourcenode.SourceEP,
                    target: targetnode.TargetEP,
                    //overlays: connoverlays
                    overlays: [
                                ["Arrow", { width: 5, length: 15, location: 1, id: "arrow"}],
                                ["Label", { label: edge['datatype'], location: 0.5}]
                            ]
                });
                ConnectionEstablished(c);
                //c.addOverlay(connoverlays);
                //label.setLabel(edge['datatype']);
            }
            j++;
        }

        $('._jsPlumb_overlay').editable(//'/workflow/saveedge',
                                            "/workflow/saveedge/", //SaveWorkflowEdge,
                                            { loadurl: "/workflow/getedgedatatypes/",
                                                type: "select",
                                                submit: "OK",
                                                callback : EditCallback,
                                                //onblur: "submit",
                                                //method : "post",
                                                placeholder: ""
                                                }
                                                );

        $(".workflowcomponentquestion").colorbox({inline: true, width: "50%"});
    }
}

function ClearWorkflowCanvas() {
    $("#workflowcanvas").empty();  // clean up the canvas
    //jsPlumb.deleteEveryEndpoint();
    jsPlumb.reset();
    WF_endpoints = {};
    wfcnt = 0;
    wflabelcnt = 0;
    WF_nodecnt = 0;
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
     var target = clicktarget;
     var component = $(target).parent();
     var componentid = $(component).attr("id");

     var componenttitlediv = ($(component).children())[componenttitledivindex];
     var componenttitlelink = ($(componenttitlediv).children())[componenttitlelinkindex];
     var ctxitemid = "#ctx_" + $(componenttitlelink).text();
     $(ctxitemid).remove();

     //alert($(component).attr("id"));

     // Make sure the components are placed with position:absolute. If using
     // relative position, removing a component will cause others to shift locations
     // and JSPlumb will display the endpoints incorrectly.
     // See the SearchAndCreateNode function for details.
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

function CheckSessions()
{
    //alert(currWorkflowID);
    if (currWorkflowID != '')
    {
        $.get("/workflow/sessions/" + currWorkflowID + "/",
                    function (result) {
                        //if (result['id'] != undefined && result['id'].length > 0)
                        var ul = ($("#divReport").children())[0];
                        $(ul).empty();
                        for (var key in result)
                        {
                            var session = result[key];
                            if (session != undefined)
                            {
                                var link = "<li class='unselectedworkflow' id=\"lisession_" + session['id']
                                 + "\"><label class='reportlabel'><input type='checkbox' /><a title=\" Retrieve the report of session run at " + session['date'] + "\" href='" + "javascript:GetWorkflowSessionReport(\"" + session['id'] + "\")'>" + session['date'] + "</a></label></li>";
                                //alert(link);
                                var liid = "lisession_" + session['id'];
                                //alert("li ID: " + liid);
                                var wflink = document.getElementById(liid);
                                //var wflink = $(liid);
                                //alert(wflink);
                                if (wflink == undefined)
                                    $(ul).append(link);
                                //else
                                //    $(wflink).html(link);
                                //ToggleCurrentSessionLink(currWorkflowID, result['id']);
                                //currWorkflowID = result['id'];
                            }
                        }
                        $('.workflowcomponentclose').click(function(clickevent){RemoveComponent(clickevent.target)});
                    }
                );
    }
    if (WF_timercnt < 10)
    {
        //alert("Check sessions: " + WF_timercnt);
        WF_timercnt++;
        setTimeout(function() { CheckSessions() }, 15000);
    }
}


function ToggleCurrentWorkflowSessionLink(currsessionid, newsessionid)
{
    //alert("Toggle: " + currsessionid);
    if (currsessionid != newsessionid)
    {
        //alert(currsessionid);
        if (currsessionid != undefined && currsessionid != "")
        {
            var liid = "lisession_" + currsessionid;
            //alert("curr li ID: " + liid);
            var sessionlink = document.getElementById(liid);
            //$(wflink).css("list-style-type", "");
            $(sessionlink).removeClass("selectedworkflow");
            $(sessionlink).addClass("unselectedworkflow");
        }
        if (newsessionid != undefined && newsessionid != "")
        {
            var liid = "lisession_" + newsessionid;
            //alert("new li ID: " + liid);
            var sessionlink = document.getElementById(liid);
            //alert($(wflink).css('list-style-image'));
            $(sessionlink).removeClass("unselectedworkflow");
            $(sessionlink).addClass("selectedworkflow"); //.css('list-style-image', "/static/images/righthand.jpg");
        }
    }
}


function GetWorkflowSessionReport(sessionid)
{
    if (sessionid != undefined && sessionid.length > 0)
    {
        //alert(currSessionID);
        ToggleCurrentWorkflowSessionLink(currSessionID, sessionid);
        currSessionID = sessionid;
        window.open("/workflow/session/" + sessionid + "/");
    }
}

function DeleteSessionReport()
{
    var jsonobj = {};
    var i = 0;
    $(".reportlabel").each(function()
    {
        var checkbox = $(this).children()[0];
        //alert(checkbox);
        if ($(checkbox).is(':checked'))
        {
            var parentli = $(this).parent();
            //alert("Parent li id: " + parentli.attr('id'));
            var parentid = parentli.attr('id');
            var splitted = parentid.split("_");
            var sessionid = splitted[1];
            //alert("sessionid: " + sessionid);
            jsonobj[i] = sessionid;
            i++;
        }
    });

    if (i > 0)
    {
        jQuery.ajax({
            url: "/workflow/deletesessionreports/",
            type: "POST",
            data: JSON.stringify(jsonobj),
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
                if (result == "1")
                {
                    for (var j = 0; j < i; j++)
                    {
                        var currSessionID = jsonobj[j];
                        var liid = "#lisession_" + currSessionID;
                        $(liid).remove();
                    }
                }
            }
        });
    }


    /*$.get("/workflow/deletesession/" + currSessionID + "/",
        function (data) {
            //alert("Get workflow " + wfid);
            //alert("Remove workflow: " + data);
            if (data == "1")
            {
                for (var j = 0; j < i; j++)
                {
                    var currSessionID = jsonObj[j];
                    var liid = "#lisession_" + currSessionID;
                    $(liid).remove();
                }
            }
        }
    ); */
}

function SaveCollectedData()
{
    var collecteddata = {};
    var userid = $("#authenticated").val();
    collecteddata['userid'] = userid;
    var data = {};
    var index = 0;
    var hasdatatosave = false;
    $("#ulGeneric").children().each(function() {
           //alert("dataspace div: " + $(this).html());
           //alert("li: " + $(this).html());
           var label = $(this).children()[0];
           //alert($(label).html());
           var link = $(label).children()[1];
           var linkobj = {};
           linkobj.text = $(link).text();
           linkobj.url = $(link).prop("href");
           var organisminput = $(label).children()[3];
           linkobj.organism = $(organisminput).val();
           var datatypeinput = $(label).children()[4];
           linkobj.datatype = $(datatypeinput).val();
           var dataidinput = $(label).children()[2];
           var dataid = $(dataidinput).val();
           if (dataid == null || dataid.length == 0)
           {
              //alert(dataid);
              hasdatatosave = true;
              dataid = WF_captureddataid.toString();
              WF_captureddataid--;
              dataidinput.setAttribute("id", ("cdata-" + dataid.toString()));
              dataidinput.setAttribute("value", dataid.toString());
           }
           linkobj.nodeindex = dataid;
           data[index.toString()] = linkobj;
           index++;
           //alert($(input).is(':checked'));
        });
        collecteddata['data'] = data;

        if (hasdatatosave) {
            //alert(JSON.stringify(collecteddata));
            jQuery.ajax({
               url: "/workflow/savecaptureddata",
               type: "POST",
               data: JSON.stringify(collecteddata), //({"name": "workflow", "desc": "Hello World", "userid": "1"}),
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
                   //alert(result);
                   if (result != null)
                   {
                       // Need to update the id of each saved data
                       var index = 0;
                       var finished = false;
                       do
                       {
                           var pair = result[index.toString()];
                           if (pair != null)
                           {
                              var originalindex = pair['nodeindex'];
                              var dataid = pair['id'];
                              var originalinputid = "#cdata-" + originalindex;
                              $(originalinputid).val(dataid);
                              index++;
                           }
                           else
                              finished = true;
                       }
                       while (!finished);
                       alert("Data saved");
                   }
               }
            });
        }
}

function DeleteCollectedData(selected)
{
    //alert("Delete collected data " + selected);
    var datatodelete = {};
    var data = {};
    var index = 0;
    var hasdatatodelete = false;

    $("#wfdataspace").children().each(function() {
        var uldata = $(this).children()[2];
        $(uldata).children().each(function() {
           //alert("dataspace div: " + $(this).html());
           //alert("li: " + $(this).html());
           var label = $(this).children()[0];
           //alert($(label).html());
           var input = $(label).children()[0];
           //alert($(input).is(':checked'));
           var dataidinput = $(label).children()[2];
           var dataid = $(dataidinput).val();
           //alert(dataid);
           if ($(input).is(':checked') == selected)
           {
               //elementstobedeleted.push($(this));
               if (dataid == null || dataid.length == 0 || parseInt(dataid) < 0)
               {
                  $(this).remove();
               }
               else {
                  hasdatatodelete = true;
                  var obj = {};
                  obj['id'] = dataid;
                  data[index.toString()] = obj;
                  index++;
                  $(this).remove();
               }
           }
        });
        datatodelete['data'] = data;
    });

    if (hasdatatodelete) {
        //alert(JSON.stringify(datatodelete));
        jQuery.ajax({
           url: "/workflow/deletecaptureddata",
           type: "POST",
           data: JSON.stringify(datatodelete), //({"name": "workflow", "desc": "Hello World", "userid": "1"}),
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
               //alert(result);
               if (result != null && result['id'] != null)
               {
               }
           }
        });
    }
}

// Insert data to target element
function InsertDataToTarget(targetid, linkpair)
{
    //alert("Insert data to target: " + targetid);
    if (targetid != null && linkpair != null)
    {
        var li = document.createElement("li");
        $(targetid).append($(li));
        var label = document.createElement("label");
        label.className = "dataspacelabel";
        $(li).append($(label));
        var checkbox = document.createElement("input");
        // If it is a predefined data, we cannot delete it, so there is no checkbox
        //var checkboxtype = (linkpair['userid'] == "0") ? "hidden" : "checkbox";
        checkbox.setAttribute("type", "checkbox");
        $(label).append($(checkbox));
        var url = linkpair['url'];
        var text = linkpair['text'];
        var link = document.createElement("a");
        link.href = url;
        link.innerHTML = text;
        //var html = "<a href='" + url + "'>" + text + "</a>";
        //alert(html);
        //$(link).html(html);
        $(label).append($(link));

        var idinput = document.createElement("input");
        idinput.setAttribute("type", "hidden");
        idinput.setAttribute("value", linkpair['id']);
        $(label).append($(idinput));

        //alert(linkpair['organism']);
        var organisminput = document.createElement("input");
        organisminput.setAttribute("type", "hidden");
        organisminput.setAttribute("value", linkpair['organism']);
        $(label).append($(organisminput));

        //alert(linkpair['datatype']);
        var datatypeinput = document.createElement("input");
        datatypeinput.setAttribute("type", "hidden");
        datatypeinput.setAttribute("value", linkpair['datatype']);
        $(label).append($(datatypeinput));
    }
}

function UploadDataFiles()
{
    WF_currOrganism = $("#organismSelect").val();
    $("#labelOrganism").html("Upload file for " + WF_currOrganism);
    $( "#dlgUploadData" ).dialog({
        resizable: false,
        height:400,
        width:450,
        modal: true,
        buttons: {
            "Upload": function() {
                var fileinput = document.getElementById('filesToUpload');
                if (fileinput.files.length > 0) {
                    var formdata = new FormData();
                    var userid = $("#authenticated").val();
                    formdata.append('userid', userid);
                    //alert(organismtype);
                    formdata.append('organismtype', WF_currOrganism);
                    var datatype = $('input[name="dataType"]:checked').val();
                    //alert(datatype);
                    formdata.append('datatype', datatype);
                    //alert(fileinput.files[0].name);
                    //formdata.append('file', fileinput.files);
                    for (var x = 0; x < fileinput.files.length; x++) {
                        formdata.append(fileinput.files[x].name, fileinput.files[x]);
                    }
                    //alert("Uploading...");
                    jQuery.ajax({
                        url: "/workflow/uploaddata",
                        type: "POST",
                        xhr: function () {  // custom xhr
                            myXhr = $.ajaxSettings.xhr();
                            if (myXhr.upload) { // check if upload property exists
                                //myXhr.upload.addEventListener('progress', progressHandlingFunction, false); // for handling the progress of the upload
                            }
                            return myXhr;
                        },
                        data: formdata,
                        cache: false,
                        contentType: false,
                        processData: false,
                        //            beforeSend: function (x) {
                        //                if (x && x.overrideMimeType) {
                        //                    x.overrideMimeType("application/json;charset=UTF-8");
                        //                }
                        //            },
                        success: function (result) {
                            //alert("Successfully uploaded files " + result);
                            //var organism = result['organism'];
                            //var datatype = result['datatype'];
                            //alert(organism);
                            if (result != null)
                            {
                                //alert(targetid);
                                var finished = false;
                                var index = 0;
                                do
                                {
                                   var pair = result[index.toString()];
                                   if (pair != null)
                                   {
                                       var targetid = "#ul";
                                       var organism = pair['organism'];
                                       var datatype = pair['datatype'];
                                       //alert(organism);
                                       if (organism == WF_currOrganism)
                                       {
                                            targetid += datatype;
                                       }

                                       //alert(targetid);
                                       if (targetid != "#ul")
                                           InsertDataToTarget(targetid, pair);
                                       index++;
                                   }
                                   else
                                      finished = true;
                                }
                                while (!finished);
                            }
                        }
                    });
                }
                $( this ).dialog( "close" );
            },
            Cancel: function() {
                $( this ).dialog( "close" );
            }
        }
    });
}

// Run the workflow against the selected data in a batch
// using the selected data application history
function BatchRun()
{
    //alert("Batch Run!");
    WF_selectedDataApplication = $("#selectDataAppliedHistory").val();
    //alert(selectedDataApplication);
    WF_batchedData = [];

    $(".dataspacelabel").each(function() {
        var input = $(this).children()[0];
        //alert($(input).prop("checked"));
        if ($(input).prop("checked"))
        {
           //alert($(this).children()[1]);
           var link = $(this).children()[1];
           var linkvalue = $(link).prop("href");
           //alert(linkvalue);
           WF_batchedData.push(linkvalue);
        }
    });
    //alert(checkValues[0]);

    var passDataApplicationCheck = true;
    if (parseInt(WF_selectedDataApplication) < 0)  {
        passDataApplicationCheck = false;
        // user didnt select a data application record
        $( "#dlgnodataapplicationalert" ).dialog({
                    resizable: false,
                    height:250,
                    modal: true,
                    buttons: {
                        "Yes": function() {
                            // Delete the workflow
                            $( this ).dialog( "close" );
                            WF_processWorkflow = true;
                            WF_currDatapoint = 0;
                            StartWorkflowForData();
                        },
                        Cancel: function() {
                            passDataApplicationCheck = false;
                            $( this ).dialog( "close" );
                        }
                    }
                });
    }

    if (passDataApplicationCheck)
    {
        if (WF_batchedData.length == 0)
        {
            alert("No data is selected.");
            return;
        }

        // Now we trigger the workflows
        WF_processWorkflow = true;

        // reset the notification check of the finish workflow dlg
        var notifypara = ("#dlgworkflowfinished").children()[1];
        var notifycheck = $(notifypara).children()[0];
        $(notifycheck).prop("checked", false);
        WF_batchrunNotification = true;

        WF_currDatapoint = 0;
        StartWorkflowForData();
    }
}

// Perform the workflow for a data point
function StartWorkflowForData()
{
    //alert("Starting workflow...");
    if (WF_batchedData != null && WF_currDatapoint < WF_batchedData.length)
    {
        var data = WF_batchedData[WF_currDatapoint];
        //alert(data);
        var splittedcids = WF_selectedDataApplication.split(";");
        for (var j = 0; j < splittedcids.length; j++)
        {
            //alert(splittedcids[j]);
            if (splittedcids[j].length > 0)
            {
                var cid = "#" + splittedcids[j];
                var dataurlelement = $(cid).children()[componentdatauriindex];
                $(dataurlelement).val(data);
            }
        }
        SubmitWorkflow(null);
    }
}

// Boss notification when a workflow has finished
// We can start the next one in the batch
function OnWorkflowFinished()
{
    if (WF_processWorkflow) {
        // Show the prompt dialog to ask user if they want to run all the rest in a batch
        var runnext = true;
        if (WF_batchrunNotification) {
            $( "#dlgworkflowfinished" ).dialog({
                                resizable: false,
                                height:250,
                                modal: true,
                                buttons: {
                                    "Yes": function() {
                                        // Delete the workflow
                                        $( this ).dialog( "close" );

                                    },
                                    "No": function() {
                                        runnext = false;
                                        $( this ).dialog( "close" );
                                    }
                                }
                            });
            var notifypara = ("#dlgworkflowfinished").children()[1];
            var notifiycheck = $(notifypara).children()[0];
            WF_batchrunNotification = $(notifiycheck).is(':checked');
        }

        if (runnext == true) {
            WF_currDatapoint++;
            StartWorkflowForData();
        }
    }
}


function GetSelectedData()
{
    WF_batchedData = [];

    $(".dataspacelabel").each(function() {
        var input = $(this).children()[0];
        //alert($(input).prop("checked"));
        if ($(input).prop("checked"))
        {
           //alert($(this).children()[1]);
           var link = $(this).children()[1];
           //alert(link);
           var linkvalue = $(link).prop("href");
           //alert(linkvalue);

           WF_batchedData.push(link);
        }
    });
}

function GroupData()
{
    GetSelectedData();
    if (WF_batchedData.length > 0) {
        var firstpara = $('#divDataspaceGroup').children()[0];
        var groupnameinput = $(firstpara).children()[0];
        $(groupnameinput).val("Group");
        $('#divDataspaceGroup').dialog( { height:300,
                   buttons: {
                       "OK": function() {
                           var groupname = $(groupnameinput).val();
                           // The group header ahref, its id must be set using WF_groupcnt
                           var ahrefelement = document.createElement('p');
                           ahrefelement.setAttribute("id", ("agrp_" + WF_groupcnt));
                           $(ahrefelement).html(groupname);
                           $(ahrefelement).text(groupname);
                           //alert("ahref");

                           var divelement = document.createElement("div");
                           divelement.className = "datagroupaccordiondiv";

                           var descdiv = document.createElement('div');
                           descdiv.className = "datagroupdescriptiondiv";
                           var groupdescpara = $('#divDataspaceGroup').children()[1];
                           var groupdescinput = $(groupdescpara).children()[0];
                           //alert($(groupdescinput).val());
                           $(descdiv).html($(groupdescinput).val());
                           $(divelement).append($(descdiv));

                           var ul = document.createElement("ul");
                           ul.className = "ulGroup";
                           $(divelement).append($(ul));
                           for (var i = 0; i < WF_batchedData.length; i++)
                           {
                               var li = document.createElement("li");
                               $(ul).append($(li));
                               var checkbox = document.createElement("input");
                               checkbox.setAttribute("type", "checkbox");
                               $(li).append($(checkbox));
                               var urlclone = WF_batchedData[i].cloneNode(true);
                               $(li).append($(urlclone));

                               // hidden input to store data id
                               var input = document.createElement("input");
                               input.setAttribute("type", "hidden");
                               input.setAttribute("id", ("agrp_" + WF_groupcnt + "_" + i));
                               $(li).append($(input));
                           }

                           //alert("Adding buttons");
                           // The hidden input that stores the group id
                           var hidden = document.createElement("input");
                           hidden.setAttribute("type", "hidden");
                           hidden.setAttribute("value", "");
                           $(divelement).append($(hidden));

                           // The hidden input that stores the group name
                           var hidden1 = document.createElement("input");
                           hidden1.setAttribute("type", "hidden");
                           hidden1.setAttribute("value", groupname);
                           $(divelement).append($(hidden1));
                           //alert("hidden1");

                           // The hidden input that stores id of the corresponding header in the
                           // accordion. We need this info for deleting the group header
                           var hidden2 = document.createElement("input");
                           hidden2.setAttribute("type", "hidden");
                           hidden2.setAttribute("value", WF_groupcnt);
                           $(divelement).append($(hidden2));
                           //alert("hidden2");

                           var selectbutton = document.createElement("input");
                           selectbutton.className = "button";
                           selectbutton.setAttribute("type", "button");
                           selectbutton.setAttribute("value", "Select All");
                           selectbutton.onclick = SelectAllInGroup;
                           $(divelement).append($(selectbutton));

                           // Open all the data of the group
                           var openbutton = document.createElement("input");
                           openbutton.className = "button";
                           openbutton.setAttribute("type", "button");
                           openbutton.setAttribute("value", "Open");
                           openbutton.onclick = OpenOneGroup;
                           $(divelement).append($(openbutton));

                           // Save the group
                           var savebutton = document.createElement("input");
                           savebutton.className = "button";
                           savebutton.setAttribute("type", "button");
                           savebutton.setAttribute("value", "Save");
                           savebutton.onclick = SaveOneGroup;
                           $(divelement).append($(savebutton));

                           // Delete the group
                           var deletebutton = document.createElement("input");
                           deletebutton.className = "button";
                           deletebutton.setAttribute("type", "button");
                           deletebutton.setAttribute("value", "Delete Group");
                           deletebutton.onclick = DeleteOneGroup;
                           $(divelement).append($(deletebutton));

                           // Delete the group
                           var deletedatabutton = document.createElement("input");
                           deletedatabutton.className = "button";
                           deletedatabutton.setAttribute("type", "button");
                           deletedatabutton.setAttribute("value", "Delete Selected");
                           deletedatabutton.onclick = DeleteDataInGroup;
                           $(divelement).append($(deletedatabutton));

                           var deletedatabutton1 = document.createElement("input");
                           deletedatabutton1.className = "button";
                           deletedatabutton1.setAttribute("type", "button");
                           deletedatabutton1.setAttribute("value", "Delete Unselected");
                           deletedatabutton1.onclick = DeleteDataInGroup;
                           $(divelement).append($(deletedatabutton1));


                           //$(divelement).html(newdivhtml);
                           //alert("Append elements " + $(ahrefelement).html());
                           $("#wfgrpaccordion").append($(ahrefelement));
                           $("#wfgrpaccordion").append($(divelement)).accordion('destroy').accordion({ active : -1});

                           WF_groupcnt--;
                           $('#divDataspaceGroup').dialog('close');
                           /*$('#wfgrpaccordion p').bind('click', function (event) {
                                  var source = event.target || event.srcElement;
                                  if (source != null)
                                  {
                                     //alert($(source).attr("id"));
                                     var srcid = $(source).attr("id");
                                     var splitted = srcid.split("_");
                                     var wfid = splitted[1];
                                     if (wfid != null)
                                     {
                                       //alert(wfid);
                                       GetWorkflow(wfid);
                                     }
                                  }
                               } );    */
                       },
                       "Cancel":  function() {
                          $('#divDataspaceGroup').dialog('close');
                       }
                   }
        });
    }
}

function SelectAllInGroup(event)
{
    var source = event.target || event.srcElement;
    if (source == null)
        source = event;
    if (source != null) {
        var text = $(source).val();
        //alert(text);
        var selectall = true;
        if (text == "Select All")
            $(source).val("Unselect All");
        else {
            selectall = false;
            $(source).val("Select All");
        }
        var divelement = $(source).parent();
        var grpul = $(divelement).children()[1];
        //alert(grpul);
        var datatoopen = {};
        $(grpul).children().each(function() {
            var checkbox = $(this).children()[0];
            //alert(checkbox);
            $(checkbox).prop('checked', selectall);
        });
    }
}

function SaveOneGroup(event)
{
   //alert("save group");
   var source = event.target || event.srcElement;
   if (source == null)
       source = event;
   if (source != null) {
       var datacnt = 0;
       var divelement = $(source).parent();
       //alert(divelement);
       var nameinput = $(divelement).children()[3];
       //alert(nameinput);
       var groupcntinpt = $(divelement).children()[4];
       var groupidinput = $(divelement).children()[2];
       var descdiv = $(divelement).children()[0];
       //alert($(descdiv).html());
       var grpul = $(divelement).children()[1];
       //alert(grpul);
       var datatoopen = {};
       $(grpul).children().each(function() {
           var link = $(this).children()[1];
           var idinput = $(this).children()[2];
           //alert($(link).text());
           //alert($(link).prop("href"));
           var linkobj = {};
           linkobj.text = $(link).text();
           linkobj.url = $(link).prop("href");
           linkobj.inputid = $(idinput).attr('id');
           alert(linkobj.inputid);
           datatoopen[("data" + datacnt)] = linkobj;
           datacnt++;
       });

       var userid = $("#authenticated").val();
       var groupid = $(groupidinput).val();
       var name = $(nameinput).val();
       var desc = $(descdiv).html();
       var jsonObj = ConstructDataGroupJSON(name, desc, groupid, userid, datatoopen);
       //alert(JSON.stringify(jsonObj));

       //alert("Send workflow");
       // Send the workflow data for saving
       jQuery.ajax({
           url: "/workflow/saveworkflowdatagroup",
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
               alert(result);
               //alert(($("#divWorkflow").children().length));
               if (result['id'] != undefined && result['id'].length > 0)
               {
                   alert("Group saved");
                   //ahrefelement.setAttribute("id", ("agrp_" + result['id']));
                   //divelement.setAttribute("id", ("divgrp_" + result['id']));
                   $(groupidinput).val(result['id']);
                   var contents = result['contents'];
                   var index = 0;
                   var finished = false;
                   do {
                      var content = contents[index.toString()];
                      if (content != null) {
                          //alert(content.inputid + " " + content.id);
                          $(("#" + content.inputid)).val(conent.id);
                          index++;
                      }
                      else
                          finished = true;
                   }
                   while (!finished);
               }
           }
       });
   }
}

function DeleteOneGroup(event)
{
    //alert("delete group");
    var source = event.target || event.srcElement;
    if (source == null)
        source = event;
    if (source != null) {
       var divelement = $(source).parent();
       var groupidinput = $(divelement).children()[2];
       var groupid = $(groupidinput).val();
       var groupcntinput = $(divelement).children()[4];
       var groupcnt = $(groupcntinput).val();
       if (groupid != null && groupid.length > 0)
       {
           // This group has already been saved

           //alert("Send workflow");
           // Send the workflow data for saving
           $.get("/workflow/deleteworkflowdatagroup/" + groupid + "/",
                   function (data) {
                       //alert("Get workflow " + wfid);
                       //alert("Remove workflow: " + data);
                       if (data == "1")
                       {
                           $(divelement).remove();
                           var grpahrefid = "#agrp_" + groupcnt;
                           $(grpahrefid).remove();
                       }
                   }
               );
       }
       else {
           $(divelement).remove();
           var grpahrefid = "#agrp_" + groupcnt;
           $(grpahrefid).remove();
       }
    }
}

function DeleteDataInGroup(event)
{
    var source = event.target || event.srcElement;
    if (source == null)
        source = event;
    if (source != null) {
       //alert($(source).val());
       var selected = ($(source).val() == "Delete Selected") ? true : false;
       var divelement = $(source).parent();
       var groupidinput = $(divelement).children()[2];
       var groupid = $(groupidinput).val();
       var groupcntinput = $(divelement).children()[4];
       var groupcnt = $(groupcntinput).val();
       var grpul = $(divelement).children()[1];
       //alert(groupid);
       var datatodelete = {};
       var dataindex = 0;
       $(grpul).children().each(function() {
            var checkbox = $(this).children()[0];
            if ($(checkbox).is(':checked') == selected) {
                if (groupid == null || groupid.length == 0)
                {
                   $(this).remove();
                }
                else {
                    var idinput = $(this).children()[2];
                    //alert($(idinput).val());
                    if ($(idinput).val() != null && $(idinput).val().length > 0) {
                        var link = {};
                        link.id = $(idinput).val();
                        datatodelete[dataindex.toString()] = link;
                        dataindex++;
                    }
                }
            }
       });

       if (groupid != null && groupid.length > 0)
       {
           var jsonObj = {};
           jsonObj.id = groupid;
           jsonObj.data = datatodelete;

           // This group has already been saved
           //alert("Send workflow");
           // Send the workflow data for saving
           jQuery.ajax({
                  url: "/workflow/deleteworkflowgroupitem",
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
                      if (result['id'] != undefined && result['id'].length > 0)
                      {
                          //alert("Data deleted");
                          //ahrefelement.setAttribute("id", ("agrp_" + result['id']));
                          //divelement.setAttribute("id", ("divgrp_" + result['id']));
                          $(grpul).children().each(function() {
                              var checkbox = $(this).children()[0];
                              if ($(checkbox).is(':checked') == selected) {
                                  $(this).remove();
                              }
                          });
                      }
                  }
              });
       }
    }
}

function OpenOneGroup(event)
{
  var source = event.target || event.srcElement;
  if (source == null)
      source = event;
  if (source != null) {
      var grpul = $(source).parent().children()[1];
      var datatoopen = [];
      $(grpul).children().each(function() {
          var checkbox = $(this).children()[0];
          var link = $(this).children()[1];
          if ($(checkbox).is(':checked'))
            datatoopen.push(link);
      });
      OpenDataGroup(datatoopen);
  }
}

function OpenDataGroup(group)
{
    if (group.length > 0)
    {
          //ClearWorkflowCanvas();
          $('#divDataspaceComponentMenu').dialog( { height:400,
            buttons: {
                "Open": function() {
                    // Get all the selected data
                    $("#ulctxcomponents").children().each(function() {
                           var checkbox = $(this).children()[0];
                           if ($(checkbox).prop('checked'))
                           {
                              var inputcomponentid = $(this).children()[1];
                              //alert($(inputcomponentid).val());
                              var sourceid = 'wfcid' + wfcnt.toString() + "_" + $(inputcomponentid).val();
                              // Append the selected goose to the canvas
                              var nodeobj = AppendComponent(null, "", $(inputcomponentid).val(), sourceid, WF_nodecnt);
                              var sourceelement = nodeobj.Element;

                              //alert($(sourceelement).attr("id"));
                              // Process the batched data
                              // Add data to the data uri field according to namelist or URL options
                              var datauri = "";
                              var prefix = ($("#inputNameValue").prop('checked')) ? "Namelist:" : "URL:";
                              datauri = prefix;
                              for (var i = 0; i < group.length; i++)
                              {
                                  var datalink = group[i];
                                  var data = $(datalink).prop("href");
                                  if ($("#inputNameValue").prop('checked'))
                                      data = $(datalink).text();
                                  datauri += (data + ";");
                              }

                              //alert(datauri);
                              var datauriinput = $(sourceelement).children()[componentdatauriindex];
                              //alert(datauriinput)
                              $(datauriinput).val(datauri);

                              // Now we form the workflow of this new component and submit the workflow to Boss
                              var nodelist = [];
                              nodelist.push(nodeobj.Element);
                              SubmitWorkflow(nodelist);
                           }
                    });
                    //SubmitWorkflow();
                    //$('#divDataspaceComponentMenu').dialog('close');
                },
                "Close": function() {
                    $('#divDataspaceComponentMenu').dialog('close');
                }

            }
          });
          //$('#divDataspaceMenu').dialog('open');
    }
    else
        alert("No data is selected!");
}

// Open a group of data in a goose
// User can specify whether to open the URL or the name list
function GroupOpen()
{
    //alert("Open data...");
    GetSelectedData();
    OpenDataGroup(WF_batchedData);
}

function FindComponent(gname)
{
    $("#components").children().each(function() {
        //alert($(this).attr("id"));
        // Make all the child fields visible
        // include workflow index in component name
        var titleelement = ($(this).children())[0];
        var titleahref = ($(titleelement).children())[0];
        var goosename = $(titleahref).text();
        if (gname.indexOf(goosename) >= 0)
            return $(this);
    });
    return null;
}

// Check if a goose has already been added to the workflow canvas
function GetGooseFromCanvas(gooseid)
{
    if (gooseid.indexOf("_") >= 0)
    {
        return $("#" + gooseid);
    }

    var nodes = $("#workflowcanvas").children();
    if (nodes.length > 0)
    {
        for (var i = 0; i < nodes.length; i++)
        {
            var source = nodes[i];
            var titleelement = ($(source).children())[componenttitledivindex];
            var goosename = $(titleahref).text();
            if (gooseid.indexOf(goosename) >= 0) {
                return source;
            }
        }
    }
    return null;
}

function HandleGooseRecording(gooseid)
{
    //alert(gooseid);
    var component = GetGooseFromCanvas(gooseid);
    if (component == null)
    {
        // The component is not there, we need to insert it to the canvas
        //alert(gooseid);
        var goosecomponent = FindComponent(gooseid);
        if (goosecomponent != null) {
            var inputcomponentid = $(goosecomponent).children()[1];
            var sourceid = 'wfcid' + wfcnt.toString() + "_" + $(inputcomponentid).val();
            component = AppendComponent(null, "", $(inputcomponentid).val(), sourceid, WF_nodecnt);
        }
    }
    return component;
}

function ConnectNodes(source, target)
{
    //alert("connect nodes...");
    var connectionList = jsPlumb.getConnections();
    var found = false;
    //alert(connectionList.length);
    for (i = 0; i < connectionList.length; i++) {
        var conn = connectionList[i];
        var src = conn.source;
        var trgt = conn.target;

        if (src != null && target != null && source != null && target != null) {
            if (source.attr("id") == src.attr("id") && target.attr("id") == trgt.attr("id")) {
                found = true;
                break;
            }
        }
    }
    if (!found) {
        var sourceid = source.attr("id");
        var targetid = target.attr("id");
        //alert(sourceid + " " + targetid);
        var srcEP = WF_endpoints[sourceid].SourceEP;
        //alert(srcEP);
        var targetEP = WF_endpoints[targetid].TargetEP;
        var c = jsPlumb.connect({
            source: srcEP,
            target: targetEP,
            //overlays: connoverlays
            overlays: [
                        ["Arrow", { width: 5, length: 15, location: 1, id: "arrow"}],
                        ["Label", { label: "data", location: 0.5}]
                    ]
        });
        ConnectionEstablished(c);
    }
}

// Receive the recording info from Boss and update the workflow
function UpdateRecordingInfo(params)
{
    //alert("Recording info received " + params);
    // We get the recording info, update workflow canvas
    if (params != null)
    {
        var paramstring = params;
        var paramssplitted = paramstring.split(";");
        var datatype = paramssplitted[0];
        var source = paramssplitted[1];
        var target = paramssplitted[2];
        //alert(source + " " + target);

        if (source != target) {
            var src = HandleGooseRecording(source);
            var trgt = HandleGooseRecording(target);
            ConnectNodes(src, trgt);
        }
    }
}


// Save the current state (i.e., all the opened geese and the data they are processing)
function SaveState()
{
    $('#dlgSaveState').dialog( { height:300,
        buttons: {
            "Save": function() {
                // Save state
                var userid = $("#authenticated").val();
                var p1 = ($("#dlgSaveState").children())[0];
                var nameinput = ($(p1).children())[0];
                var name = $(nameinput).val();

                var p2 = ($("#dlgSaveState").children())[1];
                var descinput = ($(p2).children())[0];
                var desc = $(descinput).val();
                //alert(userid);
                $('#dlgSaveState').dialog('close');

                var proxy = get_proxyapplet();
                if (proxy != undefined) {

                    //alert(name + " " + desc);
                    proxy.SaveStateDelegate(userid, name, desc);
                    //alert("workflow action done");
                }

            },
            "Cancel": function() {
                $('#dlgSaveState').dialog('close');
            }

        }
    });

}

function OnSaveState(param)
{
    //alert("state saved " + param);
    // Insert into saved state accordion

    /*<a href='#' id='astate_{{state.ID|stringformat:"i"}}'>{{state.name}}</a>
    <div id='divstate_{{datagroup.ID|stringformat:"i"}}'>
        <div>{{state.description}}</div>
        <input type="hidden" value='{{state.ID|stringformat:"i"}}' />
        <input type="button" value="Load" class="button" onclick="javascript:LoadState(this);" />
        <input type="button" value="Delete" class="button" onclick="javascript:DeleteState(this);" />
    </div> */
    var splitted = param.split(";;");
    var name = splitted[1];
    var desc = splitted[2];
    var stateid = splitted[0];
    //alert(name + " " + desc + " " + stateid);
    var newhtml = "<a href='#' id='astate_" + stateid + "'>" + name + "</a>";
    var newdivhtml = "<div>" + desc + "</div><input type='hidden' value='" + stateid
                        + "' /><input type='button' value='Load' class='button' onclick='javascript:LoadState(this);' />"
                        + "<input type='button' class='button' value='Delete' onclick='javascript:DeleteState(this);' />";
    //alert(newhtml);
    //alert(newdivhtml);
    //alert($(wfdivid));

    var ahrefelement = document.createElement('p');
    ahrefelement.setAttribute("id", 'astate_' + stateid);
    $(ahrefelement).text(name);
    var divelement = document.createElement("div");
    divelement.setAttribute("id", ("divstate_" + stateid));
    $(divelement).html(newdivhtml);
    //alert("Append elements " + $(ahrefelement).html());
    $("#divstatedataaccordion").append($(ahrefelement));
    $("#divstatedataaccordion").append($(divelement)).accordion('destroy').accordion({ active : -1});
}


function LoadState(event)
{
    var source = event.target || event.srcElement;
    if (source == null)
        source = event;
    if (source != null) {
        var divelement = $(source).parent();
        var stateidinput = $(divelement).children()[1];
        var stateid = $(stateidinput).val();
        //alert(stateid);
        var proxy = get_proxyapplet();
        if (proxy != undefined) {
            //alert("Submit workflow to boss");
            proxy.LoadStateDelegate(stateid);
            //alert("workflow action done");
        }
    }
}

function DeleteState(event)
{
    var source = event.target || event.srcElement;
    if (source == null)
        source = event;
    if (source != null) {
       var divelement = $(source).parent();
       var stateidinput = $(divelement).children()[1];
       var stateid = $(stateidinput).val();
       //alert(stateid);

       if (stateid != null && stateid.length > 0)
       {
           //var jsonObj = {};
           //jsonObj.id = stateid;

           // This group has already been saved
           //alert("Send workflow");
           // Send the workflow data for saving
           $.get("/workflow/deletesavedstate/" + stateid + "/",
               function (data) {
                   //alert("Get workflow " + wfid);
                   //alert("Remove workflow: " + data);
                   if (data == "1")
                   {
                       $(divelement).remove();
                       var stateahrefid = "#astate_" + stateid;
                       $(stateahrefid).remove();
                   }
               }
           );
       }
    }
}

jsPlumb.ready(function () {
    jsPlumb.Defaults.Container = $(".main");

    // Bind to the connection established event
    jsPlumb.bind("jsPlumbConnection", ConnectionEstablished);
    //jsPlumb.bind("click", ConnectionClicked);
});


// Global variables
var java_socket_bridge_ready_flag = false;

function get_proxyapplet() {
    return document.getElementById('GaggleProxy');
}

function ConnectToGaggle() {
    var proxy = get_proxyapplet();
    if (proxy != undefined) {
        //alert("Connecting to gaggle");
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
        //alert("Submit workflow to boss");
        proxy.SubmitWorkflow(jsonworkflow);
        //alert("workflow action done");
    }
}

// change the style of the workflow component according to the status
function SetWorkflowStatus(componentid, status)
{

}


// Applet reports it is ready to use
function java_socket_bridge_ready() {
    //alert("Proxy ready!");
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

