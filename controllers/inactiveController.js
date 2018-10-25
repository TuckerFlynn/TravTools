var fs = require('fs')
var readline = require('readline');
var async = require('async');
var sqlite3 = require('sqlite3').verbose();

var bodyParser = require('body-parser')
bodyParser.urlencoded({ extended: false });

function getDateString (history) {
    var today = new Date();
    // Generate the dateString of a date based on value of history
    var year = today.getFullYear();
    var month = today.getMonth();
    var day = today.getDate();
    var daysInPrevMonth = 0;

    //need to count back 7 days to generate file name
    //if it's near the beginning of the month you need to know how many days the previous month had
    if (month == 0 || month == 1 || month == 3 || month == 5 || month == 8 || month == 10) {
        daysInPrevMonth = 31;
    } else if (month == 2) {
        daysInPrevMonth = 28;   //february
    } else {
        daysInPrevMonth = 30;
    }
    if (day <= history) {
        month = month - 1;
        day = daysInPrevMonth - (history - day);
    } else {
        day = day - history;
    }
    if (month == -1) {
        month = 11;
        year = year - 1;
    }
    var dateString = "m" + year + "_" + month + "_" + day;
	return dateString;
}

//get true distance between two points
function findDist (x1, x2, y1, y2) {
    //get absolute x and y distances, use them to find travel distance
    var xDist = Math.abs(x1 - x2);
    var yDist = Math.abs(y1 - y2);
    //exact distance
    var distance = Math.hypot(xDist, yDist);
    // distance rounded to one decimal
	var distRound = parseFloat( distance.toFixed(1) );
    return distRound;
}

exports.inactive_get = function (req, res) {
    res.render('inactive', { title: 'Inactive Finder' });
}

exports.adv_inactive_get = function (req, res) {
    res.render('adv_inactive', { title: 'Inactive Finder'});
}

