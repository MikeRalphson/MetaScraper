// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS data (scraper TEXT PRIMARY KEY, desc TEXT, lang TEXT, sql TEXT)");
		callback(db);
	});
}

function updateRow(db, value) {
	// Insert some data.
	var statement = db.prepare("INSERT OR REPLACE INTO data VALUES (?,?,?,?)");
	statement.run(value);
	statement.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT rowid AS id, name FROM data", function(err, row) {
		console.log(row.id + ": " + row.name);
	});
}

function fetchPage(url, page, callback) {
	// Use request to read in pages.
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body, page);
	});
}

function getSql(scraper,desc,lang,callback) {
	var url = 'https://api.morph.io/'+scraper+'/data.json?key='+encodeURIComponent(process.env.MORPH_QUERY_KEY)+
		'&query='+encodeURIComponent('select * from sqlite_master');
	request(url, function(error, response, body) {
		if (error) {
			console.log(error);
			return;
		}
		callback(scraper,desc,lang,body);
	});
}

function processPage(db,$,pageNo) {
	console.log('Processing page '+pageNo);
	var count = 0;
	var elements = $("a.list-group-item").each(function () {
		setTimeout(function(element){
			var a = element.attr('href');
			a = a.replace('/',''); // just once
			var text = element.first('.scraper-lang').text();
			var t = text.split('\n');
			var lang = t[1];
			var desc = t[5];
			var sql = getSql(a,desc,lang,function(a,desc,lang,sql){
				var value = [];
				value.push(a,desc,lang,sql);
				updateRow(db,value);
			});
		},100*count++,$(this));
	});
}

function run(db) {
	// Use request to read in pages.
	fetchPage("https://morph.io/scrapers/page/1", 1, function (body, page) {
		// Use cheerio to find things in the page with css selectors.
		var $ = cheerio.load(body);

		// body > div > ul:nth-child(2) > li.page.active > a

		var maxPage = 0;

		//var elements = $("ul.pagination li").each(function () {
		//	var value = $(this).text().trim();
		//	console.log(value);
		//	if (value.startsWith('Last')) {
		//		var href = $(this).first().attr('href');
		//		//var components = href.split('/');
		//		//maxPage = components[components.length-1];
		//	}
		//});

		var last = $('li.last>a').attr('href');
		console.log(last);
		var components = last.split('/');
		maxPage = components[components.length-1];

		console.log('maxPage = '+maxPage);
		processPage(db,$,1);

		for (var page=2;page<maxPage;page++) {
			fetchPage("https://morph.io/scrapers/page/"+page, page, function(body,page) {
				var $n = cheerio.load(body);
				setTimeout(function(){
					processPage(db,$n,page);
				},10000*page);
			});
		}

		//readRows(db);

		//db.close();
	});
}

initDatabase(run);
