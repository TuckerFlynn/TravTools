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

exports.inactive_get = function (req, res) {
    res.render('inactive', { title: 'Inactive Finder' });
}

exports.inactive_post = function (req, res) {   
	var body = req.body;
    console.log(body);

	var sqlOutput = [];

	var dateString = getDateString(0);
	var prevDateString = getDateString(body.days);

	// console.log(body);

	var db = new sqlite3.Database('');

	db.serialize(function () {
		// Attach two databases needed for comparing population
		var sql = "ATTACH DATABASE './database/db/" + dateString + ".db' AS Current";
		db.run(sql);
		sql = "ATTACH DATABASE './database/db/" + prevDateString + ".db' AS Previous";
        db.run(sql);

        // Create table of total player pop (current)
		sql = "CREATE TABLE CurrentSum(uID INTEGER, Current INTEGER)";
		db.run(sql);      
		sql = "INSERT INTO CurrentSum SELECT uID, SUM(Population) FROM Current." + dateString + " GROUP BY uID";
		db.run(sql);
		sql = "DELETE FROM CurrentSum WHERE uID=1 OR uID=2 OR uID=4 OR uID=5 OR uID=6";
        db.run(sql);
        
        // Create table of total player pop (previous)
        sql = "CREATE TABLE PrevSum(uID INTEGER, Previous INTEGER)";
        db.run(sql);      
        sql = "INSERT INTO PrevSum SELECT uID, SUM(Population) FROM Previous." + prevDateString + " GROUP BY uID";
		db.run(sql);
        sql = "DELETE FROM PrevSum WHERE uID=1 OR uID=2 OR uID=4 OR uID=5 OR uID=6";
        db.run(sql);

		sql = "CREATE TABLE Change(uID INTEGER, Change INTEGER)";
		db.run(sql);
		sql = "INSERT INTO Change SELECT CurrentSum.Current - PrevSum.Previous AS Change, CurrentSum.uID FROM (CurrentSum INNER JOIN PrevSum ON CurrentSum.uID = PrevSum.uID) WHERE (CurrentSum.Current - PrevSum.Previous > " + body.popChange + ")";
        db.run(sql);
        sql = "DELETE FROM Change WHERE uID=1 OR uID=2 OR uID=4 OR uID=5 OR uID=6";
        db.run(sql);

        sql = "SELECT * FROM CurrentSum ORDER BY uID LIMIT 10";
        db.each(sql, function (err, row) {
            if (err) {
                console.log(err);
            } else {
                console.log(row)
            }
        });

        sql = "SELECT * FROM PrevSum ORDER BY uID LIMIT 10";
        db.each(sql, function (err, row) {
            if (err) {
                console.log(err);
            } else {
                console.log(row)
            }
		});

        sql = "SELECT * FROM Change ORDER BY uID LIMIT 10";
        db.each(sql, function (err, row) {
            if (err) {
                console.log(err);
            } else {
                console.log(row)
            }
        });
    });

    res.render('inactive', { title: 'Inactive Finder', output: sqlOutput });
}