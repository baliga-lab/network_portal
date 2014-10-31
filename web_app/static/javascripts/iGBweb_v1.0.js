/**
* @author Diego M Salvanha (et al.) <dmartinez@usp.br>
*
*/

/**
* iGBweb Class definition - This main constructor reads trhee parameters and creates 
  the SVG element according to existing data/tracks .

* @class iGBweb
* @param {string} elemid Element ID (div id) where one wants to render data visualization
* @param {string} options All options/elements (Object) the user wants to pass to the visualization
* @param {Object} registerTracks An Object containing trackObject(s) to be registered and rendered.
* @constructor
*
* @example
*   var focus_context = new iGBweb("div_id", optionsObj, tracksObject)
*/

iGBweb = function(elemid, options, registerTracks) {
  var self = this;
  //this.chart = document.getElementById(elemid);
  this.options = options || {};
  this.options.xmax = options.xmax || 30;
  this.options.xmin = options.xmin || 0;
  this.options.ymax = options.ymax || 10;
  this.options.ymin = options.ymin || 0;
  this.options.width = options.width || 960;
  this.options.height = options.height || 600;
  this.options.left = options.left; // todo - set brush extent
  this.options.right = options.right; //

  this.options.genetrack = options.genetrack || {};
  this.options.genetrack.plus = options.genetrack.plus || 10;
  this.options.genetrack.minus = options.genetrack.minus || 30;
  this.options.genetrack.height = options.genetrack.height || 18;

  this.options.focus_context = options.focus_context || {};
  this.options.focus_context.start = options.focus_context.start || 0;
  this.options.focus_context.stop = options.focus_context.stop || 5000;


  // Checks all registered tracks to be rendered || {}
  this.registerTracks = registerTracks || {};


  // Creating important parameters to define window (view)
  this.view = {},
  this.left = this.options.focus_context.start,
  this.view.left = this.options.left || this.options.focus_context.start,
  this.right = this.options.focus_context.stop,
  this.view.right = this.options.right || this.options.focus_context.stop,
  this.w = this.right - this.left;
  
  
  this.margin = {top: 10, right: 30, bottom: 160, left: 40}
  


  this.width = this.options.width - this.margin.left - this.margin.right
  this.height = this.options.height - this.margin.top - this.margin.bottom
  
  //this.margin2 = {top: 470, right: 30, bottom: 20, left: 40}
  this.margin2 = {top: this.height + 40 , right: 30, bottom: 20, left: 40}//this.height * 0.30
  
  this.height2 = this.options.height - (this.options.height * 0.01) - this.margin2.top - this.margin2.bottom

  this.x = d3.scale.linear().range([0, this.width]).domain([this.left, this.right])
  this.x2 = d3.scale.linear().range([0, this.width]).domain([this.left, this.right])
  
  this.y = d3.scale.linear().range([this.height, 0])
  this.y2 = d3.scale.linear().range([this.height2, 0]).rangeRound([0, this.height2])

   this.ySeqLogo = d3.scale.linear()
          .range([( (this.height+this.margin.left)/2), 0]).domain([0, 2]);
   this.normalize = d3.scale.linear()
          .range([0,2]);

  this.max_local = 50;
  this.yLine = d3.scale.linear().range([this.height, 100]).domain([0,this.max_local]); // 100 because I need to have room for other tracks
     

  this.xAxis = d3.svg.axis()
          .scale(this.x)
          .orient("bottom");
  this.xAxis2 = d3.svg.axis().scale(this.x2).orient("bottom");
  this.yAxis = d3.svg.axis().scale(this.y).orient("left");
  this.yAxisSeqLogo = d3.svg.axis().scale(this.ySeqLogo).orient("left").ticks(15);
  //this.yAxisMaxLocal = d3.svg.axis().scale(this.yLine).orient("right").ticks(15);


  
  this.line = d3.svg.area()
      .x(function(d) {return this.x(+d.position); })
      .y(function(d) {return this.yLine(+d.value) ; });




  this.brush = d3.svg.brush()
            .x(this.x2)
            .on("brush", self.brushed);

  this.svg = d3.select("#" + elemid).append("svg")//#principal
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);
  this.svg.append("defs").append("clipPath")
      .attr("id", "clip").append("rect")
      .attr("width", this.width)
      .attr("height", this.height);
    

  this.focus = this.svg.append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
  this.context_segment = this.svg.append("g")
      .attr("transform", "translate(" + this.margin2.left + "," + this.margin2.top + ")");
          

          // I'll create a new path to fit context plot
  this.context_segment.append("defs").append("clipPath")
        .attr("id", "clip2")
        .append("rect")
        .attr("width", this.width)
        .attr("height", this.height2);
    
  this.context = this.svg.append("g")
        .attr("id", "test")
        .attr("fill", "green")
        .attr("transform", "translate(" + this.margin2.left + "," + this.margin2.top + ")");
        this.context.append("rect")
        .attr("fill", "grey")
        .attr("opacity", 0.1)
        .attr("width", this.width)
        .attr("height", this.height2);
      //debugger;
      

  this.y.domain([0, 900]);
  this.x2.domain(this.x.domain());
        //y2.domain([1, 69]); //*** fix it, it may take max automaticaly
        
  this.focus.append("path")
        .attr("clip-path", "url(#clip)");
    
  this.focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxis);

  this.context.append("g")
        .attr("class", "x axis")
        .attr("id", "brush1")
        .attr("transform", "translate(0," + (this.height2) + ")")
        .call(this.xAxis2);

  this.leftHandle = this.context.append("image")
        .attr("id", "left-handle")
        .attr("width", 15)
        .attr("height",100)
        .attr("x",-1000)
        .attr("xlink:href",'http://bl.ocks.org/jisaacks/raw/5678983/0164a4e335b97b07ddc4ef1a88818e2d1e12d505/left-handle.png');

  this.rightHandle = this.context.append("image")
        .attr("id", "right-handle")
        .attr("width", 15)
        .attr("height",100)
        .attr("x",-1000)
        .attr("xlink:href",'http://bl.ocks.org/jisaacks/raw/5678983/0164a4e335b97b07ddc4ef1a88818e2d1e12d505/right-handle.png');      
  

  this.context.append("g")
        .attr("class", "x brush")
        .attr("id", "t")
        .call(this.brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", this.height2+5)
        .style({
            "fill": "gray",
            "stroke": "none"
        });

  this.mask = new SVGMask(this.context)
        .x(this.x2)
        .y(this.y)
        .style("fill","none")
        .reveal([0,100]);
  
  /*
    Register tracks if the user passes data into this constructor call - otherwise createTrack() handles it
  */
  this.register(registerTracks)
  this.createTrack(registerTracks, false)
};



