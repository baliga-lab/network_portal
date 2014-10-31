/**
* This function creates an auxiliar SVG element to represent a sequenceElement (i.e., chr, plasmids) of a given organism.
*
* @method genomeController
* @param {string} elemid Element ID (div id) where one wants to render data visualization
* @param {string} genomeInfo Sequence Element information
* @param {string} options All options/elements (Object) the user wants to pass to the visualization
* @constructor
*/
iGBweb.genomeController = function(elemid, genomeInfo, options){
  var self = this;
  this.chart = document.getElementById(elemid);
  var parent = App.main;
  

  this.widthGenome = parent.width;
  this.heightGenome = 50;  

  this.genomeInfo = genomeInfo || {};
  this.genomeInfo.start = genomeInfo.start || null; 
  this.genomeInfo.stop = genomeInfo.stop || null;
  this.genomeInfo.id =  genomeInfo.id || null;
  this.genomeInfo.name = genomeInfo.name || null;
  this.genomeInfo.type = genomeInfo.type || null;
  
  this.options = options || {};
  this.options.lockBrush = options.lockBrush || false;
  this.options.lockSize = options.lockSize || 5000;

  this.x3 = d3.scale.linear().range([0, parent.width]).domain([this.genomeInfo.start, this.genomeInfo.stop])
  this.y3 = d3.scale.linear().range([40, 0]).rangeRound([0, 40])
  this.xAxis3 = d3.svg.axis().scale(this.x3).orient("bottom");

  this.brush = d3.svg.brush()
      .x(this.x3)
      //.on("brushend", brush3End)
      .on("brushend", this.brushGenome)
      .on("brush", this.brushGene);

  this.svg2 = d3.select("#" + elemid).append("svg")//#principal
    .attr("id", "svg2")
    .attr("width", this.widthGenome + 50)
    .attr("height", this.heightGenome);


  var genome = this.svg2.append("g")
      .attr("transform", "translate(" + 40 + "," + (0) + ")");



    genome.append("text")
      .attr("id", "genomeInfo")
      .attr("dx", this.widthGenome/4) // padding-right
      .attr("dy", ".999em") // vertical-align: middle
      .attr("text-anchor", "center") // text-align: right;
      .attr("opacity", 0.5)
      .text(this.genomeInfo.name + " - " + this.genomeInfo.type + " - [" + this.genomeInfo.start + ":" + this.genomeInfo.stop + "]");


    genome.append("g")
                .attr("class", "x axis")
                .attr("id", "brush_genomeController")
                .attr("transform", "translate(0," + (this.heightGenome - 30) + ")")
                .call(this.xAxis3);

     genome.append("g")
              .attr("class", "x brush")
              .call(this.brush)
            .selectAll("rect")
              .attr("y", -6)
              .attr("height", this.heightGenome + 7);

      //d3.selectAll('g.resize').style("cursor", "none")
      if(options.lockBrush){
        //if lockBrush = true draw brush, lock it and reset App.main brush to the chr start
        this.brush.extent([+this.genomeInfo.start, ( (+this.genomeInfo.start) + options.lockSize)])
        this.svg2.selectAll(".x.brush").call(this.brush)
        parent.x.domain(this.brush.extent());
        parent.x2.domain(this.brush.extent());
        parent.focus.select(".x.axis").call(parent.xAxis);
        parent.context.select(".x.axis").call(parent.xAxis2);


        console.log("removing resize")
        this.svg2.selectAll(".background").remove()
        this.svg2.selectAll(".resize.w").remove()
        this.svg2.selectAll(".resize.e").remove()

        //parent.drawGene(g)
      }
      else{
        this.brush.extent([parent.options.focus_context.start, parent.options.focus_context.stop])
        this.svg2.selectAll(".x.brush").call(this.brush)
        this.svg2.selectAll(".background").remove()
        //parent.x.domain(this.brush.extent());
        //parent.x2.domain(this.brush.extent());
        //parent.focus.select(".x.axis").call(parent.xAxis);
        //parent.context.select(".x.axis").call(parent.xAxis2);
        //parent.drawGene()
      }

     App.genomeController = this;
}
/**
* This function is called everytime the element brush (inside the genomeController SVG) changes
*
* @method brushGenome
*/
iGBweb.genomeController.prototype.brushGenome = function(){
  var parent = App.main;

      if(!App.genomeController.brush.empty()){
      
      
      if(!parent.brush.empty()){
        parent.brush.clear();
        parent.svg.select("x.brush").call(parent.brush);
        parent.leftHandle.attr("x",-1000);
        parent.rightHandle.attr("x",-1000);
      }


      //parent.brush.clear();
      //parent.svg.select("x.brush").call(parent.brush);
      //console.log("inside brushed3");
      parent.view.left = App.genomeController.brush.extent()[0];
      parent.view.right = App.genomeController.brush.extent()[1];
      //getSequenceAnnotationData(id, d3.round(view.left), d3.round(view.right), "gene");
      parent.left=parent.view.left; parent.right=parent.view.right;
      parent.x.domain([parent.view.left, parent.view.right]);
      parent.x2.domain([parent.view.left, parent.view.right]);
    
      // updating the brush3 - genome
      //brush3.extent([view.left,view.right]);
      //svg2.select(".brush").call(brush3);
      //left = view.left; right = view.right;
      //parent.svg.select(".brushFocus").call(parent.brush);
      parent.svg.select(".brush").call(parent.brush);
      parent.focus.select(".x.axis").call(parent.xAxis);
      parent.context.select(".x.axis").call(parent.xAxis2);
    
      // everytime I move my central brush, I reload my data
  
    
      //parent.drawGene(g);
      parent.createTrack(App.registerTracks, true) //true --> resets the data to original (or make a new ajaxCall)
    }
    else{
      parent.resetView()
    }
}

iGBweb.genomeController.prototype.brushGene = function(){
  var parent = App.main;
  //debugger

      if(!App.genomeController.brush.empty()){
      
      
      if(!parent.brush.empty()){
        parent.brush.clear();
        parent.svg.select("x.brush").call(parent.brush);
        parent.leftHandle.attr("x",-1000);
        parent.rightHandle.attr("x",-1000);
      }


      App.genomeController.svg2.selectAll("#genomeInfo").text(App.genomeController.genomeInfo.name + " - " + App.genomeController.genomeInfo.type + " - [" + App.genomeController.genomeInfo.start + ":" + App.genomeController.genomeInfo.stop + "]" + "  ["+d3.round(App.genomeController.brush.extent()[0])+"-"+d3.round(App.genomeController.brush.extent()[1])+"]");
      //parent.view.left = App.genomeController.brush.extent()[0];
      //parent.view.right = App.genomeController.brush.extent()[1];
      
      //parent.left=parent.view.left; parent.right=parent.view.right;
      //parent.x.domain([parent.view.left, parent.view.right]);
      //parent.x2.domain([parent.view.left, parent.view.right]);
    
      //parent.svg.select(".brush").call(parent.brush);
      //parent.focus.select(".x.axis").call(parent.xAxis);
      //parent.context.select(".x.axis").call(parent.xAxis2);
    
      // everytime I move my central brush, I reload my data
  
      //console.log("drawGene only")
      //parent.drawGene(App.registerTracks_original["track1"].data, App.registerTracks_original["track1"].options);
      //parent.createTrack(App.registerTracks, true) //true --> resets the data to original (or make a new ajaxCall)
    }
    else{
      parent.resetView()
    }
}

