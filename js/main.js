// Execute script when window opens
window.onload = setMap(); 
    
// Sets up choropleth map
function setMap() {
    var width = 960, height = 460;  // map dimensions
    
    // Create svg graphic as container for map; setting width & height within svg graphic as attributes
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    // Create Albers USA equal area conic projection centered on US
    var projection = d3.geoAlbersUsa()     // could use geoAlbersUsa()
        .scale(900)                     // factor by which distances between points are multiplied, increasing or decreasing map scale.
        .translate([width/2, height/2]);    // offsets  pixel coords of projection's center in <svg> container. Keep these as one-half the <svg> width and height to keep map centered in container.
   
    // Projection using Albers projection that uses rotation & centering
    // check out http://uwcart.github.io/d3-projection-demo/ to get parameters easily
//    var projection = d3.geoAlbersUsa()     // could use geoAlbersUsa()
//        .center([7.27, 39.05])          // [longitude, latitude] coordinates of the center of the plane.
//        .rotate([104, -0.91, 0])        // [longitude, latitude, and roll] angles by which to rotate globe
//        .parallels([45.00, 25.00])      // two standard parallels of a conic projection. If both array values are same, projection is a tangent case (plane intersects globe at one line of latitude); if different, it is a secant case (plane intersects globe at two lines of latitude, slicing through it).
//        .scale(900)                     // factor by which distances between points are multiplied, increasing or decreasing map scale.
//        .translate([width/2, height/2]);    // offsets  pixel coords of projection's center in <svg> container. Keep these as one-half the <svg> width and height to keep map centered in container.    
    
    
    var path = d3.geoPath()
        .projection(projection);
    
    d3.queue()
        .defer(d3.csv, "data/StateEnergyProfiles.csv")      // csv with attributes
        .defer(d3.json, "data/ne_50m_us_states.topojson")   // topojson of states
        .await(callback);
    
    // function to handle any data loading errors
    function callback(error, csvData, states) {
        
        // Add graticule lines above states code to have it draw first
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
                        

        var stateBoundaries = topojson.feature(states, states.objects.ne_50m_us_states).features;
        
        // Can reference topojson files of states with attributes "name" or "fipscode"
        var states = map.selectAll(".states")
            .data(stateBoundaries)
            .enter()
            .append("path")
            .attr("class", function(d) {
                  return "states " + d.properties.name;
                  })
            .attr("d", path);  // path variable is the svg path
//            .attr("d", path(topojson.mesh(states, states.objects.ne_50m_us_states)).features;, 
//                function(a, b) { 
//                    return a !== b; 
//                })));
        
        console.log(error);
        console.log(csvData);
        console.log(states);

    }
}
