var regionHistory = function () {
	var canvas = document.getElementById("line-chart");
    var dataset = [], points = [];

    var path = window.location.pathname + '/graph';
    var xhttp = new XMLHttpRequest();
    //send request to open file
    xhttp.open('GET', path);
    xhttp.onreadystatechange = function() {
        //checks if the file is available and loaded
        if (xhttp.readyState == 4) {  // document is ready to parse.
            if (xhttp.status == 200) {  // file is found
				var res = JSON.parse(xhttp.response);

				for (var i = 0; i < res.length; i++) {
					var pop = [];
                    for (var propt in res[i]) {
						if (res[i].hasOwnProperty(propt)) {
						    if (propt !== 'aID' && propt !== 'Alliance') {
    							pop.push(res[i][propt]);
    						}
                        }
					}

                    var set = {
						data: pop,
						label: res[i].Alliance,
						borderColor: rainbow(res.length, i),
						borderWidth: 2,
                        backgroundColor: rainbow(res.length, i),
                        pointRadius: 0,
						fill: false,
                        spanGaps: false
					}
					dataset.push(set);
				}
                for (var p = 0; p < dataset[0].data.length; p++) {
                    points.push(p)
                }
                drawGraph(canvas, points, dataset);
			}
		}
	};
	xhttp.send();
}

var drawGraph = function (canvas, points, results) {

	new Chart(canvas, {
		type: 'line',
		data: {
			labels: points,
            datasets: results
		},
        options: {
            title: {
				display: true,
                fontSize: 16,
                text: 'Region Population'
			},
			tooltips: {
                enabled: false
		    }
        }
    });     
}

function rainbow(numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}

document.addEventListener('DOMContentLoaded', () => {
	var getDetails = document.getElementById('getDetails');
	var detailsDiv = document.getElementById('details');
    var output = document.getElementById('output');

    regionHistory();

	getDetails.onclick = function() {
        var path = window.location.pathname + '/detail';
        var xhttp = new XMLHttpRequest();
        //send request to open file
        xhttp.open('GET', path);
        xhttp.onreadystatechange = function() {
            //checks if the file is available and loaded
            if (xhttp.readyState == 4) {  // document is ready to parse.
                if (xhttp.status == 200) {  // file is found
					var res = JSON.parse(xhttp.response);

					var text = "<table class='table table-striped table-bordered>";
					text += "<thead class='thead-dark><tr><th>Alliance</th><th>Player</th><th>Coords</th><th>Village</th><th>Population</th></tr></thead>";
					text += "<tbody>";
					for (var i = 0; i < res.length; i++) {
						text += "<tr>";
						text += "<td>" + res[i].Alliance + "</td>";
						text += "<td>" + res[i].Player + "</td>";
						text += "<td>(" + res[i].X + "|" + res[i].Y + ")</td>";
                        text += "<td>" + res[i].Village + "</td>";
                        text += "<td>" + res[i].Population + "</td></tr>";
					}
					text += "</tbody></table>";

                    detailsDiv.innerHTML = text;

                    output.innerHTML += res.length + ' villages total.';
                }
            }
        };
        xhttp.send();
	};
});