app.controller("GGBWebLeftPaneCtrl", function($scope, $sce, GGBWebDataService) {
    $scope.columnDefs = [];
    var columndef = {"sTitle": "Gene"};
    var targets = [];
    targets.push(0);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    columndef = {"sTitle": "Position"};
    targets = [];
    targets.push(1);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    columndef = {"sTitle": "Info"};
    targets = [];
    targets.push(2);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    columndef = {"sTitle": ""};
    targets = [];
    targets.push(3);
    columndef["aTargets"] = targets;
    $scope.columnDefs.push(columndef);

    $scope.modules = null;

    // Test
    /*var module = {};
    module["moduleId"] = 1;
    module.geneinfolist = [];
    module.geneinfolist.push(["NP_415256.1", "chromosome+:762237-763403", "NP_415256.1",
                              "<button onclick=\"angular.element(this).scope().selectRow(event)\">Show</button>"]);
    $scope.modules = [];
    $scope.modules.push(module); */

    $scope.addModules = function(modules) {
        console.log("Left pane controller adding modules info");
        $scope.modules = modules;
    }

    $scope.selectRow = function(event) {
        var target = event.target;
        if (target != null) {
            var gene = $(target).closest('tr').find('td:first').text();
            var circle_vis = new vq.CircVis();
            var geneurl = '/json/circvis/?species=1&gene=' + gene;
            $.ajax({
                  url: geneurl,
                    success: function(json) {
                        var circle_vis = new vq.CircVis();
                        var cvdata = vqhelpers.makeCircVisData($('#CircVis_div')[0], json.chromosomes,
                            json.genes, json.network);
                        circle_vis.draw(cvdata);
                        $("#divLeftPane").scrollTop();
                    },
                    error: function() {
                        console.debug('could not read data');
                    }
            });
        }
    }

    // Listen to state changes from other controllers
    $scope.$on('state.update', function(newState) {
        console.log("State update received");
        $scope.values = [];
        $scope.values.push(["NP_415256.5", "chromosome+:762237-763403", "NP_415256.5"]);
    });


    angular.element(document).ready(function () {
       console.log('left document loaded...');
       leftcontentLoaded();
    });
});

function binaryIndexOf(searchElement, source) {
    var minIndex = 0;
    var maxIndex = source.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = source[currentIndex];

        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }

    return -1;
}

var genedata = null;
//$(document).ready(function () {
function leftcontentLoaded() {
    document.addEventListener("GoosePageDataEvent", function(e) {
        console.log("GGBWeb received data from Goose event: " + e.detail.data);
        try {
            var data = e.detail.data;
            if (data != null) {
                console.log("Data: " + data);
                var jsondata = JSON.parse(data);

            }
        }
        catch (e) {
            console.log(e);
        }
    });

    /*
    For Ilustration purpose, here We'll read a flat-file (.csv) and
    load it as a track (trackCircle - to map regions of interest agains the whole genome vis).

    */
    console.log("Loading igbweb data...");
    $('body').layout({
        applyDefaultStyles: true,
        north: {
            minSize: "65"
        },
        west: {
            minSize: "500"
        },
        east: {
            minSize: "400"
        }
    }); //   ({ applyDefaultStyles: true });
    $( "#tabs" ).tabs();

    d3.csv("PurRRegulates.csv", function(d) {
        console.log(d);
        window["regulates"] = d;
        init();
    });

    // Load ecoli info from network portal
    console.log("Loading species data...");
    $.ajax({
      url: "http://networks.systemsbiology.net/eco/genes/?format=tsv"
    }).done(function(data) {
      console.log("Received gene data " + data);
      genedata = data;
      if (genedata != null) {
          $.ajax({
                url: "http://networks.systemsbiology.net/eco/modgenes/export"
          }).done(function(modulegenes) {
              console.log("Got module gene info " + modulegenes);
              var genelines = genedata.split("\n");
              var geneinfolist = {};
              for (var i = 0; i < genelines.length; i++) {
                   var geneline = genelines[i];
                   console.log("Gene info line: " + geneline)
                   var genelinesplitted = geneline.split("\t");
                   var genename = genelinesplitted[0];
                   console.log("Gene name: " + genename);
                   geneinfolist[genename] = [];
                   for (var j = 1; j < genelinesplitted.length; j++) {
                       console.log("Gene line field " + j + ": " + genelinesplitted[j]);
                   }
                   geneinfolist[genename].push(genelinesplitted[0]);
                   geneinfolist[genename].push(genelinesplitted[genelinesplitted.length - 1]);
                   geneinfolist[genename].push(genelinesplitted[1] + " " + genelinesplitted[2]);
              }

              var lines = modulegenes.split("\n");
              console.log("Module Gene info " + lines.length + " lines");
              var modules = [];
              for (var i = 1; i < lines.length; i++) {
                  var line = lines[i];
                  if (line == null)
                     continue;
                  var splitted = line.split('\t');
                  if (splitted == null)
                     continue;
                  console.log("Fields " + splitted);
                  if (splitted.length < 1)
                     continue;
                  var moduleId = parseInt(splitted[0]);
                  console.log("Module Id: " + moduleId);
                  var genes = splitted[1];
                  if (genes == null)
                     continue;
                  var module = {};
                  module.moduleId = moduleId;
                  module.geneinfolist = [];
                  modules.push(module);
                  var genesplitted = genes.split(":");
                  for (var j = 0; j < genesplitted.length; j++) {
                      var gene = genesplitted[j];
                      // Now we try to find the gene info from the gene data
                      var geneinfo = geneinfolist[gene];
                      if (geneinfo != null) {
                          geneinfo.push("<button onclick=\"angular.element(this).scope().selectRow(event)\">Show</button>");
                          module.geneinfolist.push(geneinfo);
                      }
                  }
              }

              var scope = angular.element($("#divLeftPane")).scope();
              scope.$apply(function(){
                  scope.addModules(modules);
              });
          });
      }
    });
}