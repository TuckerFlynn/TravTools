// CHANGE THIS URL TO THE SERVER YOU'RE PLAYING
var URL = 'https://ts19.travian.us/map.sql';

var fs = require('fs')
var readline = require('readline');
var scrape = require('website-scraper');
var async = require('async');
var sqlite3 = require('sqlite3').verbose();

/*
    This function will run all the required steps to prepare up-to-date databases:
    1. Check if today's data has already been updated
	2. Scrape map.sql file from travian server and save as locally as .txt 
	3. Open and read file lines
	4. Create and save database of today's map file
    5. Update database with tables of regional control
    
*/

var startHere = function () {
    // Create a unique string based on the current date
    var today = new Date();
    var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();

    // Check if the directory of the current date already exists
    fs.access('./database/mapFiles/' + dateString, (err) => {
        if (!err) {
            // If it exists, end the function
            console.log('\x1b[41m' + dateString + ' directory already exists.\x1b[0m');
            partialUpdate();
        } else {
			// If it doesn't exist, run through the update function
            console.log('\x1b[32m Running master update. \x1b[0m');
            updateAllData();
        }
	});
}

var updateAllData = function () {
    // Create a unique string based on the current date
    var today = new Date();
    var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();

    var data = [];
    var regionList = [];

	async.series([
	    function (callback) {
		
		    // First: use website-scraper to download the map.sql for current date

            var options = {
                urls : [URL],
                directory: './database/mapFiles/' + dateString,
                defaultFilename: 'map.txt'
            };
            // After successfully downloading, redirect to home page
            scrape(options, (error, result) => {
                console.log('Succesfully scraped webpage, saved file: ' + dateString)
                callback(null, 'One')
            });
		},
		function (callback) {
			
			// Second: open and read today's map file line-by-line, saving lines as array

            const rl = readline.createInterface({
                input: fs.createReadStream('./database/mapFiles/' + dateString + '/map.txt')
            });
         
            rl.on('line', function (line) {
                line = line.replace("`x_world`", dateString);
                data.push(line);
            });
            // Close event is recieved at the end of ReadStream input
            rl.on('close', function () {
                console.log('Line reader has recieved a "close" event');
                // Callback instructs async.series to move onto the next function
                callback(null, 'Two');
            });
		},
		function(callback) {
			
			// Third: create the SQLite database from today's map file

            var db = new sqlite3.Database('./database/db/' + dateString + '.db')

            // db.serialize allows only one sql statement to run at a time 
            // ... prevents trying to query a table that doesn't exist yet, etc.
            db.serialize( function () {
                var sql = 'CREATE TABLE IF NOT EXISTS ' + dateString + ' (ID INTEGER, X INTEGER, Y INTEGER, tID INTEGER, vID INTEGER, Village TEXT, uID INTEGER, Player TEXT, aID INTEGER, Alliance TEXT, Population INTEGER)'
                db.run(sql);
                
                for (var i = 0; i < data.length; i++) {
                    db.run(data[i])
				}
                // Add regions column to map database
				sql = 'ALTER TABLE ' + dateString + ' ADD COLUMN Region TEXT'
				db.run(sql);

                // Connect to regions database
                sql = "ATTACH DATABASE './database/db/regions.db' AS Regions"
				db.run(sql);

				// Update map database to include region names
				sql = 'UPDATE ' + dateString + ' SET Region = (SELECT Regions.regionsSQL.Region FROM Regions.regionsSQL WHERE (' + dateString + '.ID = Regions.regionsSQL.ID))'
				db.run(sql);

				// sql = 'SELECT * FROM ' + dateString + ' WHERE uID = 300';
                // db.each(sql, function (err, row) {
                //     if (err) {
                //         console.log(err);
                //     } else {
                //         console.log(row);
                //     }
				// });

                // Get all region names
                sql = 'SELECT DISTINCT Region FROM ' + dateString;
                db.each(sql, function (err, row) {
                    if (err) {
                        console.log(err);
                    } else {
                        var line = row.Region;

						if (line != null) {
							if (line[0] == ' ') {
                                line = line.substring(1, line.length)
						    }
							line = line.replace(/\s/g,"_");
                        }
                        // console.log('Adding region to list: ' + line);
                        regionList.push(line);
                    }
                });

                db.close(function (err, call) {
                    if (err) {
                        console.log('Error closing db: ' + err);
                    }
                    console.log('Finished creating current database.')
                    callback(null, 'Three')
                });
            });
		},
		function(callback) {

			// Fourth: create and/or update the regions history database

            /*
			    1.  Open database regionHistory.db. 
			    2.  Attach current map database and get list of all regions 'UNIQUE REGION'
                3.  Loop through all regions
			     3.1  For each region CREATE TABLE IF NOT EXISTS with columns of aID and Alliance
			     3.2  Add new column called 'CURRENT_DATE' 
			     3.3  Get 5 alliances with highest population in each region
			      3.3.1  If alliance is not in table, add new row with aID, Alliance, and current SUM(Population)
                  3.3.2  If alliance is in table, just UPDATE current date col with SUM(Population)
            */

            // 1. Open database regionHistory.db
			var db = new sqlite3.Database('./database/db/regionHistory.db');

			db.serialize( function() {
				// 2. Connect to current map database
				var sql = "ATTACH DATABASE './database/db/" + dateString + ".db' AS map";
				db.run(sql);

                // 3. Loop through all regions
				for (var i = 0; i < regionList.length; i++) {
					var results = [];
                    // console.log('Creating table for: ' + regionList[i])

                    if (regionList[i] == null) continue;

                    db.serialize( function() {
    					// 3.1 Create table for each region ---> Only needed to run once
    					sql = 'CREATE TABLE IF NOT EXISTS ' + regionList[i] + '(aID INTEGER, Alliance TEXT, UNIQUE(aID, Alliance))'
    					db.run(sql)

                        // 3.2 Add column for updated pop to each table
                        sql = 'ALTER TABLE ' + regionList[i] + ' ADD COLUMN ' + dateString + ' INTEGER';
    					db.run(sql);

                        // 3.3.1 and 3.3.2 
                        sql = 'INSERT OR IGNORE INTO ' + regionList[i] + '(aID, Alliance) SELECT aID, Alliance FROM map.' + dateString + ' WHERE (Region LIKE "%' + regionList[i] + '%" AND map.' + dateString + '.aID != 0) GROUP BY Alliance ORDER BY SUM(Population) DESC LIMIT 5';
                        db.run(sql);

                        sql = 'UPDATE ' + regionList[i] + ' SET ' + dateString + ' = (SELECT SUM(Population) FROM ' + dateString + ' WHERE (Region LIKE "%' + regionList[i] + '%" AND ' + dateString + '.aID = ' + regionList[i] + '.aId) GROUP BY Alliance)';
						db.run(sql);
                    });
				}

				sql = 'SELECT * FROM Aquileia';
                db.each(sql, function (err, row) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(row);
                    }
                });            

                db.close(function (err, call) {
                    if (err) {
                        console.log('Error closing db: ' + err);
                    }
                    console.log('Finished updating regionHistory database.')
                    callback(null, 'Four')
                });
		    });

	    }
	],
	function(err, results) {
		if (!err) {
            // results is now equal to ['One', 'Two', 'Three', 'Four']
			console.log('All functions have run succesfully');
        }
    });
}

