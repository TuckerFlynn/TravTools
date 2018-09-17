/*
    This file is only to create the regions database, it only needs to be run once successfully as the data does not change
*/

var fs = require('fs')
var readline = require('readline');
var async = require('async');
var sqlite3 = require('sqlite3').verbose()

var create_current_db = function () {
    var regions = [];   
    // Readfile and create a database; both these functions are async but must be run in series
    async.series([
        function(callback) {
            // First: open and read regions file line-by-line, saving lines as array
            const rl = readline.createInterface({
                input: fs.createReadStream('./database/regions.txt')
            });
         
            rl.on('line', function (line) {
                // Fix some lines which start with a comma
                if (line[0] == ',') {
                    line = line.substring(1, line.length)
                }
                regions.push(line);
            });
            // Close event is recieved at the end of ReadStream input
            rl.on('close', function () {
				console.log('Line reader has recieved a "close" event');
                console.log('Total lines: ' + regions.length);
                // Callback instructs async.series to move onto the next function
                callback(null, 'one');
            });
        },
        function(callback) {
            // Second: create the SQLite database from regions info
            var db = new sqlite3.Database('./database/db/regions.db');

            // db.serialize allows only one sql statement to run at a time 
            // ... prevents trying to query a table that doesn't exist yet, etc.
            db.serialize(function () {
                var sql = 'CREATE TABLE IF NOT EXISTS regionsSQL (ID INTEGER, Region TEXT)'
                db.run(sql);

				for (var i = 0; i < regions.length; i++) {
					if (i % 5000 == 0) {
						console.log(i + ' : ' + regions[i]);
					}
                    if (i == regions.length - 1) console.log('Be patient, database will take several minutes to save.')
                    db.run(regions[i]);
				}

                db.close(function (err, call) {
                    if (err) {
						console.log('Error closing db: ' + err);
                    } else {
                        console.log('Finished creating database.');
						callback(null, 'two');
                    }
                }); 
            });       
        }
    ],
    // optional callback
    function(err, results) {
        // results is now equal to ['one', 'two']
        console.log(results);
    });
}

create_current_db();