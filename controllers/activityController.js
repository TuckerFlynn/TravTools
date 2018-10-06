var fs = require('fs')
var readline = require('readline');
var async = require('async');
var sqlite3 = require('sqlite3').verbose()

function getDateString (choice) {
    var today = new Date();
    // Generate the dateString of a database 1 day or 1 week ago
    if (choice == "week" || choice == "previous") {
        var year = today.getFullYear();
        var month = today.getMonth();
        var day = today.getDate();
        var daysInPrevMonth = 0;
        var history = 0;

        //need to count back 7 days to generate file name
        //if it's near the beginning of the month you need to know how many days the previous month had
        if (month == 0 || month == 1 || month == 3 || month == 5 || month == 8 || month == 10) {
            daysInPrevMonth = 31;
        } else if (month == 2) {
            daysInPrevMonth = 28;   //february
        } else {
            daysInPrevMonth = 30;
        }
        if (choice == "week") {
            history = 7;
        } else if (choice == "previous") {
            history = 1
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
    // Generate the dateString for the current date
    } else if (choice == 'today') {
        var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();
        var path = './database/db/' + dateString + '.db';

        return dateString;
    }
}

exports.population_activity_get = function(req, res) 
    {
    var sqlOutput = [], regions = [];

    var dateString = getDateString('today');
    var prevDateString = getDateString('previous');
    var weekDateString = getDateString('week');

    async.series([
    // Populate array of region names to loop through
    function (callback) {
        var db = new sqlite3.Database('./database/db/regionHistory.db');

        db.serialize(function () {
            var sql = "ATTACH DATABASE './database/db/regionHistory.db' AS History";
            db.run(sql);

            sql = "SELECT name FROM History.sqlite_master WHERE type='table'";
            db.each(sql, function (err, row) {
                if (err) {
                    console.log(err);
                } else {
                    regions.push(row.name);  
                }
            });      

            db.close(function (err, call) {
                if (err) {
                    console.log('Error closing db: ' + err);
                }
                console.log('Finished updating region list.');
                callback(null, 'one');
            });
        });
    },
    // Get total region population of each region
    function (callback) {
        var db2 = new sqlite3.Database('');

        db2.serialize(function () {
            var sql = "ATTACH DATABASE './database/db/regionHistory.db' AS History";
            db2.run(sql);

            sql = "CREATE TABLE temp(Region TEXT UNIQUE, Week INTEGER, Previous INTEGER, Current INTEGER, Leader TEXT, PrevLeader TEXT)";
            db2.run(sql);

            // Add region names and population sums to temp table
            for (var i = 0; i <regions.length; i++) {
                sql = "INSERT OR IGNORE INTO temp(Region) VALUES ('" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" INSERT ERROR: " + err);
                    }
                });

                sql = "UPDATE temp SET Current = (SELECT SUM(History." + regions[i] + "." + dateString + ") FROM History." + regions[i] + " ORDER BY History." + regions[i] + "." + dateString + " DESC LIMIT 5) WHERE (temp.Region = '" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" UPDATE 1 ERROR: " + err);
                    }
                });

                sql = "UPDATE temp SET Previous = (SELECT SUM(History." + regions[i] + "." + prevDateString + ") FROM History." + regions[i] + " ORDER BY History." + regions[i] + "." + prevDateString + " DESC LIMIT 5) WHERE (temp.Region = '" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" UPDATE 2 ERROR: " + err);
                    }
                }); 

                sql = "UPDATE temp SET Week = (SELECT SUM(History." + regions[i] + "." + weekDateString + ") FROM History." + regions[i] + " ORDER BY History." + regions[i] + "." + weekDateString + " DESC LIMIT 5) WHERE (temp.Region = '" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" UPDATE 3 ERROR: " + err);
                    }
                });

                sql = "UPDATE temp SET Leader = (SELECT History." + regions[i] + ".Alliance FROM History." + regions[i] + " ORDER BY History." + regions[i] + "." + dateString + " DESC LIMIT 1) WHERE (temp.Region = '" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" UPDATE 4 ERROR: " + err);
                    }
                });

                sql = "UPDATE temp SET PrevLeader = (SELECT History." + regions[i] + ".Alliance FROM History." + regions[i] + " ORDER BY History." + regions[i] + "." + weekDateString + " DESC LIMIT 1) WHERE (temp.Region = '" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" UPDATE 5 ERROR: " + err);
                    }
                });
            }

            sql = "SELECT * FROM temp WHERE Current IS NOT NULL ORDER BY Current DESC";
            db2.each(sql, function (err, row) {
                if (err) {
                    console.log(err);
                } else {
                    //console.log(row);
                    var line = row.Region;

                    if (line != null) {
                        if (line[0] == ' ') {
                            line = line.substring(1, line.length)
                        }
                        row.Region = line.replace(/_/g," ");
                    }
                    // console.log('Adding region to list: ' + line);
                    sqlOutput.push(row);
                }
            });

            db2.close(function (err, call) {
                if (err) {
                    console.log('Error closing db: ' + err);
                }
                console.log('Finished updating region populations');
                callback(null, 'two');
            });

        })
    }
    ],
    function(err, results) {
        if (!err) {
            // results is now equal to ['one, 'two']
            console.log('All functions have run succesfully');

            res.render('regions_activity', { title: 'Region Activity', data: sqlOutput});
        }
    });
}