document.addEventListener('DOMContentLoaded', () => {

	var getSQL = document.getElementById('getSQL');
    var output = document.getElementById('output');

	getSQL.onclick = function () {
		event.preventDefault();

        output.innerHTML += 'Button clicked.<br>';

        var req = new XMLHttpRequest();
        var path = "https://ts19.travian.us/map.sql";
        var fileLoaded = false;
        //send request to open file
        req.open("GET", path);
        req.onreadystatechange = function() {
            output.innerHTML += req.readyState + "<br>";
            //checks if the file is available and loaded
            if (req.readyState == 4) {  // document is ready to parse.
                if (req.status == 200) {  // file is found
                    //split the file text by new lines which is the region data seperator
                    var regionData = req.responseText.split("\n")
                    //print how many lines (aka villages) were in the file
                    output.innerHTML += regionData.length + " villages found<br>";
                    fileLoaded = true;
                }
            }
	    };
		req.send();
    };

});