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
	} else {
		var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();
        return dateString;
	}
}

exports.regions_overview_get = function (req, res) 
	{
	var today = new Date();
	var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();
    var path = './database/db/' + dateString + '.db';

    // Open the regions database to get the list of region names to display
    var sqlOutput = [];

    var db = new sqlite3.Database('./database/db/regions.db');

    db.serialize(function () {
        var sql = "SELECT DISTINCT Region FROM RegionsSQL ORDER BY Region ASC";
        db.each(sql, function (err, row) {
            if (err) {
                console.log(err);
            } else {
                // console.log(row.Region);
                sqlOutput.push(row);
            }
        });

    });

    db.close(function (err) {
        if (!err) {
            res.render('regions', { title: 'Region List', data: sqlOutput });
        }
    });
}

exports.region_id_get = function (req, res, next) 
	{
    var today = new Date();
    var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();
	var path = './database/db/' + dateString + '.db';

	var regionName = req.params.id;
	if (regionName[0] == ' ') {
        regionName = regionName.substring(1, regionName.length)
    }

    console.log("Fetching data for region: " + regionName);

    fs.access(path, (err) => {
        if (!err) {
            // If it exists:
            console.log('Current db found.');
            var sqlOutput = [], sqlOutput2 = [];

            var db = new sqlite3.Database('./database/db/' + dateString + '.db');
    
            db.serialize(function () {
                // Remove natars, etc.
                sql = "DELETE FROM " + dateString + " WHERE uID=1 OR uID=2 OR uID=4 OR uID=5 OR uID=6 OR aID=0";
                db.run(sql);
                // Connect to regions database
                sql = "ATTACH DATABASE './database/db/regions.db' AS Regions";
				db.run(sql);

                sql = "SELECT Region, Alliance, SUM(Population) AS Population, COUNT(vID) AS Villages FROM " + dateString + " WHERE Region LIKE '%" + regionName + "%' GROUP BY Alliance ORDER BY SUM(Population) DESC";
                db.each(sql, function (err, row) {
                    if (err) {
                        console.log(err);
                    } else {
                        sqlOutput.push(row);
                    }
                });

                // Get the detailed player info for the region, but do not display by default
                sql = "SELECT Alliance, Player, X, Y, Population FROM " + dateString + " WHERE Region LIKE '%" + regionName + "%' ORDER BY Alliance ASC, Population DESC";
                db.each(sql, function (err, row) {
                    if (err) {
                        console.log(err);
                    } else {
                        //console.log(row.Alliance, row.Player, row.Population);
                        sqlOutput2.push(row);
                    }
                });

                db.close(function (err) {
					if (!err) {
						var sum = 0;
                        var five = (sqlOutput.length > 5) ? 5 : sqlOutput.length;
                        for (var i = 0; i < five; i++)
                            sum += sqlOutput[i].Population
                        res.render('region_detail', { title: req.params.id, data: sqlOutput, total: sum, data2: sqlOutput2});
                    }
                });
            });
        } else {
            console.log('Current db not found at: ' + path);
            res.render('region_detail', { title: req.params.id, data: null, total: 0, data2: null});
		}
    });
}

exports.regions_detail_get = function (req, res) 
	{
    var today = new Date();
    var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();
	var path = './database/db/' + dateString + '.db';

    var regionName = req.params.id;

    fs.access(path, (err) => {
        if (!err) {
            // If it exists:
            console.log('Current db found.');
            var sqlOutput = [];

            var db = new sqlite3.Database('./database/db/' + dateString + '.db');
    
            db.serialize(function () {
                // Remove natars, etc.
                sql = "DELETE FROM " + dateString + " WHERE uID=1 OR uID=2 OR uID=4 OR uID=5 OR uID=6 OR aID=0";
                db.run(sql);
                // Connect to regions database
                sql = "ATTACH DATABASE './database/db/regions.db' AS Regions";
                db.run(sql);
                // Get the detailed player info for the region, but do not display by default
                sql = "SELECT Alliance, uID, Player, X, Y, Village, Population FROM (" + dateString + " LEFT JOIN Regions.regionsSQL ON " + dateString + ".ID = Regions.regionsSQL.ID) WHERE Regions.regionsSQL.Region LIKE '%" + regionName + "%' ORDER BY Alliance ASC, Player ASC, Population DESC";
                db.each(sql, function (err, row) {
                    if (err) {
                        console.log(err);
                    } else {
                        //console.log(row.Alliance, row.Player, row.Population);
                        sqlOutput.push(row);
                    }
                });

                db.close(function (err) {
                    if (!err) {
                        res.send(sqlOutput);
                    }
                });
            });
		} else {
            res.send('Something went wrong here.')
	    }
    });
};

