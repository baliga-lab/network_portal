var pageGaggleData = [];
var dictGeese = {
                 "DAVID": david,
                 "KEGG": kegg,
                 "EMBLString": emblString,
                 "EGRIN2": egrin2,
                 "HaloAnnotation": haloAnnotation,
                 "EntrezGene": entrezGene,
                 "EntrezProtein": entrezProtein,
                 "Maggie": maggie
                };

function GaggleOutputCtrl($scope) {
  $scope.outputs = {};

  $scope.addOutput = function(output) {
    ($scope.outputs)[output.id] = output;
  };
}

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}

function gaggleDataAddHandler(e) {
    console.log("GaggleDataAddEvent captured...");
    var funcname = e.detail.funcname;
    var species = e.detail.species;
    console.log("Function name: " + funcname + " Species: " + species);
    var output = {};
    output.id = generateUUID();
    output.funcname = funcname;
    output.species = species;
    output.enrichments = [];
    output.properties = [];
    var index = 0;
    // Parse enrichment results
    $("#divNewGaggledData").find(".gaggle-enrichment").each(function() {
        (output.enrichments).push([]);
        $(this).find("label").each(function () {
            var input1 = $(this).children()[0];
            var input2 = $(this).children()[1];
            var input3 = $(this).children()[2]; // type
            console.log("Property " + $(input1).val() + " Value " + $(input2).val() + " Type: " + $(input3).val());
            if (index == 0) {
                output.properties.push($(input1).val());
            }
            console.log("Enrichments index: " + index);
            var proppair = {};
            proppair.value = $(input2).val();
            proppair.type = $(input3).val();
            (output.enrichments)[index].push(proppair);
        });
        //console.log("One enrichment: " + enrichment);
        //(output.enrichments)[index] = enrichment;
        index++;
    });
    console.log("Output enrichments: " + output.enrichments);

    $("#divNewGaggledData").find(".gaggle-plotexpression").each(function() {
        var inputurl = $(this).children()[0];
        var ploturl = $(inputurl).val();
        console.log("Gaggle plot url: " + ploturl);
        output.ploturl = ploturl;
    });

    // Parse gaggled data
    output.gaggledData = gaggleMicroformat.scan("#divNewGaggledData");
    if (output.gaggledData != null) {
        for (var i = 0; i < output.gaggledData.length; i++) {
            var data = (output.gaggledData)[i];
            // Call the lazy parser
            var fetcheddata = data.getData();
            console.log(data.getData());
        }
    }
    console.log("Output gaggled data: " + output.gaggledData);

    var scope = angular.element($("#divGaggleOutput")).scope();
        scope.$apply(function(){
            scope.addOutput(output);
        })

    $("#divNewGaggledData").prop("id", "");
    $(".divGaggleOutputUnit").draggable();
    $(".divGaggleOutputUnit").resizable();
}

function getOrganisms() {
    //alert("Get organism from " + GAGGLE_SERVER); // + "/workflow/getorganisms);
    cg_util.httpGet(GAGGLE_SERVER + "/workflow/getorganisms", function(jsonorganisms) {
        // Get organisms from network portal
        var organismsobj = JSON.parse(jsonorganisms);
        // Generate the organism selection html
        var organismSelectionHtml = "<option value=''>Select an organism</option>";
        for (var i in organismsobj) {

            var organism = organismsobj[i];
            organismSelectionHtml += "<option value='" + organism.shortname + "'>" + organism.name + "</option>";
        }
        $("#selSpecies").html(organismSelectionHtml)
    });
}


function generateNamelist(species, nameliststring)
{
    if (nameliststring != null && nameliststring.length > 0)
    {
        console.log("Generating namelist from " + nameliststring);
        var list = new Array();
        var splitted = nameliststring.split("\n");
        for (var i = 0; i < splitted.length; i++)
        {
            var line = splitted[i];
            console.log("Line: " + line);
            var delimitted = line.split(";");
            if (delimitted.length == 1)
                delimitted = line.split("\t");
            if (delimitted.length == 1)
                delimitted = line.split(",");
            for (var j = 0; j < delimitted.length; j++) {
                console.log("Name " + delimitted[j]);
                list.push(delimitted[j]);
            }
        }
        var namelist = new GaggleData("", "NameList", list.length, species, list);
        return namelist;
    }
    return null;
}

function getNamelist(callback)
{
    var species = $("#selSpecies").val();
    //alert("Species: " + species);
    var line = $("#inputNamelistText").val();
    if (line != null && line.trim().length > 0) {
        var names = line.split(";");
        var namelist = new GaggleData("", "NameList", names.length, species, names);
        if (callback != null)
            callback(namelist);
    }
    else {
        var file = $("#inputNamelistFile")[0].files[0];
        if (file != null) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var contents = e.target.result;
                console.log( "Got the file.\n"
                  +"name: " + file.name + "\n"
                  +"type: " + file.type + "\n"
                  +"size: " + file.size + " bytes\n"
                  + "Content: " + contents
                );
                var namelist = generateNamelist(species, contents);
                if (callback != null)
                    callback(namelist);
            }
            reader.readAsText(file);
        }
    }
}

function processNamelist()
{
    getNamelist(function(namelist) {
        if (namelist == null)
            return;

        //alert("Namelist species " + namelist.getSpecies());
        $("input:checkbox.chkboxGeese").each(function () {
            if (this.checked) {
                //alert("checkbox value: " + $(this).val() + " dictionary " + dictGeese);
                var goose = dictGeese[$(this).val()];
                if (goose != null && goose.handleNameList != null) {
                    console.log("Passing namelist to " + $(this).val());
                    goose.handleNameList(namelist);
                }
            }
        });
    });
}

function removeAllResults()
{
    $(".divResultIFrames").empty();
}

// Other data source can pass data to this page by firing the GaggleDataAddEvent
document.addEventListener("GaggleDataAddEvent", gaggleDataAddHandler, false);

$(document).ready(function () {
    console.log("Get organisms...");
    getOrganisms();
});