exports.inactive_post = function (req, res) {   
	var body = req.body;
    var dateString = getDateString(0);
    var prevDateString = getDateString(body.days);

	console.log(body);
	console.log(dateString);
    console.log(prevDateString);

	var sqlOutput = [];   

	var db = new sqlite3.Database('');

	db.serialize(function () {
		// Attach two databases needed for comparing population
		var sql = "ATTACH DATABASE './database/db/" + dateString + ".db' AS Current";
		db.run(sql);
		sql = "ATTACH DATABASE './database/db/" + prevDateString + ".db' AS Previous";
		db.run(sql);

		sql = `SELECT * FROM Current.${dateString} WHERE aID = 2`;
        db.each(sql, function(err, row) { 
         if (err) 
         console.log(err) 
         else 
         console.log(row) 
        });      

		// Create Inactives table that has uID, Current total pop, Previous total pop, 
		// and then removes players with change larger than posted request
		sql = `CREATE TABLE Inactives AS SELECT
		    Current.${dateString}.uID AS uID,
		    SUM(Current.${dateString}.Population) AS CurrentSum
            FROM Current.${dateString}
			GROUP BY Current.${dateString}.uID
			`;
		db.run(sql);

		sql = `ALTER TABLE Inactives ADD COLUMN PrevSum INTEGER`;
		db.run(sql);

		sql = `UPDATE Inactives SET PrevSum = (
    		SELECT SUM(Previous.${prevDateString}.Population) 
    		FROM Previous.${prevDateString}
		    WHERE(Previous.${prevDateString}.uID = Inactives.uID)
			)`;
        db.run(sql);

		sql = `DELETE FROM Inactives
    		WHERE CurrentSum - PrevSum > ${body.popChange}
    		`;
		db.run(sql);

		// sql = `SELECT * FROM Inactives`;
		// db.each(sql, function(err, row) { 
		// 	if (err) 
		// 	console.log(err) 
		// 	else 
		// 	console.log(row) 
		// });

		// Create Villages table contianing all villages within search radius, 
		// then remove players not in the Inactives table
		sql = `CREATE TABLE Villages AS SELECT 
		    Current.${dateString}.uID AS uID, 
		    Current.${dateString}.Player AS Player, 
			Current.${dateString}.Alliance AS Alliance,
            Current.${dateString}.Village AS Village,
			Current.${dateString}.X AS X,
            Current.${dateString}.Y AS Y,
			Current.${dateString}.Population AS Current,
			Current.${dateString}.Population - Previous.${prevDateString}.Population AS Change 
			FROM Current.${dateString} INNER JOIN Previous.${prevDateString}
			ON Current.${dateString}.vID = Previous.${prevDateString}.vID
			WHERE ABS(Current.${dateString}.X - ${body.xStart}) < ${body.radius} 
			AND ABS(Current.${dateString}.Y - ${body.yStart} < ${body.radius})
			`;
		db.run(sql);

		sql = `DELETE FROM Villages 
    		WHERE uID=1 OR uID=2 OR uID=4 OR uID=5 OR uID=6
    		`;
        db.run(sql);

		// sql = "SELECT * FROM Villages LIMIT 30";
        // db.each(sql, function (err, row) {
        //     if (err) {
        //         console.log(err);
        //     } else {            
        //         console.log(row);
        //     }
        // });


		sql = `DELETE FROM Villages
    		WHERE NOT EXISTS ( SELECT uID FROM Inactives WHERE uID = Villages.uID )
			`;
		db.run(sql);

		// sql = 'SELECT changes()';
        // db.all(sql, function (err, rows) {
        //     if (err) {
        //         console.log(err);
        //     } else {
        //         console.log(rows);
        //     }
        // });

		// sql = `ALTER TABLE Villages ADD COLUMN Distance INTEGER`;
		// db.run(sql);
		// sql = `ALTER TABLE Villages ADD COLUMN Url TEXT`;
        // db.run(sql);

		sql = "SELECT * FROM Villages";
        db.each(sql, function (err, row) {
            if (err) {
                console.log(err);
			} else {
				row.Distance = findDist(body.xStart, row.X, body.yStart, row.Y);
                // Map link format: https://ts19.english.travian.com/position_details.php?x=-38&y=-3
				row.Url = 'https://ts19.english.travian.com/position_details.php?x=' + row.X + '&y=' + row.Y;

				// console.log(row);
                sqlOutput.push(row);
            }
		});

        db.close(function (err) {
			if (!err) {
				sqlOutput.sort(function(a,b) {
                    return a.Distance-b.Distance;
				});
                res.render('inactive', { title: 'Inactive Finder', output: sqlOutput });
            }
        });
    });
}