/**
* This function binds data to each available track for iGBweb.
* It checks whether or not the App needs to query data (thru ajax call(s)) or filter the data
* based on the window view settled by the user.

* @method createTrack
@param {object} registerTracks contains data: configuration: according to each track type
@param {boolean} changeWindow Ask the createTrack to reser or not data sets to original values
*/

iGBweb.prototype.createTrack = function(registerTracks, changeWindow){
    
    //changeWindow = typeof changeWindow !== 'undefined' ? changeWindow : false;
    //changeWindow = changeWindow || false;
    //console.log(registerTracks)

    if(registerTracks){
      var parent = App.main;
      //debugger
      //console.log(d3.event)
      
      for(var index in registerTracks) {
                              //if(d3.event.sourceEvent.currentTarget.id != "t" && index != "track1") {
                             // check if the track is animated (multiple data sets)
                             if( typeof(registerTracks[index].transition) != "undefined"){
                                /*
                                  This is the special tratment for animated (transition) type of data
                                  Call createTrackTransition
                                */


                                if( typeof(registerTracks[index].getData) != "undefined" &&  registerTracks[index].getData.ajax){

                                    if(changeWindow || (typeof(registerTracks[index].getData.firstCall) == "undefined") ){//changeWindow
                                      console.log("changeWindow --> true")
                                                //getDataFromTrackManager(registerTracks, 1, d3.round(App.main.left), d3.round(App.main.right) )
                                                //debugger;
                                                //registerTracks[index].transitionSet = getDataForTrackSet( 1, d3.round(App.main.left), d3.round(App.main.right))
                                                registerTracks[index].transitionSet = eval(registerTracks[index].getData.function)(registerTracks, 1, d3.round(App.main.left), d3.round(App.main.right), registerTracks[index].getData.urlPattern)
                                                //register track
                                                //if(typeof(registerTracks[index].getData.firstCall) == "undefined"){
                                                for(var j in registerTracks[index].transitionSet.samples){
                                                    for(var k in registerTracks[index].transitionSet.samples[j].pairing){
                                                          console.log("registering paired")
                                                          registerTracks[k] = JSON.parse(JSON.stringify(registerTracks[index].transitionSet.samples[j].pairing[k]))
                                                          App.registerTracks_original[k] = JSON.parse(JSON.stringify(registerTracks[index].transitionSet.samples[j].pairing[k]))
                                                    }
                                                      break;
                                                  }
                                                //}


                                                registerTracks[index].getData.firstCall = {}; // making sure the firstCall will invoke ajax
                                                

                                                //registerTracks[index].data = App.registerTracks_original[index].data
                                                console.log("got TrackSet data")
                                                
                                                // Once I have no data on data attribute, need to set the first data set to be first drawn
                                                for(var i in registerTracks[index].transitionSet.samples) {
                                                  registerTracks[index].data = registerTracks[index].transitionSet.samples[i].data;
                                                  break;
                                                }
                                                  if(registerTracks[index].transitionSet){
                                                        console.log("createTrackForTransitionSet inside ajax")
                                                        //debugger
                                                        parent.createTrackForTransitionSet(registerTracks[index])
                                                  }
                                    }

                                }else{
                                  console.log('transitionSet outside ajax')
                                    if(registerTracks[index].transitionSet){
                                      if(d3.selectAll("input[name=bt]")[0] == ""){
                                          console.log("createTrackForTransitionSet")
                                          debugger
                                          parent.createTrackForTransitionSet(registerTracks[index])
                                      }
                                   }
                                }
                             }
                             if( typeof(registerTracks[index].getData) != "undefined" &&  registerTracks[index].getData.ajax){

                                    /*
                                          ============== If singleTrackCall = True means the user wants to make individual calls per track 
                                          ============== This is important for Web-Apps that already have a back-end up and running
                                    */  
                                    if (typeof(registerTracks[index].getData.ajax.singleTrackCall) != "undefined" && registerTracks[index].getData.ajax.singleTrackCall){
                                      console.log("inside singleCall : true")

                                    }
                                    /* 
                                          ============= Here is for the particular case of singleTrack = false (e.i., the Back-end is called only once - and it's collector return all
                                          the data as a single JSON file - iGBweb back-end uses this module)
                                    */
                                    else{
                                          //console.log("inside singleCall : false")
                                          //debugger
                                          if(changeWindow || (typeof(registerTracks[index].getData.firstCall) == "undefined") ){//changeWindow
                                                //debugger;
                                                //getDataFromTrackManager(registerTracks, 1, d3.round(App.main.left), d3.round(App.main.right) )
                                                //console.log(registerTracks)
                                                //debugger
                                                eval(registerTracks[index].getData.function)(registerTracks, 1, d3.round(App.main.left), d3.round(App.main.right), registerTracks[index].getData.urlPattern )
                                                registerTracks[index].getData.firstCall = {}; // making sure the firstCall will invoke ajax
                                                //registerTracks[index].data = App.registerTracks_original[index].data
                                          }
                                          if( /*typeof(registerTracks[index].data) != "undefined" &&*/ registerTracks[index].data != "" /*&& typeof(registerTracks[index].data[0]["start"]) != "undefined"*/){
                                                //debugger
                                                
                                                registerTracks[index].data = registerTracks[index].data//.filter(function(d){ if(d.start <= App.main.right && d.stop >= App.main.left){return d}  })
                                                var options = registerTracks[index].options
                                                eval("App.main."+registerTracks[index].type)(registerTracks[index].data, options)
                                                App.registerTracks = registerTracks
                                                

                                                //if(index == "track5") debugger                            
                                          }
                                          /*else{
                                                //debugger
                                                //if(index == "track4"){} 
                                                registerTracks[index].data = registerTracks[index].data//.filter(function(d){ if(+d.position <= App.main.right && +d.position >= App.main.left){return d}  })  
                                          }*/

                                  }
                            } else{
                                  if(registerTracks[index].data){
                                      
                                      if(changeWindow){
                                            registerTracks[index].data = App.registerTracks_original[index].data
                                      }
                                      if( /*typeof(registerTracks[index].data) != "undefined" &&*/ registerTracks[index].data != "" && typeof(registerTracks[index].data[0]["start"]) != "undefined"){
                                            //debugger
                                            registerTracks[index].data = registerTracks[index].data.filter(function(d){ if(d.start <= App.main.right && d.stop >= App.main.left){return d}  })
                                            //if(index == "track5") debugger                            
                                      }
                                      else{
                                            //debugger
                                            //if(index == "track4"){} 
                                            registerTracks[index].data = registerTracks[index].data.filter(function(d){ if(+d.position <= App.main.right && +d.position >= App.main.left){return d}  })  
                                      }
                                      
                                      
                                      var options = registerTracks[index].options
                                      eval("App.main."+registerTracks[index].type)(registerTracks[index].data, options)
                                      App.registerTracks = registerTracks            
                                  }
                                  else{
                                      alert("You need to either send data to be drawn or configurate an Ajax call for  --> " + index )
                                  }
                            }

        //console.log('Reginstering and Calling renderer for: ' + index)
        //debugger //filter data before passing to draw - think about it
          //} // first if != 't'
      }
  }
}


