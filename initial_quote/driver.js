// Colors and pretty things 
var NORMAL_COLOR = '#7570B3';
var SELECTED_COLOR = '#D95F02'
var OPTIMAL_COLOR = '#1B9E77';
var DIFF_COLOR = '#EEEEEE';
var offers;
var optimalOffer;
var selectedOffer;
var xScale, yScale;
var model_year;
var ie8_mode;
var currentQuote;

$.extend( $.fn.dataTableExt.oStdClasses, {
	    "sWrapper": "dataTables_wrapper form-inline"
} );

/* DataTables is acting funny with AJAX so using d3 to load JSON instead */
$(document).ready( function() {
    data = {}
    data.sDom = "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>";
    data.sPaginationType = "bootstrap";
    data.oLanguage = { "sSearch" : "Search all columns:" };
    data.bProcessing = true;
    data.bServerSide = true;
    data.bjQueryUI = true;
    data.sAjaxSource = "http://rbisd.com/initial_quote_app/_retrieve_server_data";
    data.fnDrawCallback = redraw_event;

    /* Initialise the DataTable */
    var oTable = $('#quote_table').dataTable( data );

    /* Select the first quote */
    first_quote = true;
});

function redraw_event() {
  $('#quote_table tbody tr').on('click', function() {
    //    oTable.$('tr').on('click', function() {
    $('#quote_table tbody tr').removeClass('success');
    $(this).addClass('success');
    var nTds = $('td', this);
    var quote = $(nTds[0]).text();
    updateTable(nTds);
    
    /* Set current customer */
    updateGraph(quote);
    
    $('html,body').animate({
            scrollTop: $('#step2').offset().top
        }, 400);
  });

  if ( first_quote ) {
    $('#quote_table tbody tr:first').trigger( "click" );
    first_quote = false;
  }
}

function updateTable(nTDs) {
    var sTDs = $('#selected_table tbody tr td');
    for (var i = 0; i < 11; ++i) {
        $(sTDs[i]).text($(nTDs[i]).text());
    }
    model_year = $(nTDs[7]).text();
}

/* Formats the package encodings into something human readable. */
function formatPackage(pack) {
	if ( pack == "T1" ) return "Platinum";
	else if ( pack == "P1" ) return "Gold";
	else if ( pack == "S1" ) return "Standard";
	else if ( pack == "A0" ) return "Value";
}

/* Returns an object with all GET variables */
function getUrlVars() {
	var map = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		map[key] = value;
	});
	return map;
}

/* Returns current premiumChange effect */
function premiumChange(current, offer) {
	if ( document.getElementById('yes_button').checked ) {

		var x = (offer-current)/current;
		var y1 = 2*Math.exp(-1500*Math.abs(Math.pow(x+0.14,3)));
		var y2 = -Math.pow(x+0.14,2);

		return (y1+y2);
	} else {
		return 0;
	}
}

/* Function for Ie8 to erase current image */
function clearImage() {
    if ( ie8_mode ) {
        var width = $('#chart_div').width();
        var height = $('#offer_table').height();
        $('#ie8_graph').attr('src', "").attr('width', width).attr('height', height); 
    }
}

/* Called from the toggle premium change radio button
 *   Hides or Shows the slider and updates the y-values of the current
 *    plot if applicapable
 */
function togglePremChange() {
    clearImage();
	if ( document.getElementById('no_button').checked ) {
		$('#slider_wrapper').css('visibility', 'hidden');
        updateCurrentPremium( 0 );
	} else {
		$('#slider_wrapper').css('visibility', 'visible');
        updateCurrentPremium( $('#slider').slider('value') );
	}
}

/* Returns min of f(x) of x in array */
function my_min(array, fn) {
    var y = fn(array[0]);
    for (var i = 1; i < array.length; ++i) {
        var t = fn(array[i]);
        if ( t < y ) y = t;
    }
    return y;
}

function my_max(array, fn) {
    var y = fn(array[0]);
    for (var i = 1; i < array.length; ++i) {
        var t = fn(array[i]);
        if ( t > y ) y = t;
    }
    return y;
}

function my_filter(array, fn) {
    var result = [];
    for (var i = 1; i < array.length; ++i) {
        if ( fn(array[i]) ) result.push(array[i]);
    }
    return result;
}

/* Updates the model scores for all of the current
 *  offers with the new current premium.
 */
