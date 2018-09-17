

document.addEventListener('DOMContentLoaded', () => {
	var aTable  = document.getElementById('aTable');
    var all     = document.getElementById('all');
	var add     = document.getElementById('add');
	var remove  = document.getElementById('remove');
	var aDefault = document.getElementById('aDefault');
    var aSelect = document.getElementById('alliance');

	all.onclick = function () {
		event.preventDefault();

        var path = window.location.pathname + '/extend';
        var xhttp = new XMLHttpRequest();
        //send request to open file
        xhttp.open('GET', path);
        xhttp.onreadystatechange = function() {
            //checks if the file is available and loaded
            if (xhttp.readyState == 4) {  // document is ready to parse.
                if (xhttp.status == 200) {  // file is found
					var res = JSON.parse(xhttp.response);

					// Create select options               
					var text = "<option value=0>-</option>";
					for (var i = 0; i < res.length; i++) {
                        text += "<option value=" + res[i].aID + ">" + res[i].Alliance + "</option>";
				    }

                    var rowCount = aTable.rows.length;
                    aTable.rows[rowCount-2].cells[1].childNodes[0].innerHTML = text;
                }
            }
        };
        xhttp.send();
    }

	remove.onclick = function () {
		event.preventDefault();

		var rowCount = aTable.rows.length;
        if (rowCount > 2) {
			aTable.deleteRow(rowCount - 2);
		} else {
            console.log('No rows left to delete');
		}
    }

	add.onclick = function () {
		event.preventDefault();

		var rowCount = aTable.rows.length;
		var row = aTable.insertRow(rowCount - 1);

		var cell0 = row.insertCell(0);
		var cell1 = row.insertCell(1);

        var name = "alliance" + rowCount;

		cell0.innerHTML = "<label for=" + name + ">Alliance:</label>";

        var select = aDefault.innerHTML;
        cell1.innerHTML = select;

        if (cell1.childNodes.length > 0) {
		    cell1.childNodes[0].id = name;
		} else {
            console.log('Error assigning form IDs');
		}
    }
});