/**
* This function is responsable for registering All tracks available inside a transitionSet Object.
* It also creates <HTML> Buttons elements for triggering the transition (animation)
*
* @method createTrackForTransitionSet
@param {object} transitionSet transitionSet Object containing all transition elements 
(e.g, All data to be transitioned to within a trackType)
*/

  iGBweb.prototype.createTrackForTransitionSet = function(transitionSet){
        data = $.map(transitionSet.transitionSet.samples, function(d){return d.buttonName})
        var transition_data = []; for(var k in transitionSet.transitionSet.samples) transition_data.push(transitionSet.transitionSet.samples[k])
        //debugger
        d3.selectAll("input[name=bt]").remove()
        var box = d3.select("#" + transitionSet.transitionSet.elemid).selectAll("input")
        .data(data);
        box.enter()
        .append("input").attr("class", "btGGB")
        .attr("id", function(d){return d})
        .attr("type","button")
        .attr("class", "btn btn-default")
        .attr("name", "bt")
        .attr("value", function (d){return d;} )
        .style("display","inline-block")
        .style("position", "relative")
        .on("click", function(d, i){
          if(typeof(transition_data[i].pairing) != "undefined") {
              App.main.transition(transition_data[i])
              for(var index in transition_data[i].pairing) {
                //debugger
                
                App.main.transition(transition_data[i].pairing[index]) 
                console.log("paired transition on")
              }
          }else{
              App.main.transition(transition_data[i]) 
          }
           
          })
        box.append("input").attr("type","button").attr("class", "button1").attr("value", "Button 1")
  }

window["timer"] = ""
var asyncLoop = function(o){
    //debugger
    var anim = App.main.keys
    //anim.push("Default")
    var i=-1,
        length = o.length;
    //console.log("length ----------------------->" +length)
    var loop = function(){
      //if(eval(dontstop)) {
        i++;
        if(i == anim.length){i=0 }
        o.functionToLoop(loop, i);
      }
    //} 
    loop();//init
}



/**
* This function is responsable triggering transitionSet available data to trigger transitioning (cycling) automaticallyany brush move/pann will automatically stop the transition.
*
* @method cycling
* @param {object} transitionSet transitionSet Object containing all transition elements 
(e.g, All data to be animated)
*/


iGBweb.prototype.cycling = function(){

//clearTimeout(timer)
var anim = App.main.keys
asyncLoop({
    length : t.length,
    functionToLoop : function(loop, i){
       window["timer"] =  setTimeout(function(){
                  //console.log("******* i = "+i)
              //if(corem_name.length > i ){
              //  animateCorem(anim[0])
              //  stopAnimation()
              //  abort()
              //  console.log('clear and stop animation')
              //}
                  //if(anim[i] != "Default"){
                    console.log(anim[i])
                  //  cyclingLegend(anim[i])
                  //}
                  //else {
                  //  resetLineChartData()
                  //  cyclingLegend(anim[i])
                  //}
            loop();
        },2000);
    },
    callback : function(){
        document.write('All done!');
    }    
});

}


/**
* This function binds data to each available track for iGBweb, allowing transitionning thru data sets of a same type.
*
* @method transition
* @param {object} registerTracks contains data: configuration: according to each track type
*/

iGBweb.prototype.transition = function(transitionSet){
  var parent = App.main;
  var data_local = ""
  /*
    Create the track, set all transition variables
  */
    //debugger
          if(transitionSet){
             console.log("inside transition - data exists")
                $.map(App.main.registerTracks, function(d) {
                  //debugger;
                  if(d.element_id == transitionSet.element_id){
                      //Found original data, set new data to transit
                      //debugger;
                      if( transitionSet.data != "" && typeof(transitionSet.data[0]["start"]) != "undefined"){
                          d.data = transitionSet.data.filter(function(d){ if(d.start <= App.main.right && d.stop >= App.main.left){return d}  })
                      }
                      else{
                        if( transitionSet.data != "" && typeof(transitionSet.data[0]["position"]) != "undefined"){
                              d.data = transitionSet.data.filter(function(d){ if(+d.position <= App.main.right && +d.position >= App.main.left){return d}  })  
                          }
                          else{
                            d.data = [] //case when I have no data associated to a transitionSet track object
                          }
                      }
                          
                      var options = d.options
                      
                      eval("App.main."+d.type)(d.data, options, true) //transition = true
                  }
                })
          }
  }


  /**
* This function binds track (and it's data) into the application scope (App.main)
* and keeps a copy of original data for reuse (whenever necessary)
*
* @method register
* @param {object} registerTracks contains data: configuration: according to each track type
*/

 iGBweb.prototype.register = function(registerTracks){
  window.App = {}
  App.data = {}
  App.main = this
  App.registerTracks_original = JSON.parse(JSON.stringify(registerTracks))
  return App;
 }

