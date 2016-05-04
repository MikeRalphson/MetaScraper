var fs = require('fs');

// file is included here:
eval(fs.readFileSync('../morph-proxy/pub/scripts/bobbyTables.js')+'');

var sqlite3 = require("sqlite3").verbose();

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		callback(db);
	});
}

initDatabase(function(db){
	db.each("SELECT * FROM data", function(err, row) {
		if (!err) {
			console.log(row.scraper + ": " + row.desc);
			var schema = {};
			try {
				schema = JSON.parse(row.sql);
				if (schema.error) {
					console.log('  Error '+schema.error);
				}
				else {
					for (var e=0;e<schema.length;e++) {
						var def = schema[e];
						if (def.type == 'table') {
							console.log('  table: '+def.sql);
							var columns = getColumnsFromCreateStatement(def.sql);
							//console.log(columns);
							for (var c=0;c<columns.length;c++) {
								console.log('  column: '+columns[c].name+' '+columns[c].type);
							}
						}
					}
				}
			}
			catch(e) {
				console.log(e);
				console.log('  '+JSON.stringify(schema));
			}
		}
	});

});