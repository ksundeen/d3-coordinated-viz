
/* See js best practices: https://www.w3.org/wiki/JavaScript_best_practices#Avoid_globals
wrapping all code in a function to ensure all local variables within this file are not accessible to other js libraries
*/
(function() {
 
    // Pseudo-global variables (global within this file, but local for all other js libraries referenced)
    var attrArray = ["AveRetailPrice_CentsPerKWH", "NumElectricCo", "NetSummerCapacity_MW_per_SqMi", "NetGeneration_MW_per_SqMi", "TotalRetailSales_per_SqMi"];
    
/* all attributes in csv file, but these will have drastically different values, so I removed only those I want to show    
    var attrArray = ["AveRetailPrice_CentsPerKWH", "NetSummerCapacity_MW", "NetGeneration_MWH", "TotalRetailSales_MWH", 
                     "NumElectricCo", "NetSummerCapacity_MW_per_SqMi", "NetGeneration_MW_per_SqMi", "TotalRetailSales_per_SqMi"];
*/  
    var expressedAttr = attrArray[0]; // initial attribute for array

    // Execute script when window opens
    window.onload = setMap(); 

    // Sets up choropleth map
    function setMap() {
        var width = 850, height = 460;  // map dimensions

        // Create svg graphic as map container; setting width & height within svg graphic as attributes
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        // Create Albers USA equal area conic projection centered on US
        var projection = d3.geoAlbersUsa()     // could use geoAlbersUsa()
            .scale(900)                     // factor by which distances between points are multiplied, increasing or decreasing map scale.
            .translate([width/2, height/2]);    // offsets  pixel coords of projection's center in <svg> container. Keep these as one-half the <svg> width and height to keep map centered in container.

        var path = d3.geoPath()
            .projection(projection);

        d3.queue()
            .defer(d3.csv, "data/StateEnergyProfiles.csv")      // csv with attributes
            .defer(d3.json, "data/ne_50m_us_states.topojson")   // topojson of states
            .await(callback);

        // function to handle any data loading errors
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
    
    function setEnumerationUnits(stateBoundaries, map, path) {
        // Can reference topojson files of states with attributes "name" or "fipscode"
        var states = map.selectAll(".states")
            .data(stateBoundaries)
            .enter()
            .append("path")
            .attr("class", function(d) {
                  return "states " + d.properties.name;
                  })
            .attr("d", path);  // path variable is the svg path

        //console.log(error);
        //console.log(csvData);
        console.log(stateBoundaries);
    };
    
    // Jenks Methods to create color scale based on attribute values in a csv file
    function makeColorScale(data) {
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"            
        ];
        
        // d3's color generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
        
        // Builds array of all values from "expressedAttr" global array
        // USE THIS TO CREATE SEPARATE RANGES FOR EACH VARIABLE
        var domainArray = [];
        for (var i=0; i<data.length; i++) {
            var val = parseFloat(data[i][expressedAttr]);
            domainArray.push(domainArray);
        };
        
        // Cluster data using ckmeans alogorithm for natural breaks of 5 classes
        var clusters = ss.ckmeans(domainArray, 5);
        
        // Reset domain array to cluster mins... WHY???
        domainArray = clusters.map(function(d) { 
            return d3.min(d);    
        });
        console.log('clusters: ',clusters);
        
        // remove 1st value from domain array to create class breakpoints
        domainArray.shift();
        
        // Assign all values as scale domain for last 4 clusters of values
        colorScale.domain(domainArray);
        return colorScale;
    };    
    
//    // Creates color scale based on attribute values in a csv file
//    function makeColorScale(data) {
//        var colorClasses = [
//            "#D4B9DA",
//            "#C994C7",
//            "#DF65B0",
//            "#DD1C77",
//            "#980043"            
//        ];
//        
//        // d3's color generator
//        var colorScale = d3.scaleQuantile()
//            .range(colorClasses);
//        
//        // Set min/max values for scalebare
//        var minmax = [
//            d3.min(data, function(d) { return parsefloat(d[expressedAttr]); }),
//            d3.max(data, function(d) { return parsefloat(d[expressedAttr]); })
//        ];
//        colorScale.domain(minmax);
//        return colorScale;
//        
////        // Builds array of all values from "expressedAttr" global array
////        // USE THIS TO CREATE SEPARATE RANGES FOR EACH VARIABLE
////        var domainArray = [];
////        for (var i=0; i<data.length; i++) {
////            var val = parseFloat(data[i][expressedAttr]);
////            domainArray.push(domainArray);
////        };
////        
////        // Assign all values as scale domain 
////        colorScale.domain(domainArray);
//    };
})();