/**
* trackType: trackGene
* This function renders gene annotation (start/stop based data)
*
* @method trackGene
* @uses drawGeneLabels
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
*/
 iGBweb.prototype.trackGene = function(dat, options) {
    var parent = App.main;
    

    var genetrack = options || {};
    genetrack.plus = options.plus || 10;
    genetrack.minus = options.minus || 20;
    genetrack.height = options.height || 18;
    //var window = 300;
    
    var genes = parent.focus.selectAll("#gene_bar")
    .data(dat.filter(function(d){
              if(+d.start < +d.stop){
                  if(  (+d.start) <= parent.view.right && (+d.stop) >= parent.view.left ){
                    
                    return d
                  }
              }
              else{
               if(  (+d.stop) <= parent.view.right && (+d.start) >= parent.view.left ){
                    return d
                  } 
              }
          }), function(f){ return (+f.start)});
    genes.exit().remove();

    genes.enter().append("rect");
    
    genes   
      .attr("id", "gene_bar")
      .attr("clip-path", "url(#clip)")
            .attr('fill', function(d) {
              if(d.strand =='+') return '#eef000'; else return '#ddbb00';
            })
            .attr('y', function(d){ 
              if(d.strand =='+') return genetrack.plus; else return genetrack.minus;
            })
      .attr("x", function(d,i) { 
      if( (+d.start) < (+d.stop) ){
        return parent.x(+d.start);    
      }
      else{
        return parent.x(+d.stop); 
      }
      
        })
        .attr("width", function(d,i) {
          if( (+d.start) < (+d.stop) ){
            return parent.x( ( (+d.stop) - (+d.start) ) + (parent.view.left) );    
          }
          else {
            return parent.x( ( (+d.start) - (+d.stop) ) + (parent.view.left) );  
          }
        })
            .attr("height",parent.options.genetrack.height)
            .attr('stroke', 'rgba(0,0,0,0.5)')
      .on('click', function(c){
        //window.open(url_ + c.name, '_blank')
    d3.select('#geneAnnotation').selectAll("p").remove();
      ;})
    .style('cursor', 'hand')
      ;
      genes.selectAll('title').remove();
    
      genes
      .append("svg:title")
      .text(function(d){ return (d.attributes)});

      parent.drawGeneLabels(dat, options);
  }

/**
* 
* This function renders gene annotation (start/stop based data)
* - function used by trackGene
*
* @method drawGeneLabels
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
*/
  iGBweb.prototype.drawGeneLabels = function(data, options){
      var parent = App.main;

      var genetrack = options || {};
      genetrack.plus = options.plus || 10;
      genetrack.minus = options.minus || 20;
      genetrack.height = options.height || 18;
      var window = 300;
    
    //parent.focus.selectAll("#glabel").remove()
     var geneLabels = parent.focus.selectAll("#glabel")
     .data(data.filter(function(d){
              if(+d.start < +d.stop){
                  if(  (+d.start) <= parent.view.right && (+d.stop) >= parent.view.left ){
                    return d
                  }
              }
              else{
               if(  (+d.stop) <= parent.view.right && (+d.start) >= parent.view.left ){
                    return d
                  } 
              }
  }), function(f){ return (parent.x(+f.start) )});
    geneLabels.exit().remove();

    geneLabels.enter().append("text");

    geneLabels
      .attr("id", "glabel")
    .attr("clip-path", "url(#clip)")
    .attr("font-family", "sans-serif")
    .attr("font-size", "11px")
      .attr('y', function(d){ 
        if(d.strand =='+') return genetrack.plus + 15; else return genetrack.minus + 15;})
      .attr("x", function(d,i) { 
        if( (+d.start) < (+d.stop) ){
          return parent.x((+d.start)+3);    
        }
        else{
          return parent.x((+d.stop)); 
      }})
      .attr("width", function(d,i) {
          if( (+d.start) < (+d.stop) ){
            return parent.x( ( (+d.stop) - (+d.start) ) + (parent.view.left) );    
          }
          else {
            return parent.x( ( (+d.start) - (+d.stop) ) + (parent.view.left) );  
          }
      })
      .on('click', function(c){
          //window.open(c.name, '_blank')
          //d3.select('#geneAnnotation').selectAll("p").remove();
        ;})
      .text(function(d){ 
          if(d.start < d.stop){
                  if( (d.name.length)*9 > parent.x(d.stop - d.start + parent.view.left) ) {
                   return ""; 
                  }
                   else{
                    return d.name + " (" + d.strand + ")";}
                  }
                  else{
                          if( (d.name.length)*9 > parent.x(d.start - d.stop + parent.view.left) ) {
                   return ""; 
                  }
                   else{
                    return d.name+ " (" + d.strand + ")";}
                  }
          })
      .style('cursor', 'hand')
      .append("svg:title")
      .text(function(d, i) { return "" + d.attributes; })
  }

  /**
* 
* This function is responsable for resetting the Focus/Context view scale (x) and brush.
* - whenever the brush is out (e.g. reseted )
* - whenever the Genome Window View changes
*
* @method resetView
*/
  iGBweb.prototype.resetView = function(){
    var parent = App.main;

    parent.leftHandle.attr("x",-1000);
    parent.rightHandle.attr("x",-1000);
    parent.view.left = parent.left;
    parent.view.right = parent.right;
    //don't need to recall once I have the data loaded
    //getSequenceAnnotationData(id, d3.round(view.left), d3.round(view.right), "gene");
    parent.x.domain([parent.left, parent.right]);
    parent.focus.select(".x.axis").call(parent.xAxis)
    d3.select('#text_principal').text(" No selection in context area. ").attr("align", "right");
    parent.brush.clear();
    parent.svg.select(".x.brush").call(parent.brush);
    parent.focus.select(".x.axis").call(parent.xAxis);
    //parent.drawGene()
    parent.createTrack(App.registerTracks, false)



      if(typeof(App.genomeController) != "undefined" && !App.genomeController.options.lockBrush){
        //App.genomeController.brush.clear()
        App.genomeController.svg2.selectAll(".x.brush").call(App.genomeController.brush)    
      }
    //redrawExpressionData();
    //redrawExpressionAsPath();
    //parent.drawLine();
  }
/**
* trackType: trackQuantitativeStringPositional
* This function renders QuantitativePositional (single position based data) as an SVG <path> element.
*
* @method trackQuantitativeStringPositional
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
*/
iGBweb.prototype.trackQuantitativeStringPositional = function(data, options){
  var parent = App.main;

  this.options = options || {};
  this.options.height = options.height || parent.height;
  this.options.yPosition = options.yPosition || parent.height;
  this.options.color = options.color || "blue";
  this.options.stroke = options.stroke || "none";
  this.options.font = options.font || "corrier";
  this.options.fontSize = options.fontSize || "10";
  this.options.opacity = options.opacity || 1;
  this.options.name = options.name || "PositionalQuantitative_"+new Date().getTime();


  var yFont = d3.scale.linear().range([0, 310]).domain([0,100]); // fix font for seqLogo
  var yLogo = d3.scale.linear().range([430, 100]).domain([0,100]);
  var capHeightAdjust = 1.1;
    var xSeqLogo = d3.scale.ordinal()
      .rangeRoundBands([0, parent.width], .1);
      yFont.domain([0,30]);
      yLogo.domain(parent.yLine.domain())
      yLogo.range([100,430])
      xSeqLogo.domain(d3.range(parent.view.left,parent.view.right,1));

    var positionalQuantitative = parent.focus.selectAll("#"+this.options.name)
        .data(data.filter(function(f){ return f.position >= parent.view.left && f.position <= parent.view.right }  ));//

    positionalQuantitative.exit().remove();
      
    positionalQuantitative.enter().append("text")
      .attr("id", this.options.name)
      .attr("clip-path", "url(#clip)")
      .attr("y", this.options.yPosition);
      
    positionalQuantitative
        
      
      .attr("x", function(d) { return parent.x(d.position)  ; })
      .text( function(e) { return e.annotation; } )//e.LETTER
      .attr("class", function(e) { return "letter-" + e.annotation; } )
      .style( "text-anchor", "start" )
      .style( "font", this.options.font )
      .attr( "textLength", xSeqLogo.rangeBand() )//(xSeqLogo.rangeBand()) / 2
      .attr( "lengthAdjust", "spacingAndGlyphs" )
      .attr( "font-size", function(e) {return   options.fontSize } )
      .style("opacity", this.options.opacity)
      .style("stroke", this.options.stroke)
      .style("fill", this.options.color);
}