function updateCurrentPremium(newCurrent) {
	var currMax = undefined;
	var currMaxI = 0;
	for (var i = 0; i < offers.length; ++i) {
		var temp = modelScore( offers[i], newCurrent );
		offers[i]["derived_score"] = temp;
		offers[i]["optimal_offer"] = false;
		
		if ( temp > currMax || i == 0 ) {
			currMax = temp;
			currMaxI = i;
		}
	}
	
	optimalOffer = currMaxI;
	offers[optimalOffer]["optimal_offer"] = true;
	
	if ( ! ie8_mode ) updateChart_yonly();

	updateOptimalOffer();

    if ( ie8_mode ) {
        var url = 'http://rbisd.com/initial_quote_app/quote/'.concat(currentQuote).concat('/').concat(newCurrent).concat('/plot.png');
        // Get dimensions of the chart div
        var width = $('#chart_div').width();
        var height = $('#offer_table').height();
        $('#ie8_graph').attr('src', url).attr('width', width).attr('height', height).show();
    }
}

/* Handy wrapper for computing the model score. */
function modelScore(data_row, current) {
    return data_row["score"] + premiumChange(current, data_row["total_offer_prem"]);
}

/* Updates the y points for all current circles on the chart */
function updateChart_yonly() {
	d3.selectAll('circle')
		.transition(1250)
		.attr('fill', circleColor)
		.attr('r', circleSize)
		.style('opacity',circleOpacity)
		.attr('cy', function(d) { return yScale(d["derived_score"]); });
}

/* Updates the table for selected offer */
function updateSelectedOffer() {

    if ( selectedOffer !== undefined ) {

        d3.select('#selected_package').text( formatPackage(offers[selectedOffer]["yca_choice"]) ).style("background-color", function(d) { return (offers[optimalOffer]["yca_choice"] != offers[selectedOffer]["yca_choice"]) ? DIFF_COLOR : ""; });
        d3.select('#selected_bi').text( offers[selectedOffer]["bi_choice"] ).style("background-color", function(d) { return (offers[optimalOffer]["bi_choice"] != offers[selectedOffer]["bi_choice"]) ? DIFF_COLOR : ""; });;
        d3.select('#selected_pd').text( offers[selectedOffer]["pd_choice"] ).style("background-color", function(d) { return (offers[optimalOffer]["pd_choice"] != offers[selectedOffer]["pd_choice"]) ? DIFF_COLOR : ""; });;
        d3.select('#selected_tow').text( offers[selectedOffer]["TOW_choice"] ).style("background-color", function(d) { return (offers[optimalOffer]["TOW_choice"] != offers[selectedOffer]["TOW_choice"]) ? DIFF_COLOR : ""; });;

        if ( model_year > 2003 ) {

            d3.select('#selected_new_cl').text( offers[selectedOffer]["cl_choice"] ).style("background-color", function(d) { return (offers[optimalOffer]["cl_choice"] != offers[selectedOffer]["cl_choice"]) ? DIFF_COLOR : ""; });;
            d3.select('#selected_new_cp').text( offers[selectedOffer]["cp_choice"] ).style("background-color", function(d) { return (offers[optimalOffer]["cp_choice"] != offers[selectedOffer]["cp_choice"]) ? DIFF_COLOR : ""; });;
            d3.select('#selected_new_rr').text( offers[selectedOffer]["rental_choice"] ).style("background-color", function(d) { return (offers[optimalOffer]["rental_choice"] != offers[selectedOffer]["rental_choice"]) ? DIFF_COLOR : ""; });;

        } else {
            d3.select('#selected_new_cl').text( "NA" );
            d3.select('#selected_new_cp').text( "NA" );
            d3.select('#selected_new_rr').text( "NA" );
        }

        d3.select('#selected_offer_seq_nbr').text( offers[selectedOffer]["offer_seq_nbr"] );
        d3.select('#selected_prem').text( Math.round(offers[selectedOffer]["total_offer_prem"]) );
  } else {
      d3.select('#selected_package').text('').style('background-color', '');
      d3.select('#selected_bi').text('').style('background-color', '');
      d3.select('#selected_pd').text('').style('background-color', '');
      d3.select('#selected_tow').text('').style('background-color', '');
      d3.select('#selected_new_cl').text('').style('background-color', '');
      d3.select('#selected_new_cp').text('').style('background-color', '');
      d3.select('#selected_new_rr').text('').style('background-color', '');
      d3.select('#selected_prem').text('').style('background-color', '');
  }
}

