var pageGaggleData = [];

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

    // Parse gaggled data
    output.gaggledData = gaggleMicroformat.scan(document);
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
}

document.addEventListener("GaggleDataAddEvent", gaggleDataAddHandler, false);