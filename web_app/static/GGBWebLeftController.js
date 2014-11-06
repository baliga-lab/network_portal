app.controller("GGBWebLeftPaneCtrl", function($scope, $sce) {
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

    $scope.values = [];
    $scope.values.push(["NP_415256.1", "chromosome+:762237-763403", "NP_415256.1"]);

    angular.element(document).ready(function () {
       console.log('left document loaded...');
       leftcontentLoaded();
    });
});

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

    d3.csv("data/PurRRegulates.csv", function(d) {
        console.log(d);
        window["regulates"] = d;
        init();
    });



    // Load ecoli info from network portal
    console.log("Loading species data...");
    $.ajax({
      url: "http://networks.systemsbiology.net/dvu/genes/?format=tsv",
    }).done(function(data) {
      console.log(data);
      if (data != null) {
          var lines = data.split("\n");
          console.log("Gene info " + lines.length + " lines");
          var line = lines[0];
          var splitted = line.split('\t');
          console.log("Fields " + splitted);

          var circle_vis = new vq.CircVis();
          $.ajax({
              url: '/json/circvis/?species=1&gene=NP_415256.1',
                success: function(json) {
                    var circle_vis = new vq.CircVis();
                    var cvdata = vqhelpers.makeCircVisData($('#CircVis_div')[0], json.chromosomes,
                        json.genes, json.network);
                    circle_vis.draw(cvdata);
                },
                error: function() {
                    console.debug('could not read data');
                }
          });

         //var scope = angular.element($("#divLeftPane")).scope();
         //scope.$apply(function(){
         //    scope.loadGeneOfSpecies(data);
         //});
      }
    });
}
//);