function checkLockBrushGenome(){
  if(App.genomeController.options.lockBrush){
      //console.log("removing resize")
        App.genomeController.svg2.selectAll(".background").remove()
        App.genomeController.svg2.selectAll(".resize.w").remove()
        App.genomeController.svg2.selectAll(".resize.e").remove()
    }
}

/**
* This function is called everytime the element brush (pann/zoom) on Focus/Context view changes
*
* @method brushed
*/
iGBweb.prototype.brushed = function() {
  var parent = App.main;

    
    
    parent.x.domain(parent.brush.empty() ? parent.x.domain() : parent.brush.extent());
    if(!parent.brush.empty()){
      parent.view.left = d3.round(parent.x.domain()[0]);
      parent.view.right = d3.round(parent.x.domain()[1]);
      parent.focus.select(".x.axis").call(parent.xAxis)
      d3.select('#text_principal').text(" Context selection : " + '['+ d3.round(parent.x.domain()[0]) + ":" + d3.round(parent.x.domain()[1]) + ']').attr("align", "right");
      parent.mask.reveal([parent.x.domain()[0],parent.x.domain()[1]]);
      parent.leftHandle.attr("x",parent.x2(parent.view.left)-5);
      parent.rightHandle.attr("x",parent.x2(parent.view.right)-7);
      //parent.drawGene() 
      parent.createTrack(App.registerTracks, false)
      //parent.drawPositionalQuantitative(example1[0])
      // genome svg
      if(typeof(App.genomeController) != "undefined" && !App.genomeController.options.lockBrush){
        //App.genomeController.brush.extent(parent.brush.extent())
        App.genomeController.svg2.selectAll(".x.brush").call(App.genomeController.brush)    
      }
    }
    else{ //correctiong when brush.empty() restables x.domain to general value
      parent.resetView();
      console.log("reset")
    }
    checkLockBrushGenome()
  }

/**
* This function is called everytime the element brush (pann/zoom) needs to be defined
*
* @method setBrushPosition
*/
  iGBweb.prototype.setBrushPosition = function(start, stop){
    parent = App.main;
      //debugger

      if(start > stop) {
        var s = stop;
        var e = start
      }
      else{
        var e = stop;
        var s = start
      }
      
      if(s >= parent.view.left && e < parent.view.right){
        console.log("first true")
      

            parent.x.domain(parent.brush.empty() ? [s, e] : [s, e]);
          
            parent.view.left = d3.round(parent.x.domain()[0]);
            parent.view.right = d3.round(parent.x.domain()[1]);

            App.main.svg.selectAll(".brush").transition()
            .call(parent.brush.extent([s,e]))
            .call(parent.brush);
            
            parent.focus.select(".x.axis").call(parent.xAxis)
            //d3.select('#text_principal').text(" Context selection : " + '['+ d3.round(parent.x.domain()[0]) + ":" + d3.round(parent.x.domain()[1]) + ']').attr("align", "right");
            parent.mask.reveal([parent.x.domain()[0],parent.x.domain()[1]]);
            parent.leftHandle.attr("x",parent.x2(parent.view.left)-5);
            parent.rightHandle.attr("x",parent.x2(parent.view.right)-7);
            //parent.drawGene() 
            parent.createTrack(App.registerTracks, false)
            //parent.drawPositionalQuantitative(example1[0])
            // genome svg
            if(typeof(App.genomeController) != "undefined" && !App.genomeController.options.lockBrush){
              debugger
              //App.genomeController.brush.extent([parent.left, parent.right])
              App.genomeController.svg2.selectAll(".x.brush").call(App.genomeController.brush)    
            }
      }
      else {
        //debugger
        /*
            Need to change genome-wide view position as well
        */
        if(typeof(App.genomeController) != "undefined"){

          if(!App.genomeController.brush.empty()){
            var window_size = App.main.options.focus_context.stop - App.main.options.focus_context.start
            var dif = 0;
            if( (e-s) > (window_size) ) {dif =(e-s) } 
      
      parent.view.left = (s - window_size) - dif ;
      parent.view.right = (s + window_size) + dif;
      
      parent.left=parent.view.left; parent.right=parent.view.right;
      parent.x.domain([parent.view.left, parent.view.right]);
      parent.x2.domain([parent.view.left, parent.view.right]);
    
      
      parent.svg.select(".brush").call(parent.brush);
      parent.focus.select(".x.axis").call(parent.xAxis);
      parent.context.select(".x.axis").call(parent.xAxis2);
    
      
      parent.createTrack(App.registerTracks, true) //true --> resets the data to original (or make a new ajaxCall)


      parent.x.domain(parent.brush.empty() ? [s, e] : [s, e]);
          
            parent.view.left = d3.round(parent.x.domain()[0]);
            parent.view.right = d3.round(parent.x.domain()[1]);

            App.main.svg.selectAll(".brush").transition()
            .call(parent.brush.extent([s,e]))
            .call(parent.brush);
            
            parent.focus.select(".x.axis").call(parent.xAxis)
            
            parent.mask.reveal([parent.x.domain()[0],parent.x.domain()[1]]);
            parent.leftHandle.attr("x",parent.x2(parent.view.left)-5);
            parent.rightHandle.attr("x",parent.x2(parent.view.right)-7);

            parent.createTrack(App.registerTracks, false)
            
            console.log(parent.left+" " + parent.right)
            App.genomeController.brush.extent([parent.left, parent.right])
            App.genomeController.svg2.selectAll(".x.brush").call(App.genomeController.brush)
            if(typeof(App.genomeController) != "undefined" && !App.genomeController.options.lockBrush){
              debugger
              App.genomeController.brush.extent([parent.left, parent.right])
              App.genomeController.svg2.selectAll(".x.brush").call(App.genomeController.brush)    
            }

    }

        }
        else{alert("The Brush cannot be set outside the view range.")}
      }
    
    checkLockBrushGenome()  

  }