var partialUpdate = function () {
    // Create a unique string based on the current date
    var today = new Date();
    var dateString = "m" + today.getFullYear() + "_" + today.getMonth() + "_" + today.getDate();

	console.log('\x1b[32m Running partial update. \x1b[0m');

	var data = [];
    var regionList = [];

    async.series([
	    function (callback) {
            // Second: open and read today's map file line-by-line, saving lines as array         
            const rl = readline.createInterface({
                input: fs.createReadStream('./database/mapFiles/' + dateString + '/map.txt')
            });
         
            rl.on('line', function (line) {
                line = line.replace("`x_world`", dateString);
                data.push(line);
            });
            // Close event is recieved at the end of ReadStream input
            rl.on('close', function () {
                console.log('Line reader has recieved a "close" event');
                // Callback instructs async.series to move onto the next function
                callback(null, 'Two');
            });
        },
        function(callback) {
            // Third: create the SQLite database from today's map file         
            var db = new sqlite3.Database('./database/db/' + dateString + '.db')         
            // db.serialize allows only one sql statement to run at a time 
            // ... prevents trying to query a table that doesn't exist yet, etc.
            db.serialize( function () {
                var sql = 'CREATE TABLE IF NOT EXISTS ' + dateString + ' (ID INTEGER, X INTEGER, Y INTEGER, tID INTEGER, vID INTEGER, Village TEXT, uID INTEGER, Player TEXT, aID INTEGER, Alliance TEXT, Population INTEGER)'
                db.run(sql);
                // Add all rows to database
                for (var i = 0; i < data.length; i++) {
                    db.run(data[i])
                }
                // Add regions column to map database
                sql = 'ALTER TABLE ' + dateString + ' ADD COLUMN Region TEXT'
                db.run(sql);            
                // Connect to regions database
                sql = "ATTACH DATABASE './database/db/regions.db' AS Regions"
                db.run(sql);            
                // Update map database to include region names
                sql = 'UPDATE ' + dateString + ' SET Region = (SELECT Regions.regionsSQL.Region FROM Regions.regionsSQL WHERE (' + dateString + '.ID = Regions.regionsSQL.ID))'
                db.run(sql);            
                // Get all region names
                sql = 'SELECT DISTINCT Region FROM ' + dateString;
                db.each(sql, function (err, row) {
                    if (err) {
                        console.log(err);
                    } else {
                        var line = row.Region;

                        if (line != null) {
                            if (line[0] == ' ') {
                                line = line.substring(1, line.length)
                            }
                            line = line.replace(/\s/g,"_");
                        }
                        // console.log('Adding region to list: ' + line);
                        regionList.push(line);
                    }
                });
                // Close database connection
                db.close(function (err, call) {
                    if (err) {
                        console.log('Error closing db: ' + err);
                    }
                    console.log('Finished creating current database.')
                    callback(null, 'Three')
                });
            });
        },
        function(callback) {         
            // Fourth: create and/or update the regions history database         
            // 1. Open database regionHistory.db
            var db = new sqlite3.Database('./database/db/regionHistory.db');         
            db.serialize( function() {
                // 2. Connect to current map database
                var sql = "ATTACH DATABASE './database/db/" + dateString + ".db' AS map";
                db.run(sql);            
                // 3. Loop through all regions
                for (var i = 0; i < regionList.length; i++) {
                    var results = [];
                    // console.log('Creating table for: ' + regionList[i])               
                    if (regionList[i] == null) continue;

                    db.serialize( function() {
                        // 3.1 Create table for each region ---> Only needed to run once
                        sql = 'CREATE TABLE IF NOT EXISTS ' + regionList[i] + '(aID INTEGER, Alliance TEXT, UNIQUE(aID, Alliance))'
                        db.run(sql)                  
                        // 3.2 Add column for updated pop to each table
                        sql = 'ALTER TABLE ' + regionList[i] + ' ADD COLUMN ' + dateString + ' INTEGER';
                        db.run(sql);                  
                        // 3.3.1 and 3.3.2 Add alliances and IDs to table if they are not already there
                        sql = 'INSERT OR IGNORE INTO ' + regionList[i] + '(aID, Alliance) SELECT aID, Alliance FROM map.' + dateString + ' WHERE (Region LIKE "%' + regionList[i] + '%" AND map.' + dateString + '.aID != 0) GROUP BY Alliance ORDER BY SUM(Population) DESC LIMIT 5';
                        db.run(sql);
                        // Update column with poplation sum
                        sql = 'UPDATE ' + regionList[i] + ' SET ' + dateString + ' = (SELECT SUM(Population) FROM ' + dateString + ' WHERE (Region LIKE "%' + regionList[i] + '%" AND ' + dateString + '.aID = ' + regionList[i] + '.aId) GROUP BY Alliance ORDER BY SUM(Population) DESC LIMIT 5)';
                        db.run(sql);
                    });
                }

                sql = 'SELECT * FROM Aquileia';
                db.each(sql, function (err, row) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(row);
                    }
                });            

                db.close(function (err, call) {
                    if (err) {
                        console.log('Error closing db: ' + err);
                    }
                    console.log('Finished updating regionHistory database.')
                    callback(null, 'Four')
                });
            });

        }
	],
	function(err, results) {
        if (!err) {
            // results is now equal to ['Two', 'Three', 'Four']
            console.log('\x1b[42m All functions have run succesfully for ' + dateString + '\x1b[0m');
        }
    });
}

// require('make-runnable');

startHere();

