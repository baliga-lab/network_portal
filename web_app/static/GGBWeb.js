var app = angular.module('GGBWebApp', ['ngSanitize', 'ui.bootstrap']);

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
});

app.directive('gaggleTable', function() {
    return function(scope, element, attrs) {
        options = {
            "bStateSave": true,
            "iCookieDuration": 2419200, /* 1 month */
            "bJQueryUI": true,
            "bPaginate": true,
            "bLengthChange": false,
            "bFilter": true,
            "bInfo": true,
            "bDestroy": true
        };

        var explicitColumns = [];
        element.find('th').each(function(index, elem) {
            explicitColumns.push($(elem).text());
        });
        if (explicitColumns.length > 0) {
            options["aoColumns"] = explicitColumns;
        } else if (attrs.aoColumns) {
            options["aoColumns"] = scope.$eval(attrs.aoColumns);
        }

        if (attrs.aoColumnDefs) {
            options["aoColumnDefs"] = scope.$eval(attrs.aoColumnDefs);
        }

        var dataTable = element.dataTable(options);

        scope.$watch(attrs.aaData, function(value) {
            /*var val = value || null;
            if (val) {
                dataTable.fnClearTable();
                dataTable.fnAddData(scope.$eval(attrs.aaData));
            }
            $('body').layout({ applyDefaultStyles: true });
            $( "#tabs" ).tabs(); */
        });
    }
});


// Each track can have it's own configuration (e.g. scale, color). Here is an example for the heatmap tracks:
var optionsheatmap_replicates = {
 "name": "exp__",
 "maxValue":1,
 "minValue":0,
 "yPosition": 50,
 "gridSize": 40,
 "height": 18
};
var optionsheatmap = {
 "name": "exp_",
 "maxValue":1,
 "minValue":0,
 "yPosition": 80,
 "gridSize": 40,
 "height": 18
};

