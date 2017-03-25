

// Execute script when window opens
window.onload = function() {
    // SVG graphic dimensions
    var w = 900, h = 500;
    
    var container = d3.select("body") // gets body element from DOM
        .append("svg") // put a svg in body element
        .attr("width", w) // svg width
        .attr("height", h) // svg height
        .attr("class", "container") // assigns class to element container
        .style("background-color", "rgba(0,0,0,0.2)");
    console.log(container);
    
    // Append rectangle to container svg object above
    var innerRect = container.append("rect")
        .datum(400) // single value for datum (compared to data())
    
        // returns anonymous functions for width & height of rect object
        .attr("width", function(d) {
            return d * 2; // returns 2 * 400 = 800
        })
        .attr("height", function(d) {
            return d;  // returns 400
        })
        .attr("class", "innerRect") // adding class name to element
        .attr("x", 50) // position from left on x
        .attr("y", 50) // position from top on y
        .style("fill", "FFFFFF"); 
    
    console.log("innerRect: ", innerRect);
    
    
    // example for showing complicated arrays to show multiple data values joined using data() instead of datum()
    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];
    

    
    // finds max & min of populations
    var minPop = d3.min(cityPop, function(d) {
        console.log("minPop: ", minPop);
        return d.population;
    });
    var maxPop = d3.max(cityPop, function(d) {
        console.log("maxPop: ", maxPop);
        return d.population;
    });
    
    // x-coordinate scale object (as a generator function to create another array of values)
    var xScale = d3.scaleLinear()
        .range([90, 745]) // output min & max
        .domain([0, 3]); // input min & max    
    
    // scale y-coordinate circles using max & min values
    var yScale = d3.scaleLinear()
        .range([440, 50])   // 440 is listed 1st since it's the higher range & SVG coord [0,0] is UPPER LEFT corner
//        .domain([minPop, maxPop]);
        .domain([0, 700000]);   // add manual max & min so scale bar would reach entire graph
    
    // color scale generator
    var color = d3.scaleLinear()
        .range(["#FDBE85", "#D94701"])
        .domain([minPop, maxPop]);
    
    // create a new (empty) circle selection & binding a data array to the container element above
    var circles = container.selectAll(".circles") // selects all matching elements in DOM...but in this case it creates an empty selection since .circles class doesn't yet exist
        .data(cityPop)
        .enter() //joins data to selection & creates an array of placeholders for one markup element per data array value.
        .append("circle") // adds 1 circle to each array datum
        .attr("class", "circles") // applies class of "circles" to each datum
        
        .attr("id", function(d) {
            return d.city;
        })
        // calculate SVG radius based on city population as circle area, where "d" is the data of the selection; i is the index
        .attr("r", function(d) {
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i) {    // SVG's x coord
            return xScale(i); // uses the scale generator function of i (index) to place each circle horizontally???
        })
        .attr("cy", function(d){
            return yScale(d.population);
        })
        .style("fill", function(d, i) { // add a fill based on color() scale generator function 
            return color(d.population);
        })
        .style("stroke", "#000"); // black circle strokes
        
        // create a y-axis generator oriented left & append to the "axis" group ("g") container
        var yAxis = d3.axisLeft(yScale)
            .scale(yScale);
//            .orient("bottom");  //from d3 version 3
    
        var axis = container.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(50,0)")  // moves svg scalebar right 50 pixels
            .call(yAxis);  
//        yAxis(axis);  code same as ".call(yAxis)" since it runs the generator function using the scale() function
    
        var title = container.append("text")
            .attr("class", "title")
            .attr("text-anchor", "middle")
            .attr("x", 450)
            .attr("y", 30)
            .text("City Populations");
    
        // bubble labels
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("dy", "-5") // add vertical offset to svg label
    
        // maintain y axis in labels
        .attr("y", function(d){
            //vertical position centered on each circle
            return yScale(d.population) + 5;
        });
    
    // appends a tspan label line for easier word wrapping for x axis
    var nameLabel = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return xScale(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })        
        .text(function(d) {
            return d.city;
        });
    
    // format with comma
    var commaFormat = d3.format(",");
    
    // appends 2nd line label
    var popLabel = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return xScale(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15") // add vertical offset to svg label
        .text(function(d){
            return "Pop. " + commaFormat(d.population);
        });        
        
            
};