/* Updates the table for the optimal offer */
function updateOptimalOffer() {
    $('#offer_package').text( formatPackage(offers[optimalOffer]["yca_choice"]) );
    $('#offer_bi').text( offers[optimalOffer]["bi_choice"] );
    $('#offer_pd').text( offers[optimalOffer]["pd_choice"] );
    $('#offer_tow').text( offers[optimalOffer]["TOW_choice"] );
    
    if ( model_year > 2003 ) {
        $('#offer_new_cl').text( offers[optimalOffer]["cl_choice"] );
        $('#offer_new_cp').text( offers[optimalOffer]["cp_choice"] );
        $('#offer_new_rr').text( offers[optimalOffer]["rental_choice"] );
    } else {
        $('#offer_new_cl').text( "NA" );
        $('#offer_new_cp').text( "NA" );
        $('#offer_new_rr').text( "NA" );
    }
    $('#offer_prem').text( Math.round(offers[optimalOffer]["total_offer_prem"]) );
    if ( !ie8_mode && selectedOffer !== undefined ) updateSelectedOffer();
}

/* Function to return the color of the circle corresponding to the offer
 *  at index */
function circleColor(row, index) {
	if ( index == optimalOffer ) return OPTIMAL_COLOR;
	else if ( index == selectedOffer ) return SELECTED_COLOR;
	else return NORMAL_COLOR;
}

/* Function to return the size of the circle corresponding to the offer
 *  at index */
function circleSize(row, index) {
	if ( index == optimalOffer ) return 9;
	else if ( index == selectedOffer ) return 9;
	else return 6;
}
 
/* Function to return the opacity of the circle corresponding to the offer
 *  at index */
function circleOpacity(row, index) {
	if ( index == optimalOffer ) return 1;
	else if ( index == selectedOffer ) return 1;
	else return 1;
}


