(function(){

//pseudo-global variables
var attrArray = ["Bike", "Drive", "Public_Tra", "Subway", "Walk"];
var expressed = attrArray[3];


//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use queue to parallelize asynchronous data loading

    //map frame dimensions
    var width = 960,
    height = 460;

    //create a new svg container
    var map = d3.select("body")
      .append("svg")
      .attr("class", "map")
      .attr ("width", width)
      .attr ("height", height);

      //create albers equal area conic projection
      var projection = d3.geoAlbers()
        .center([0, 42])
        .rotate([70.9, 0, 0])
        .parallels ([40, 60])
        .scale(12500)
        .translate([width/2, height/2]);

      var path = d3.geoPath()
        .projection(projection);

    d3.queue()
        .defer(d3.csv, "data/Transportation.csv") //load attributes from csv
        .defer(d3.json, "data/Eastern_SB.topojson") //load background spatial data
        .defer(d3.json, "data/Counties_MA.topojson") //load chloropleth spatial data
        .await(callback);

        //Example 1.4 line 10
    function callback(error, csvData, eastSea, mass){

        //place graticule on the map
        setGraticule(map, path);

        //translate europe TopoJSON
        var easternSeaboard = topojson.feature(eastSea, eastSea.objects.Eastern_SB),
            massCounties = topojson.feature(mass, mass.objects.Counties_MA).features;

        //add New England states to the map
        var states= map.append("path")
          .datum(easternSeaboard)
          .attr("class", "states")
          .attr("d" , path);

        //join csvData
        massCounties = joinData(massCounties, csvData);

        //create color scale
        var colorScale = makeColorScale(csvData);

        //add enumeration units
        setEnumerationUnits (massCounties, map, path, colorScale);

        //examine the results
        console.log(massCounties);
        console.log(easternSeaboard);
        console.log(csvData);
       };
}; //end of setMap()


function setGraticule(map, path){
  var graticule = d3.geoGraticule()
    .step([1,1]);

  var gratBackground = map.append("path")
    .datum(graticule.outline())
    .attr("class", "gratBackground")
    .attr("d", path);

  //create lines
  var gratLines = map.selectAll(".gratLines")
    .data(graticule.lines())
    .enter()
    .append("path")
    .attr("class", "gratLines")
    .attr("d", path);
};


function joinData(massCounties, csvData){

  //loop through csv to assign each set of csv attr to geojson county

  for (var i = 0; i<csvData.length; i++){
    //the current county
    var csvCounty = csvData[i];
    //the csv PK
    var csvKey = csvCounty.GISJOIN;

    //loop through geojson counties to find correct county
    for (var a = 0; a < massCounties.length; a++){
      //the current county geojson properties
      var geojsonProps = massCounties[a].properties;
      //the geojson PK
      var geojsonKey = geojsonProps.GISJOIN;

      //where PKs match, transfer csv data to geojson properties objects
      if (geojsonKey == csvKey){
        //assign all attrs and values
        attrArray.forEach(function(attr){
          //get csv attr values
          var val = parseFloat(csvCounty[attr]);
          geojsonProps[attr] = val;
        });
      };
    };
  };
  return massCounties;
};


function setEnumerationUnits(massCounties, map, path, colorScale){
  //Add Massachusetts Counties to the map
  var counties = map.selectAll(".counties")
    .data(massCounties)
    .enter()
    .append("path")
    .attr("class", function (d){
      return "counties " + d.GISJOIN;
    })
    .attr("d", path)
    .style("fill", function(d){
      return colorScale (d.properties[expressed]);
    });
};


//function to create a color scale generator
function makeColorScale(data){
  var colorClasses = [
    "#FFCCE1",
    "#F59FBF",
    "#E8729D",
    "#D94580",
    "#C70063"
  ];

  //create color scale generator
  var colorScale = d3.scaleThreshold()
    .range(colorClasses);

  //build array of all values of the expressed attributes
  var domainArray = [];
  for (var i = 0; i < data.length; i++){
    var val = parseFloat(data[i][expressed]);
    domainArray.push(val);
  };

  //cluster data using ckmeans clustering algorithm to create Natural Breaks
  var clusters = ss.ckmeans(domainArray, 5);
  console.log(clusters);
  //reset domain array to cluster minimums
  domainArray = clusters.map(function(d){
    return d3.min(d);
  });
  //remove first value from domain array to create class breakpoints
  domainArray.shift();

  //assign array of last four cluster mimimums as a domain
  colorScale.domain(domainArray);

  return colorScale;
};

})();