/**
* trackType: trackQuantitativeSegment
* This function renders trackQuantitativeSegment (start/stop based data) as an SVG <path> element.
*
* @method trackQuantitativeSegment
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
* @param {Boolean} transition A boolean (true/false) used to animate(or not) a track
*/
  iGBweb.prototype.trackQuantitativeSegment = function(data, options, transition){

    var parent = App.main;
    
    this.transition = transition || false;

    this.options = options || {};
    this.options.height = options.height || parent.height;
    this.options.yPosition = options.yPosition || 0;
    this.options.color = options.color || "blue";
    this.options.positionalWidth = options.positionalWidth || "2px";
    this.options.name = options.name || "trackPosition_"+new Date().getTime();
    this.options.maxValue = +options.maxValue || d3.max($.map(data, function(d) { return +d.value; })) // this get's local_data max always if user doesn't set min/max
    this.options.minValue = +options.minValue || d3.min($.map(data, function(d) { return +d.value; })) // this get's local_data min always if user doesn't set min/max
    this.options.yAxis = options.yAxis || false;
    this.options.yAxisPadding = options.yAxisPadding || 0;
    this.options.yAxisOrientation = options.yAxisOrientation || "right";
    this.options.ticks = options.ticks || 10;
    this.options.opacity = options.opacity || 0.9;
    
    parent.yDrawPositinal = d3.scale.linear().range([this.options.height, 0]).domain([this.options.minValue,this.options.maxValue]);  //d3.max($.map(data, function(d) { return +d.value; }))

    
    yAxisPositional = d3.svg.axis().scale(parent.yDrawPositinal).orient(this.options.yAxisOrientation).ticks(this.options.ticks);
    
    if( (parent.focus.selectAll("#yAxis_"+this.options.name) == 0) && this.options.yAxis ){
        parent.focus.append("g")
            .attr("class", "y axis")
            .attr("id", "yAxis_"+this.options.name)
            .attr("transform", "translate("+(0+this.options.yAxisPadding)+","+this.options.yPosition+")")
            .style("fill", this.options.color)
            .call(yAxisPositional);


      /*Define yAxisLabel Positioning*/
          if(this.options.yAxisPadding == 0 && this.options.yAxisOrientation == "right"){ // means it'll be drawn on the left-side
            console.log("=0 and right")
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = -10 ;
          }
          if(this.options.yAxisPadding == 0 && this.options.yAxisOrientation == "left"){
            console.log("=0 and left")
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = 0 ;
          }
          if(this.options.yAxisPadding != 0 && this.options.yAxisOrientation == "right"){
            console.log("!=0 and right")
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = this.options.yAxisPadding -10 ;
          }
          if(this.options.yAxisPadding != 0 && this.options.yAxisOrientation == "left"){
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = this.options.yAxisPadding ;
          }      

        parent.focus.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("class", "y label")
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "end")
            .attr("x", xAxisLabel)
            .attr("y", yAxisLabel)
            .attr("dy", "1em")
            .text(this.options.yAxisLabel);            
  }
  //  debugger
  var aux = parent.focus.selectAll('#'+this.options.name);
  var positional = parent.focus.selectAll('#'+this.options.name)
      .data(parent.createPathQuantitativeSegment(data.filter(function(d){ 
        if(d.stop >= parent.view.left && d.start <= parent.view.right){return d}   })),function(d) {return d.start});
    
    positional.exit().remove();
    //debugger
    
    positional
    .enter().append('path')
      .attr("id", this.options.name)
      .attr("clip-path", "url(#clip)")
      .attr('class', function(d) {return ("positional_" + d.class); });
      
    if(transition && aux != "") { 
      positional.transition()
      .attr('d', function(d) { return d.path; })
      .style("stroke", this.options.color )
      .style("stroke-width", this.options.positionalWidth )
      .style("opacity", this.options.opacity)
      .attr("transform", "translate(0,"+this.options.yPosition+")");

    }
    else { 
      positional
          .attr('d', function(d) { return d.path; })
          .style("stroke", this.options.color ) //old   values[0].MOTIF_NAME
          .style("stroke-width", this.options.positionalWidth )
          .style("opacity", this.options.opacity)
          .attr("transform", "translate(0,"+this.options.yPosition+")");
    }
      
  } 

/**
* trackType: trackQuantitativePositional
* This function renders trackQuantitativePositional (single position based data) as an SVG path element.
*
* @method trackQuantitativePositional
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
* @param {Boolean} transition A boolean (true/false) used to animate(or not) a track
*/

  iGBweb.prototype.trackQuantitativePositional = function(data, options){

    var parent = App.main;
    this.options = options || {};
    this.options.height = options.height || parent.height;
    this.options.yPosition = options.yPosition || 0;
    this.options.color = options.color || "blue";
    this.options.positionalWidth = options.positionalWidth || "2px";
    this.options.name = options.name || "trackPosition_"+new Date().getTime();
    this.options.maxValue = options.maxValue || d3.max($.map(data, function(d) { return +d.value; }))
    //console.log(this.options.name)
    this.options.yAxisPadding = options.yAxisPadding || 0;
    this.options.yAxisOrientation = options.yAxisOrientation || "right";
    this.options.ticks = options.ticks || 10;
    this.options.yAxisLabel = options.yAxisLabel || "";



    parent.yDrawPositinal = d3.scale.linear().range([this.options.height, 0]).domain([0,this.options.maxValue]);  //d3.max($.map(data, function(d) { return +d.value; }))
    
    yAxisPositional = d3.svg.axis().scale(parent.yDrawPositinal).orient(this.options.yAxisOrientation).ticks(this.options.ticks);
    //debugger
    
    if(parent.focus.selectAll("#yAxis_"+this.options.name) == 0){
        parent.focus.append("g")
            .attr("class", "y axis")
            .attr("id", "yAxis_"+this.options.name)
            .attr("transform", "translate("+(0+this.options.yAxisPadding)+","+this.options.yPosition+")")
            .style("fill", this.options.color)
            .call(yAxisPositional);


      /*Define yAxisLabel Positioning*/
          if(this.options.yAxisPadding == 0 && this.options.yAxisOrientation == "right"){ // means it'll be drawn on the left-side
            console.log("=0 and right")
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = -10 ;
          }
          if(this.options.yAxisPadding == 0 && this.options.yAxisOrientation == "left"){
            console.log("=0 and left")
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = 0 ;
          }
          if(this.options.yAxisPadding != 0 && this.options.yAxisOrientation == "right"){
            console.log("!=0 and right")
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = this.options.yAxisPadding -10 ;
          }
          if(this.options.yAxisPadding != 0 && this.options.yAxisOrientation == "left"){
            var xAxisLabel = 0 - (this.options.yPosition );
            var yAxisLabel = this.options.yAxisPadding ;
          }      

        parent.focus.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("class", "y label")
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "end")
            .attr("x", xAxisLabel)
            .attr("y", yAxisLabel)
            .attr("dy", "1em")
            .text(this.options.yAxisLabel);
  }



    var positional = parent.focus.selectAll('#'+this.options.name)
      .data(parent.transformExpression(data.filter(function(d){ 
        if(d.position >= parent.view.left && d.position <= parent.view.right){return d}   })),function(d) {return d.position});
    
    positional.exit().remove();

    positional
    .enter().append('path')
      .attr("id", this.options.name)
      .attr("clip-path", "url(#clip)")
      .attr('class', function(d) { return ("positional_" + d.class); });
    positional
      .attr('d', function(d) { return d.path; })
      .style("stroke", this.options.color ) //old   values[0].MOTIF_NAME
      .style("stroke-width", this.options.positionalWidth )
      .attr("transform", "translate(0,"+this.options.yPosition+")")
      //.style("fill","red" )
      ;
  }