exports.regions_graph_get = function (req, res) 
	{
    var sqlOutput = [];

    var regionName = req.params.id;
    if (regionName[0] == ' ') {
        regionName = regionName.substring(1, regionName.length)
	}
    regionName = regionName.replace(/\s/g,"_");

	// Open region history database
	var db = new sqlite3.Database('./database/db/regionHistory.db');

	db.serialize(function () {
		var sql = 'SELECT * FROM ' + regionName;
        db.all(sql, function (err, rows) {
            if (err) {
                console.log(err);
            } else {
                //console.log(row.Alliance, row.Player, row.Population);
                sqlOutput = rows;
            }
        });
        db.close(function (err) {
            if (!err) {
                res.send(sqlOutput);
            }
        });
    });
}

exports.regions_history_get = function (req, res) 
	{
    var today = new Date();
    var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();
    var path = './database/db/' + dateString + '.db';

	var sqlOutput = [];

    fs.access(path, (err) => {
        if (!err) {
        	var db = new sqlite3.Database(path);

        	db.serialize(function () {
        		var sql = 'SELECT DISTINCT aID, Alliance FROM ' + dateString + ' ORDER BY Alliance ASC';
                db.all(sql, function (err, rows) {
                    if (err) {
                        console.log(err);
                    } else {
                        sqlOutput = rows;
                    }
                });
                db.close(function (err) {
                    if (!err) {
                        res.render('regions_history', { title: 'Region History', alliances: sqlOutput});
                    }
                });
            });
		} else {
            res.render('regions_history', { title: 'Region History', alliances: sqlOutput });      
	    }
    });
}

exports.regions_history_extend = function (req, res) 
	{
    var sqlOutput = [], regions = [];

    async.series([
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
                        //console.log(row);
        				regions.push(row.name)   
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
		function(callback) {
            var db2 = new sqlite3.Database('');

            db2.serialize(function () {
                var sql = "ATTACH DATABASE './database/db/regionHistory.db' AS History";
                db2.run(sql);

                sql = "CREATE TABLE temp(aID INTEGER, Alliance TEXT UNIQUE)";
                db2.run(sql);

        		for (var i = 0; i < regions.length; i++) {
        			sql = "INSERT OR IGNORE INTO temp(aID, Alliance) SELECT aID, Alliance FROM History." + regions[i];
                    db2.run(sql, function (err) {
                        if (err) {
                            console.log(err);
                        }
                    });
        		}

        		sql = "SELECT * FROM temp ORDER BY Alliance ASC";
                db2.all(sql, function (err, rows) {
                    if (err) {
                        console.log(err);
        			} else {
                        sqlOutput = rows;
                    }
                });

                db2.close(function (err, call) {
                    if (err) {
                        console.log('Error closing db: ' + err);
                    }
                    console.log('Finished updating alliance list');
                    callback(null, 'two');
                });
			});
        }
    ],
    function(err, results) {
        if (!err) {
            // results is now equal to ['one, 'two']
			console.log('All functions have run succesfully');
            res.send(sqlOutput);
        }
    });
}

exports.regions_activity_get = function(req, res) 
	{
	var sqlOutput = [], regions = [];

	var dateString = getDateString();
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

			sql = "CREATE TABLE temp(Region TEXT UNIQUE, Week INTEGER, Yesterday INTEGER, Current INTEGER, Leader TEXT, PrevLeader TEXT)";
            db2.run(sql);

            // Add region names and population sums to temp table
			for (var i = 0; i <regions.length; i++) {
                sql = "INSERT OR IGNORE INTO temp(Region) VALUES ('" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" INSERT ERROR: " + err);
                    }
				});

				sql = "UPDATE temp SET Current = (SELECT SUM(History." + regions[i] + "." + dateString + ") FROM History." + regions[i] + ") WHERE (temp.Region = '" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" UPDATE 1 ERROR: " + err);
                    }
				});

                sql = "UPDATE temp SET Previous = (SELECT SUM(History." + regions[i] + "." + prevDateString + ") FROM History." + regions[i] + ") WHERE (temp.Region = '" + regions[i] + "')";
                db2.run(sql, function (err) {
                    if (err) {
                        console.log(" UPDATE 2 ERROR: " + err);
                    }
				}); 

                sql = "UPDATE temp SET Week = (SELECT SUM(History." + regions[i] + "." + weekDateString + ") FROM History." + regions[i] + ") WHERE (temp.Region = '" + regions[i] + "')";
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

                sql = "UPDATE temp SET Leader = (SELECT History." + regions[i] + ".Alliance FROM History." + regions[i] + " ORDER BY History." + regions[i] + "." + weekDateString + " DESC LIMIT 1) WHERE (temp.Region = '" + regions[i] + "')";
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