/* JS for D-3 Coordinated-Viz by Rosemary P. Wardley, 2017 */

//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["2010", "2011", "2012", "2013", "2014_Provisional"]; //list of attributes
var expressed = attrArray[0]; //initial attribute
    
//example 1.3
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //example 2.1
    //map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 460;
    
    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create global projection
    var projection = d3.geoMollweide()
        .scale(150)
        .translate([width / 2, height / 2]);
    //example 2.2
     var path = d3.geoPath()
        .projection(projection);
    
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "./data/OIV.csv") //load attributes from csv
        .defer(d3.json, "./data/world_110m.topojson") //load choropleth spatial data
        .await(callback);
    
    //example 1.5
    function callback(error, csvData, world){
        
        //place graticule on the map
        setGraticule(map, path);
        
        //translate TopoJSON
        var countries = topojson.feature(world, world.objects.world_110m).features;
        
         //join csv data to GeoJSON enumeration units
        countries = joinData(countries, csvData);
        
        //create the color scale
        var colorScale = makeColorScale(csvData);

        //add enumeration units to the map
        setEnumerationUnits(countries, map, path, colorScale);
        
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
        
        //added this to finally get the dropdown to show up!
        //need to figure out how to get the attributes in it
        createDropdown(csvData); //create the dropdown menu
        
        //examine the results
        //console.log(countries);
        //console.log(csvData);
        //console.log(colorScale);
        };
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            //.html("<h3>Select Variable:</h3>")
            .append("select")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });

        console.log(dropdown);
    };
}; //end of setMap()

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var regions = d3.selectAll(".regions")
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        //resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
};
    
function changeAttribute(attribute, csv){
    // set the variable to the one chosen from your html drop-down
    expressed = attribute;

    // Get the max value for the selected attribute
    var max = d3.max(csv,function(d){
        return +d[expressed];});

    // yScale is a global variable - just set the domain to 0 and the max value you found. Adjust if needed.
    yScale = d3.scaleLinear()
    .range([0, chartHeight])
    .domain([0,max]);
};
 
function setGraticule(map, path){
    //example 2.5
    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([15, 15]); //place graticule lines every 15 degrees of longitude and latitude

    //example 2.8 create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule

    //example 2.6 line 5...create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
};

function joinData(countries, csvData){
    //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.iso; //the CSV primary key
            
            //console.log(csvRegion);
            //console.log(csvKey);

            //loop through geojson regions to find correct region
            for (var a=0; a<countries.length; a++){

                var geojsonProps = countries[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.iso_a3; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                    //console.log(geojsonProps);
                };
            }; 
        };
    return countries;
};
    
function setEnumerationUnits(countries, map, path, colorScale){
    //add World regions to map
    var world = map.selectAll(".world")
        .data(countries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "world " + d.properties.iso_a3;
        })
        .attr("d", path)
        .style("fill", function(d){
         return colorScale(d.properties[expressed]);
        });
    //createDropdown(csvData); //create the dropdown menu
};
    
/*/function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .html("<h3>Select Variable:</h3>")
        .append("select")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
    
    console.log(dropdown);
};*/

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //console.log(clusters);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};

//function to test for data value and return color
function choropleth (props, colorScale){
  //make sure attribute value is a number
  var val = parseFloat(props[expressed]);
  //if attribute value exists, assign it a color, otherwise grey
  if (typeof val == 'number' && !isNaN(val)){
    return colorScale (val);
  } else {
      return "#CCC";
  };
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 460,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    
    /*/NEW axis create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);*/
    
    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        //.range([463, 0])
        .domain([0, 50005]);
    
    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.iso;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length)+ leftPadding;
        })
        .attr("height", function(d, i){
            return 1000 - yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .attr("y", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed]));
            //return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
          //Example 2.5 line 23...end of bars block
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
        //console.log(bars);
    
    //example 2.8 annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.iso;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            return d[expressed];
        });
        //console.log(numbers);
    
    //example 2.10...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed[3] + " in each region");
    
    /*/NEW example 2.12 create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale)
        .orient("left");

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);*/
};   
    
})(); //last line of main.js