/**
* trackType: trackPositionalLine
* This function renders trackPositionalLine (single position based data) as an SVG <path/line> element.
*
* @method trackPositionalLine
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
*/

  iGBweb.prototype.trackPositionalLine = function(data, options){
    //debugger
    var parent = App.main;
    this.options = options || {};
    this.options.height = options.height || parent.height;
    this.options.yPosition = options.yPosition || 0;
    this.options.color = options.color || "blue";
    this.options.positionalWidth = options.positionalWidth || "2px";
    this.options.name = options.name || "trackPosition_"+new Date().getTime();

    //console.log(this.options.name)
    
    parent.yDrawPositinal = d3.scale.linear().range([this.options.height, 0]).domain([0,10]);  //d3.max($.map(data, function(d) { return +d.value; }))

    var positional = parent.focus.selectAll('#'+this.options.name)
      .data(data.filter(function(d){ 
        if(d.position >= parent.view.left && d.position <= parent.view.right){return d}   }),function(d) {return d.position});
    
    positional.exit().remove();
    //console.log("debugger");
    positional
    .enter().append('path')
      .attr("id", this.options.name)
      .attr("clip-path", "url(#clip)")
      //.attr('class', function(d) { return ("positional_" + d.class); });
    positional
      .attr('d', function(d) {return parent.line(d.value); })
      .style("stroke", this.options.color ) //old   values[0].MOTIF_NAME
      .style("stroke-width", this.options.positionalWidth )
      .attr("transform", "translate(0,"+this.options.yPosition+")")
      //.style("fill","red" )
      ;
  }
/**
* trackType: trackBreakpoint
* This function renders trackBreakpoint (single position based data) as an SVG <line> element for representing breakpoint-like data
* (i.e., vertical bar)
*
* @method trackBreakpoint
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
* @param {Boolean} transition A boolean (true/false) used to animate(or not) a track
*/
  iGBweb.prototype.trackBreakpoint = function(data, options, transition){
    //debugger
    var parent = App.main;
    this.transition = transition || false;
    this.options = options || {};
    this.options.height = options.height || parent.height;
    this.options.yPosition = options.yPosition || 0;
    this.options.color = options.color || "blue";
    this.options.positionalWidth = options.positionalWidth || "2px";
    this.options.breakpointWidth = options.breakpointWidth || 50;
    this.options.name = options.name || "trackPosition_"+new Date().getTime();
    this.options.maxValue = +options.maxValue || d3.max($.map(data, function(d) { return +d.value; })) // this get's local_data max always if user doesn't set min/max
    this.options.minValue = +options.minValue || d3.min($.map(data, function(d) { return +d.value; })) // this get's local_data min always if user doesn't set min/max
    this.options.colorDomain = options.colorDomain || ["grey", "green"];
    this.options.colorDomainStroke = options.colorDomainStroke || ["grey", "green"];

    //console.log(this.options.name)
    
    var strokeScale = d3.scale.linear().range([0,2]).domain([this.options.minValue,this.options.maxValue]);  //d3.max($.map(data, function(d) { return +d.value; }))
    var color = d3.scale.linear()
    .domain([this.options.minValue, this.options.maxValue])
    .range(this.options.colorDomain);
    //debugger

    var breakpoint = parent.focus.selectAll('#'+this.options.name)
      .data(data.filter(function(d){ 
        if(d.position >= parent.view.left && d.position <= parent.view.right){return d}   }),function(e) {return e.position});
    
    breakpoint.exit().remove();
    breakpoint
    .enter().append('line')
      .attr("id", this.options.name)
      .attr("clip-path", "url(#clip)")
      .append("title")
        .text(function(d){return d.value})
      
    if(transition){
      breakpoint
      .attr("x1", function(d){ return parent.x(d.position) })
      .attr("x2", function(d){ return parent.x(d.position) })
      .attr("y1", 0)
      .attr("y2", 50)
      .attr("transform", "translate(0,"+this.options.yPosition+")") 
      .style("stroke", function(d){ return color(d.value)} ) //old   values[0].MOTIF_NAME
      .transition()
      .style("stroke-width", function(d){ return strokeScale(d.value)}  )

      
    }
    else{
      breakpoint
      .attr("x1", function(d){ return parent.x(d.position) })
      .attr("x2", function(d){ return parent.x(d.position) })
      .attr("y1", 0)
      .attr("y2", 50)
      .style("stroke", function(d){ return color(d.value)} ) //old   values[0].MOTIF_NAME
      .style("stroke-width", function(d){ return strokeScale(d.value)}  )
      .attr("transform", "translate(0,"+this.options.yPosition+")")
      ;
    }
    
  }  