// Let's set the transitionSet for the Use Case 2:



 function getDataFromTrackManager(registerTracks, id_sequenceElement, start, stop, url){
         this.registerTracks = registerTracks || {};

         alert(url);
         $.ajax( {
               type:'Get',
               dataType: "application/json",
               url: url + id_sequenceElement + "/"+ (start) + "/" + (stop),
              success:function(json) {
                   var data = JSON.parse(json);
                   //debugger
                   registerTracks.track1.data = data.All[0].forms;
               },
               error: function(e, xhr){
                   console.log("error: " + e); debugger
                 },
                async:false,
                     dataType:"text",
               });
         return this.registerTracks;
 }


 function getDataForTrackSet(registerTracks, id_sequenceElement, start, stop, url){
         var transition_set_obj = {};
         //debugger
         console.log(id_sequenceElement)
         console.log(start)
         console.log(stop)
         $.ajax( {
               type:'Get',
               dataType: "application/json",
               url: url + id_sequenceElement + "/"+ (start) + "/" + (stop),
              success:function(json) {
                   var data = JSON.parse(json);
                   /*
                     Creating and populating transitionSet-type object

                   */
                   var optionsheatmap_replicates = {
                                 "name": "exp__",
                                 "maxValue":1,
                                 "minValue":0,
                                 "yPosition": 50,
                                 "gridSize": 40,
                                 "height": 18

                                 };
                   var optionsheatmap = {
                                 "name": "exp_",
                                 "maxValue":1,
                                 "minValue":0,
                                 "yPosition": 80,
                                 "gridSize": 40,
                                 "height": 18

                                 };
                   transition_set_obj = {
                       trackType: "trackQuantitativeSegment",
                       elemid: "div_button",
                           samples: {
                             sample2:{
                             buttonName:"PurR_glucose",
                             "element_id": "unico",
                             data : data.TrackSets[1].QuantitativeSegment3,
                               pairing :{
                               breakpoint2:{
                                 type: "trackBreakpoint",
                                 "element_id": "bk_element", //same name as first object
                                 data: data.TrackSets[3].QuantitativePositional5,
                                 options: {
                                 "name": "breakpoint",
                                 "maxValue":1,
                                 "minValue":0,
                                 "yPosition": 150,
                                 "height": 18,
                                 "breakpointWidth": 100
                                 }
                               },
                               expression_wild_glucose:{
                                 type: "trackHeatmap",
                                 "element_id": "exp_",
                                 data: data.TrackSets[5].QuantitativeSegment7,
                                 options: optionsheatmap
                               },
                               expression_wild_glucose_replicate:{
                                 type: "trackHeatmap",
                                 "element_id": "exp__",
                                 data: data.TrackSets[9].QuantitativeSegment11,
                                 options: optionsheatmap_replicates
                               }
                             }
                           },
                           sample1: {
                             buttonName:"PurR_adenine",
                             "element_id": "unico",
                             data : data.TrackSets[0].QuantitativeSegment2,
                             pairing :{
                               breakpoint:{
                                 type: "trackBreakpoint",
                                 "element_id": "bk_element",
                                 data: data.TrackSets[2].QuantitativePositional4,
                                 options: {
                                 "name": "breakpoint",
                                 "maxValue":1,
                                 "minValue":0,
                                 "yPosition": 350,
                                 "height": 18,
                                 "breakpointWidth": 100
                                 }
                               },
                               expression_wild_adenine:{
                                 type: "trackHeatmap",
                                 "element_id": "exp_",
                                 data: data.TrackSets[4].QuantitativeSegment6,
                                 options: optionsheatmap
                               },
                               expression_wild_adenine_replicate:{
                                 type: "trackHeatmap",
                                 "element_id": "exp__",
                                 data: data.TrackSets[8].QuantitativeSegment10,
                                 options: optionsheatmap_replicates
                               }
                             }
                           },
                           sample3:{
                             buttonName:"DPurR_adenine",
                             "element_id": "unico",
                             data : [],
                               pairing :{
                               breakpoint2:{
                                 type: "trackBreakpoint",
                                 "element_id": "bk_element", //same name as first object
                                 data: [],
                                 options: {
                                 "name": "breakpoint",
                                 "maxValue":1,
                                 "minValue":0,
                                 "yPosition": 200,
                                 "height": 18,
                                 "breakpointWidth": 100
                                 }
                               },
                               expression_DPurR_adenine:{
                                 type: "trackHeatmap",
                                 "element_id": "exp_",
                                 data: data.TrackSets[6].QuantitativeSegment8,
                                 options: optionsheatmap
                               },
                               expression_DPurR_adenine_replicate:{
                                 type: "trackHeatmap",
                                 "element_id": "exp__",
                                 data: data.TrackSets[10].QuantitativeSegment12,
                                 options: optionsheatmap_replicates
                               }
                             }
                           }

                           }
                     //} // end of experiment components
                   } //end of root object
               },
               error: function(e, xhr){
                   console.log("error: " + e); debugger
                 },
                async:false,
                     dataType:"text",
               });
         return transition_set_obj;
 };

 function init(){
       focus_context_view = new iGBweb("chart1", {
           "xmax": 60, "xmin": 0,
           "ymax": 40, "ymin": 0,
           "title": "Simple Graph1",
           "xlabel": "X Axis",
           "ylabel": "Y Axis",
           "width" : 700,
           "height": 400,
           "focus_context": {
           	"start":0,
           	"stop":20000 //need to be the same value of genomeInfo window
           }
           },
           {
           track1: {           // uique identifier (no white spaces)
             "type": "trackGene", // one of the available track (API)
             "data": {},          // data
             "getData": {
                 "ajax": true,
                 "singleTrackCall": true,
                 "function": "getDataFromTrackManager",
                 "urlPattern": "http://igbweb.systemsbiology.net/rest/TrackManager/"
             },
             "options":
                     {
                     "plus": 10,
                     "minus": 30,
                     "height": 18
                     }
           },
           animationSet1: { // u. identifier - no matter what - otherwise object gets overriden - no white spaces
                 "type": "trackQuantitativeSegment",
                 "element_id": "unico",
                 "data": {}, //
                 "transition": true,
                 //"transitionSet": {},
                     "getData": {
                     "ajax": true,
                     "singleTrackCall": true,
                     "function": "getDataForTrackSet",
                     "urlPattern": "http://igbweb.systemsbiology.net/rest/getTrackSetData/"
                     },
                 options:{
                   "name": "TrackQuantitativeSegmentExample2",
                   "yAxis": true, //defines whether or not do draw yAxis together w/ track
                   //"yAxisPadding":680,
                   "yAxisOrientation":"left",
                   "yAxisLabel" : "Tilling Array",
                   //"height": 18,
                   "minValue": -1.53,
                   "maxValue": 4.85, //******
                   "height": 100,
                   "positionalWidth": 1,
                   "yPosition": 130
                 }
             }
           }
         );

       genome_view = new iGBweb.genomeController("genome", {"start": "0", "stop": "4600000" , "id": "0","name": "NC_005213 Nanoarchaeum equitans Kin4-M ","type": "genes"}, {"lockBrush":true, lockSize: 20000});
       /**
         Calling iGBweb API to center brush and render trackFixedCircle
       */
       App.main.setBrushPosition(27555, 36634)
       App.main.trackFixedCircle(regulates, {})
 }

$(document).ready(function () {



    /*
    For Ilustration purpose, here We'll read a flat-file (.csv) and
    load it as a track (trackCircle - to map regions of interest agains the whole genome vis).

    */
    d3.csv("data/PurRRegulates.csv", function(d) {
        window["regulates"] = d;
        init();
    });

    $('body').layout({ applyDefaultStyles: true });
    $( "#tabs" ).tabs();

    // Load ecoli info from network portal
    /*$.ajax({
      url: "http://localhost:8000/dvu/genes/?format=tsv",
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
                    var cvdata = vqhelpers.makeCircVisData('circvis', json.chromosomes,
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
    }); */
});