/**** Begin main program ****/
function updateGraph(quote) {

    currentQuote = quote;
	selectedOffer = undefined;
    if ( !ie8_mode ) updateSelectedOffer();

    $.getJSON( "http://rbisd.com/initial_quote_app/quote/".concat(quote), function( newdata ) {

		offers = new Array();
		for (var o in newdata.offers) {
            offers.push(newdata.offers[o]);
        }

		var xAxis = "total_offer_prem", yAxis = "score";
  
		/* Create some new columns in the data... selected_ and optimal_ will keep track
			*  if that offer are currently selected or optimal (or both). 
			* derived_score is score + premium Change -- only defined here 
			*  to prevent NaN errors while drawing.  See updateCurrentPremium() for real calculation
			*/
		for (var i = 0; i < offers.length; i++) {
			offers[i]["score"] = parseFloat(offers[i]["score"]);
			offers[i]["total_offer_prem"] = parseFloat(offers[i]["total_offer_prem"]);
			offers[i]["selected_offer"] = false;
			offers[i]["optimal_offer"] = false;
			offers[i]["derived_score"] = offers[i]["score"];
		}
		
		var xbounds = {
			"min" : 0.95*my_min( offers, function(d) { return d["total_offer_prem"]; }),
			"max" : 1.05*my_max( offers, function(d) { return d["total_offer_prem"]; })
		};
			
		var ybounds = {
			"min" : my_min( offers, function(d) { return d["score"]; }) ,
			"max" : my_max( offers, function(d) { return d["score"]; })
		};

		/* Find the offer with the highest and lowest score to adjust the y-range */
		var offer_min_score = my_filter( offers, function(d) { return d["score"] == ybounds.min; } )[0];
		var offer_max_score = my_filter( offers, function(d) { return d["score"] == ybounds.max; } )[0];

		/* For the sake of figuring out the maximum range of the model score, we temporarily turn premium change effect on */
			document.getElementById('yes_button').checked = true;
			document.getElementById('no_button').checked = false;

				var ymin = Math.min(modelScore( offer_min_score, xbounds.min), modelScore( offer_min_score, xbounds.max ), ybounds.min );
				var ymax = Math.max(modelScore( offer_max_score, offer_max_score["total_offer_prem"] / 0.85 ), ybounds.max );

				ybounds = { "min": ymin - 0.05, "max": ymax + 0.25};
		
			document.getElementById('yes_button').checked = false;
			document.getElementById('no_button').checked = true;
		/* --end premium change temporary */
		
		// Get dimensions of the chart div
        function ie8_sucks() {
		//var width = d3.select('#chart').style('width').slice(0, -2);
		//var height = (window.innerHeight - 40) * 0.7;

        var width = $('#chart_div').width();
        var height = $('#offer_table').height() + 100;
		
		// SVG AND D3 STUFF
		/* Remove prior chart */
		d3.select("#chart").select("svg").remove();

		var svg = d3.select("#chart")
			.append("svg")
			.style("fill", "white")
			.attr("width", width)
			.attr("height", height);

		/* A "g" inside of an SVD is just a grouping of elements 
		 *  Any translations or transformations are applied automatically to all children of G
		 */
		var chart = svg.append('g')
			.classed('chart', true);

		chart.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", width)
			.attr("height", height);

		/* A scale just creates a 1:1 function used for translating a real value to a pixel location on the screen.  */
		xScale = d3.scale.linear().domain([ xbounds.min, xbounds.max ]).range([60, width - 10]);
		/* On the computer screen, the lower number is towards the top of the screen which is why the range is reversed */
		yScale = d3.scale.linear().domain([ ybounds.min, ybounds.max ]).range([height - 60, 0]);

		/* The previous two statements are essentially saying "the plot area is the rectangle (20,20) - (width-20, height-20)"
		 *  Thus, we will try to draw our axises (axii?) in that gutter of 20 pixels */

		/* The d3 default is to draw the x-axis on top, so the transform/translate is just moving it to the bottom of the graph */
		/* The id: xAxis stuff is relevant--see svg.css! */
		chart.append("g")
			//.attr('transform', 'translate(0, '.concat(height - 40).concat(')'))
			.attr('transform', 'translate(0, '.concat(height-50).concat(')'))
					.attr('id', 'xAxis')
					.call( function makeXAxis(s) { s.call(d3.svg.axis().scale(xScale).orient("bottom")); } );

					chart.append("g")
					.attr('id', 'yAxis')
					.attr('transform', 'translate(50, 0)')
					//.attr('transform', 'translate('.concat(width-559).concat(')'), 0)
			.call( function makeYAxis(s) { s.call(d3.svg.axis().scale(yScale).orient("left").ticks(0)); } );

		/* Create the chart labels */
		chart.append("text")
			.attr("class", "x label")
			.attr("text-anchor", "middle")
			.attr("x", width/2 + 20)
			.attr("y", height - 5)
			.attr("style","font-size:17px;")
			.text("Offered premium ($)");

		/* This took me about an hour to get right. */
		chart.append("text")
			.attr("class", "y label")
			.attr("text-anchor", "middle")
			.attr("x", 15)
			.attr("y", height/2+20)
			.attr("style","font-size:17px;")
			.attr('transform', 'rotate(-90,12,'.concat(height/2).concat(')'))
			.text('Customer value');

		/* Create the circles -- we're just creating elements for them right now, nothing else */
		d3.select('svg g.chart')
			.selectAll("circle")
			.data(offers)
			.enter()
			.append("circle")
			.attr("r", width * 0.008)
        }
        if ( ! ie8_mode ) ie8_sucks();

		// 	set up slider 
		var temp = (xbounds.min + xbounds.max) / 2;
		$('#slider').slider(
				{ orientation: "horizontal",
					min: xbounds.min - 10,
					max: xbounds.max + 10,
					value: temp,
					change: function(arg1, arg2) {
						updateCurrentPremium(arg2.value);
					}
				}
		);

		updateCurrentPremium( temp );

		// Render points
		if ( ! ie8_mode ) updateChart();
		togglePremChange();

		function updateChart() {
			d3.selectAll('circle')
				.attr('cx', function(d) { return xScale(d["total_offer_prem"]); })
				.attr('cy', function(d) { return yScale(d["derived_score"]); })
				.attr('fill', circleColor)
				.attr('r', circleSize)
				.style('opacity',circleOpacity)
				.style('cursor', 'pointer')	
				.on('click', function(d, i) {
					// Turn off old selected_offer
					d3.select('svg g.chart').selectAll('.selected_offer').attr('fill', NORMAL_COLOR).attr('class', '').attr('r', circleSize).style('opacity',circleOpacity);
					if ( selectedOffer === undefined ) ;
					else offers[selectedOffer]["seleted_offer"] = false;

					// If the selectedOfer is the optimalOffer, just clear the selection
					if ( i == optimalOffer ) {
						selectedOffer = undefined;
						updateSelectedOffer();
					} else {
						// Turn on new color
						selectedOffer = i;
						d3.select(this).attr('fill', SELECTED_COLOR);
						d3.select(this).attr('class', "selected_offer");
						d3.select(this).attr('r',9);
						d3.select(this).style('opacity',1);
						updateSelectedOffer();
					}
				});
		}
	});
}