/**
* This function converts segment data (start/stop based) into a single <path> element
*
* @method createPathQuantitativeSegment
* @param {Object[Array]} data Data to be rendered 
*/
iGBweb.prototype.createPathQuantitativeSegment = function(data) {
  var parent = App.main;
  var paths = {}, d, result = [];

  for (var i = 0; i < data.length; i++) {
    d = data[i];
    //debugger
    if (!paths[d.name]) paths[d.name] = ''; 
    paths[d.name] += ['M',parent.x(+d.start),(parent.yDrawPositinal(+d.value)),'H',parent.x(+d.stop)].join(' ');
  }

  for (var name in paths) {
    result.push({class: name, path: paths[name]});
  }

  return result;
}


  iGBweb.prototype.transformExpression = function(data) {
  var parent = App.main;
  var paths = {}, d, result = [];

  for (var i = 0; i < data.length; i++) {
    d = data[i];
    //debugger
    if (!paths[d.name]) paths[d.name] = ''; 
    paths[d.name] += ['M',parent.x(+d.position),(parent.yDrawPositinal(+d.value)),'H',parent.x(+d.position+1)].join(' ');
  }

  for (var name in paths) {
    result.push({class: name, path: paths[name]});
  }

  return result;
}

/**
* trackType: trackHeatmap
* This function renders segment data (start/stop based) into a Heatmap chart
*
* @method trackHeatmap
* @param {Object[Array]} data Data to be rendered 
* @param {Object} options A configuration object containing all attributes to be changed for this trackType
* @param {Boolean} transition A boolean (true/false) used to animate(or not) a track 
*/

iGBweb.prototype.trackHeatmap = function(data, options, transition){
  var parent = App.main;
    this.transition = transition || false;
    this.options = options || {};
    this.options.height = options.height || parent.height;
    this.options.yPosition = options.yPosition || 0;
    //this.options.color = options.color || "blue";
    //this.options.positionalWidth = options.positionalWidth || "2px";
    //this.options.breakpointWidth = options.breakpointWidth || 50;
    this.options.name = options.name || "trackPosition_"+new Date().getTime();
    this.options.maxValue = +options.maxValue || d3.max($.map(data, function(d) { return +d.value; })) // this get's local_data max always if user doesn't set min/max
    this.options.centerValue = +options.centerValue || 0
    this.options.minValue = +options.minValue || d3.min($.map(data, function(d) { return +d.value; })) // this get's local_data min always if user doesn't set min/max
    this.options.colorScale = options.colorScale || ["#0000ff", "#008000", "#ffff00"]
    this.options.gridSize = options.gridSize || 40
    
    //this.options.rectPadding = options.rectPadding || 60


  //var gridSize = 80,
      h = (this.options.gridSize - 10),
      w = this.options.gridSize,
      rectPadding = 60;
  //var colorLow = '#0000ff', colorMed = '#008000', colorHigh = '#ffff00';
  var colorScale = d3.scale.linear()
       .domain([this.options.minValue, this.options.centerValue , this.options.maxValue])
       .range(this.options.colorScale);
       //debugger


  var heatmap = parent.focus.selectAll("#" + this.options.name)
      .data(data, function(d){return d.start});
     
     //data.forEach(function(d){if(d.start == 1737935){console.log("found")}})
    heatmap.exit().remove();

    //insert
    heatmap
        .enter().append("rect")
        .attr("id", this.options.name)
        .attr("class", "chart")
        .attr("clip-path", "url(#clip)");
        
    
      if(transition){
        heatmap.transition()
        //.attr("x", function(d) {return parent.x(d.start); })
        .attr("x", function(d,i) {  
      if( (+d.start) < (+d.stop) ){
        return parent.x(+d.start);    
      }
      else{
        return parent.x(+d.stop); 
      }
      
        })
        .attr("width", function(d,i) {
          if( (+d.start) < (+d.stop) ){
            return parent.x( ( (+d.stop) - (+d.start) ) + (parent.view.left) );    
          }
          else {
            return parent.x( ( (+d.start) - (+d.stop) ) + (parent.view.left) );  
          }
        })
      
        .attr("y", function(d) { 
            if(d.strand == '+') return  (options.yPosition); else return  (options.yPosition);
        })
        //.attr("width", function(d) { return parent.x(d.stop - d.start) + parent.view.left; })
        .attr("height", function(d) { return h; })
        .style("fill", function(d) {/*if(d.start == 1737935){console.log("found-before"); debugger};*/ return colorScale(d.value); })
        .style("stroke", "white")
      
      }else{
      heatmap
        //.attr("x", function(d) {return parent.x(d.start); })
        .attr("x", function(d,i) { 
      if( (+d.start) < (+d.stop) ){
        return parent.x(+d.start);    
      }
      else{
        return parent.x(+d.stop); 
      }
      
        })
        .attr("width", function(d,i) {
          if( (+d.start) < (+d.stop) ){
            return parent.x( ( (+d.stop) - (+d.start) ) + (parent.view.left) );    
          }
          else {
            return parent.x( ( (+d.start) - (+d.stop) ) + (parent.view.left) );  
          }
        })
      
        .attr("y", function(d) { 
            if(d.strand == '+') return (options.yPosition); else return (options.yPosition);
        })
        //.attr("width", function(d) { return parent.x(d.stop - d.start) + parent.view.left; })
        .attr("height", function(d) { return h; })
        .style("fill", function(d) {/*if(d.start == 1737935){console.log("found")};*/ return colorScale(d.value); })
        .style("stroke", "white")
        //.append("svg:title")
        //.text(function(d){debugger ; return ("strand: " +  d.strand + ", " + d.start+":"+d.stop + ", [value: "  + d.value + "]")}) 
        }
        
}


iGBweb.prototype.trackFixedSymbol = function(data, options){
  

  this.options = options || {};
  this.options.name = options.name || "trackFixedSymbol";
  this.options.radius = options.radius || 1;

  //debugger

  var s = d3.svg.symbol().type('triangle-up').size(1);

  App.genomeController.svg2.selectAll("#" + this.options.name)
        .data(data)
        .enter().append("path")
        .attr("id", this.options.name )
        .attr('d',s)
        .attr('stroke','#000')
        .attr('stroke-width',.1)

        .attr('transform',function(d,i){ return "translate("+(App.genomeController.x3(d.start) + 40)+","+(20)+")"; });

}
iGBweb.prototype.trackFixedCircle = function(data, options){
  

  var options = options || {};
  options.name = options.name || "trackFixedSymbol";
  options.radius = options.radius || 1;


  App.genomeController.svg2.selectAll("#" + this.options.name)
        .data(data)
        .enter().append("circle")
        .attr("id", this.options.name )
        .attr("cx", function(d) {
          return App.genomeController.x3(d.position);
        })
        .attr("cy", 20)
        .attr("r", 2)
        .style("fill", "steelblue")
        .attr("transform", "translate(" + 40 + "," + (0) + ")");;

}
