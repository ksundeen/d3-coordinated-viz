
/* See js best practices: https://www.w3.org/wiki/JavaScript_best_practices#Avoid_globals
wrapping all code in a function to ensure all local variables within this file are not accessible to other js libraries
to set break points, use debugger; where you want a breakpoint
*/
"use script";
(function() {
 
    // Pseudo-global variables (global within this file, but local for all other js libraries referenced)
    var attrArray = ["AveRetailPrice_CentsPerKWH", "NumElectricCo", "NetSummerCapacity_MW_per_SqMi", "NetGeneration_MW_per_SqMi", "TotalRetailSales_per_SqMi"];
    
    var pageHeight = 460;
    
/* all attributes in csv file, but these will have drastically different values, so I removed only those I want to show    
    var attrArray = ["AveRetailPrice_CentsPerKWH", "NetSummerCapacity_MW", "NetGeneration_MWH", "TotalRetailSales_MWH", 
                     "NumElectricCo", "NetSummerCapacity_MW_per_SqMi", "NetGeneration_MW_per_SqMi", "TotalRetailSales_per_SqMi"];
*/  
    var expressedAttr = attrArray[0]; // initial attribute for array

    // chart dimensions with responsive width & height
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = pageHeight,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    // scale to size bars proportional to window frame
    var yScale = d3.scaleLinear()
        .range([chartHeight-10, 0])    // all possible OUTPUT PIXELS
        .domain([0, 27]); // all possible INPUT VALUES      

    // Execute script when window opens
    window.onload = setMap(); 

    // Sets up choropleth map
    function setMap() {
        // var width = 850, height = 460;  // Replaced original map dimensions with using HTML innerWidth attribute
        var width = window.innerWidth * 0.5,
            height = pageHeight;

        // Create svg graphic as map container; setting width & height within svg graphic as attributes
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        // Create Albers USA equal area conic projection centered on US
        var projection = d3.geoAlbersUsa()     // could use geoAlbersUsa()
            .scale(400)                     // factor by which distances between points are multiplied, increasing or decreasing map scale.
            .translate([width/2, height/2]);    // offsets  pixel coords of projection's center in <svg> container. Keep these as one-half the <svg> width and height to keep map centered in container.

        var path = d3.geoPath()
            .projection(projection);

        d3.queue()
            .defer(d3.csv, "data/StateEnergyProfiles.csv")      // csv with attributes
            .defer(d3.json, "data/ne_50m_us_states.topojson")   // topojson of states
            .await(callback);

        // function to load data & report errors during loading
        function callback(error, csvData, states) {

            // Sets graticule lines with blue ocean
            setGraticule(map, path);

            // Translating topojson to geojson
            var stateBoundaries = topojson.feature(states, states.objects.ne_50m_us_states).features;

            // Add state geojson to map
            var states = map.append("path")
                .datum(stateBoundaries)
                .attr("class", "countries")
                .attr("d", path);

            // Join csv data to geojson states (as enumeration units)
            stateBoundaries = joinData(stateBoundaries, csvData);
            
            // Generates a color scale based on full range of all values in csvData
            var colorScale = makeColorScale(csvData);

            // Add states geojson as enumeration units
            setEnumerationUnits(stateBoundaries, map, path, colorScale);
            
            // Build chart container of graphs
            setChart(csvData, colorScale);
            
            // Create d3-based dropdown in DOM
            createDropDown(csvData);
        };
    }; // end setMap() function

    function setGraticule(map, path) {
        var graticule = d3.geoGraticule()
            .step([5, 5]);  // places graticule line every 5 degrees of lat/long

        var gratBackground = map.append("path")
            .datum(graticule.outline())         // binds graticule background
            .attr("class", "gratBackground")    // assigns class for css styling
            .attr("d", path)                    // projects graticule and attaches d to path of svg

        // select all graticule lines to append to each element 
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines())    // bind graticule lines to each element to be created
            .enter()                    // create an element for each datum
            .append("path")             // append each element to the svg as a path element
            .attr("class", "gratLines") // assign class for styling
            .attr("d", path);           // project graticule lines
    };

    function joinData(stateBoundaries, csvData) {
        // Looping through array to join to geojson state
        for (var i=0; i < csvData.length; i++) {
            var csvStates = csvData[i];  // current region's data for variable i
            var csvKey = csvStates.fipscode; // csv's primary key to join to geojson file
            //console.log(stateBoundaries);
            // then for each csv value, loop through geojson states to find matching state
            for (var a = 0; a < stateBoundaries.length; a++) {
                var geojsonProperties = stateBoundaries[a].properties;  // getting geojson stateBoundaries properties
                var geojsonKey = geojsonProperties.fipscode;            // matching geojson key

                // if geojsonKey matches csvKey, set csv properties to geojson object (temp. join)
                if (geojsonKey == csvKey) {
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvStates[attr]);  // gets csv attribute value parsed as a floating point val
                        geojsonProperties[attr] = val;           // with csv val, find matching val to geojson data
                    });
                };
            };
        };        
      
        return stateBoundaries;  
    };
    
    function setEnumerationUnits(stateBoundaries, map, path, colorScale) {
        // Can reference topojson files of states with attributes "name" or "fipscode"
        var states = map.selectAll(".states")
            .data(stateBoundaries)
            .enter()
            .append("path")
            .attr("class", function(d) {
                  return "states " + d.properties.fipscode;
                  })
            .attr("d", path) // path variable is the svg path
            .style("fill", function(d) {
                return getChoroplethColor(d.properties, colorScale);
            })

        //console.log(error);
        //console.log(csvData);
        console.log(stateBoundaries);
    };
    
    function getChoroplethColor(featureProperties, colorScale){
        // convert val to float for expressedAttr global variable
        var val = parseFloat(featureProperties[expressedAttr]);
        // if val is NaN, then return gray color
        if (typeof val == 'number' && !isNaN(val)) {
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };
    
    // Jenks Methods to create color scale based on attribute values in a csv file
    function makeColorScale(data) {
        var colorClasses = [
            "#edf8e9",
            "#bae4b3",
            "#74c476",
            "#31a354",
            "#006d2c"
        ];
        
        // d3's color generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
        
        // Builds array of all values from "expressedAttr" global array
        // USE THIS TO CREATE SEPARATE RANGES FOR EACH VARIABLE
        var domainArray = [];
        for (var i=0; i<data.length; i++) {
            var val = parseFloat(data[i][expressedAttr]);
            domainArray.push(val);
        };
        
        // Cluster data using ckmeans alogorithm for natural breaks of 5 classes
        var clusters = ss.ckmeans(domainArray, 5);
        
        // Reset domain array to cluster mins to get the min. value from each array. Min values serve as break points
        domainArray = clusters.map(function(d) { 
            return d3.min(d);    
        });
        
        // remove 1st value from domain array to create class breakpoints
        domainArray.shift();
        
        // Assign all values as scale domain for last 4 clusters of values
        colorScale.domain(domainArray);
        return colorScale;
    };    
    
    function setChart(csvData, colorScale) {        
        // svg element to hold bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");       
        
        // create background rectangle for chart fill
        var chartBackground = d3.select("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        // set chart bars for each state. Sets widge of the (page width)/# data records
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
        
            // sort graph bars in ascending order using d3's sort ()method; comparator js function to compare each value to the next
            .sort(function(a, b) {
                return b[expressedAttr] - a[expressedAttr];
            })
            .attr("class", function(d){
                return "bar " + d.fipscode;
            })
            .attr("width", chartWidth / csvData.length - 1); 

        // Bar title
        var chartTitle = chart.append("text")
            .attr("x", 40)  // append 40 pixels to the right
            .attr("y", 40)  // append 40 pixels down
            .attr("class", "chartTitle")
            .text("State " + expressedAttr);
        
        // Vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);
//            .orient("left");
        
        // place axis; the svg "g" group attribute
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        // frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        // set bar positions, heights, & bar colors
        updateChart(bars, csvData.length, colorScale);
    };
    
    // Adds dropdown menu to DOM
    function createDropDown(csvData) {
        // add "select" element to body & add dropdown class. Uses event listener for changing the dropdown
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function() {
                changeAttribute(this.value, csvData)
            });
            
        // initial options to title class, to allow use to turn on title??
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")       // disabled to prevent users from selecting the name of "Select Attribute" since this is only the default option
            .text("Select Attribute");
        
        // add attribute name options for the attribute array
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d) { return d; })
            .text(function(d){ return d; });
    };
    
    // Takes data & changes attribute based on user interaction within dropdown
    function changeAttribute(attribute, csvData) {
        // change expressed attribute from data array attrArray; replaces global variables with whay user selects in dropdown
        expressedAttr = attribute;
        
        // recreate color scale for new attribute
        var newColorScale = makeColorScale(csvData);
        
        // recolor enumeration units
        var newStates = d3.selectAll(".states")
            .style("fill", function(d) {
                return getChoroplethColor(d.properties, newColorScale)
            });
        
        // changing axis based on changed data value ranges
        var dataMax = d3.max(csvData, function(d) { 
            return + parseFloat(d[expressedAttr]); 
        });
        
        // reset yScale to new range of data users selected
        yScale = d3.scaleLinear()
            .range([chartHeight-15, 0])
            .domain([0, dataMax]);                
        
        // re-sort, re-size, & recolor bars for new attributes
        var bars = d3.selectAll(".bar")
            //re-sort
            .sort(function(a, b){
                return b[expressedAttr] - a[expressedAttr];
            });
        
        updateChart(bars, csvData.length, newColorScale);
    };
    
    // Sets bar positions, heights, & colors
    function updateChart(bars, n, colorScale) {
        // position bars
        bars.attr("x", function(d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
        
        /*size/resize bars based on chart heights
        Needed if-else to catch negative values from chart calculation*/
        .attr("height", function(d){
            var outHeight = (chartHeight-10) -  yScale(d[expressedAttr]);
            //console.log("chartHeight: ",chartHeight, "expressedAttr: ", d[expressedAttr]);
            if (outHeight <= 0) {
                return 0;
            } else {
                return (chartHeight-10) -  yScale(d[expressedAttr]);
            }})
        .attr("y", function(d) {
            return yScale(parseFloat(d[expressedAttr])) + topBottomPadding;
        })
        .style("fill", function(d) {
            return getChoroplethColor(d, colorScale);
        });
        
        var chartTitle = d3.select(".chartTitle")
            .text("State " + expressedAttr);
    };
    
})();