exports.adv_inactive_post = function (req, res) {   
    var body = req.body;
    var dateString = getDateString(0);
    var prevDateString = getDateString(body.days);

    var sqlOutput = [];

    // console.log(body);
    // console.log(dateString);
    // console.log(prevDateString);

    // Split the input text into an arry by newlines, replacing tabs with spaces
	var rallyInput = body.rallypoint.replace(/\t/g, ' ').split('\r\n');

	for (i=0; i<rallyInput.length; i++) {
        if (!rallyInput[i].includes('Own attacking troops')) {
			rallyInput.splice(i, 1);
            i = 0;
	    }
	}

    rallyInput.splice(0,1);

	for (i=0; i<rallyInput.length; i++) {
		rallyInput[i] = rallyInput[i].replace(' Own attacking troops ', '');

		var tempArray = rallyInput[i].split(' ');
        rallyInput[i] = tempArray[0];
    }

    // console.log(rallyInput); 

    var db = new sqlite3.Database('');

    db.serialize(function () {
        // Attach two databases needed for comparing population
        var sql = "ATTACH DATABASE './database/db/" + dateString + ".db' AS Current";
        db.run(sql);
        sql = "ATTACH DATABASE './database/db/" + prevDateString + ".db' AS Previous";
        db.run(sql);

        sql = `SELECT * FROM Current.${dateString} WHERE aID = 2`;
        db.each(sql, function(err, row) { 
         if (err) 
         console.log(err) 
         else 
         console.log(row) 
        });      

        // Create Inactives table that has uID, Current total pop, Previous total pop, 
        // and then removes players with change larger than posted request
        sql = `CREATE TABLE Inactives AS SELECT
            Current.${dateString}.uID AS uID,
            SUM(Current.${dateString}.Population) AS CurrentSum
            FROM Current.${dateString}
            GROUP BY Current.${dateString}.uID
            `;
        db.run(sql);

        sql = `ALTER TABLE Inactives ADD COLUMN PrevSum INTEGER`;
        db.run(sql);

        sql = `UPDATE Inactives SET PrevSum = (
            SELECT SUM(Previous.${prevDateString}.Population) 
            FROM Previous.${prevDateString}
            WHERE(Previous.${prevDateString}.uID = Inactives.uID)
            )`;
        db.run(sql);

        sql = `DELETE FROM Inactives
            WHERE CurrentSum - PrevSum > ${body.popChange}
            `;
        db.run(sql);

        // sql = `SELECT * FROM Inactives`;
        // db.each(sql, function(err, row) { 
        //  if (err) 
        //  console.log(err) 
        //  else 
        //  console.log(row) 
        // });

        // Create Villages table contianing all villages within search radius, 
        // then remove players not in the Inactives table
        sql = `CREATE TABLE Villages AS SELECT 
            Current.${dateString}.uID AS uID, 
            Current.${dateString}.Player AS Player, 
            Current.${dateString}.Alliance AS Alliance,
            Current.${dateString}.Village AS Village,
            Current.${dateString}.X AS X,
            Current.${dateString}.Y AS Y,
            Current.${dateString}.Population AS Current,
            Current.${dateString}.Population - Previous.${prevDateString}.Population AS Change 
            FROM Current.${dateString} INNER JOIN Previous.${prevDateString}
            ON Current.${dateString}.vID = Previous.${prevDateString}.vID
            WHERE ABS(Current.${dateString}.X - ${body.xStart}) < ${body.radius} 
            AND ABS(Current.${dateString}.Y - ${body.yStart} < ${body.radius})
            `;
        db.run(sql);

        sql = `DELETE FROM Villages 
            WHERE uID=1 OR uID=2 OR uID=4 OR uID=5 OR uID=6
            `;
        db.run(sql);

        // sql = "SELECT * FROM Villages LIMIT 30";
        // db.each(sql, function (err, row) {
        //     if (err) {
        //         console.log(err);
        //     } else {            
        //         console.log(row);
        //     }
        // });


        sql = `DELETE FROM Villages
            WHERE NOT EXISTS ( SELECT uID FROM Inactives WHERE uID = Villages.uID )
            `;
        db.run(sql);

        // sql = 'SELECT changes()';
        // db.all(sql, function (err, rows) {
        //     if (err) {
        //         console.log(err);
        //     } else {
        //         console.log(rows);
        //     }
        // });

        // sql = `ALTER TABLE Villages ADD COLUMN Distance INTEGER`;
        // db.run(sql);
        // sql = `ALTER TABLE Villages ADD COLUMN Url TEXT`;
        // db.run(sql);

        sql = "SELECT * FROM Villages";
        db.each(sql, function (err, row) {
            if (err) {
                console.log(err);
            } else {
                row.Distance = findDist(body.xStart, row.X, body.yStart, row.Y);
                // Map link format: https://ts19.english.travian.com/position_details.php?x=-38&y=-3
                row.Url = 'https://ts19.english.travian.com/position_details.php?x=' + row.X + '&y=' + row.Y;

                // console.log(row);
                sqlOutput.push(row);
            }
        });

        db.close(function (err) {
            if (!err) {
                sqlOutput.sort(function(a,b) {
                    return a.Distance-b.Distance;
                });
                res.render('adv_inactive', { title: 'Inactive Finder', output: sqlOutput, currentFarm: rallyInput });
            }
        });
    });
}