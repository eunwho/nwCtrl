//"use strict";
var dhtTemp;
var dhtHumi;
var dataCount = 0;
var dataPoints1 = [];
var dataPoints2 = [];

//require('nw.gui').Window.get().showDevTools();

var gui = require('nw.gui');

// gui.Window.get().showDevTools();

var win = gui.Window.get();

var Promise = require('promise');
var fs = require('fs');

var reloadWatcher=fs.watch('./js/',function(){
   location.reload();
   reloadWatcher.close();
});

var rpiDhtSensor = require('rpi-dht-sensor');
var dht = new rpiDhtSensor.DHT22(4);

var path= require('path');

var exec = require('child_process').exec;

function shutdown(callback){
    exec('shutdown now', function(error, stdout, stderr){ callback(stdout); });
}

var gracefulShutdown = function() {

  console.log("Received kill signal, shutting down gracefully.");

   setTimeout(function() {
       console.error("Could not close connections in time, forcefully shutting down");
       process.exit()
  }, 10*1000);
}

function btnExit(){
   console.log('\nShutting down, performing GPIO cleanup');
   process.exit(0);
}

var chart = nv.models.lineWithFocusChart();

chart.xAxis
	// .tickFormat(d3.format(',f'));
   .tickFormat(function(d) { 
		return d3.time.format('%X')(new Date(d));
	});

chart.x2Axis
	// .tickFormat(d3.format(',f'));
   .tickFormat(function(d) { 
		return d3.time.format('%c')(new Date(d));
	});

chart.yAxis
	.tickFormat(d3.format(',.1f'));

chart.y2Axis
	.tickFormat(d3.format(',.1f'));

chart.yDomain([-5,100]);

chart.color(['red','green','yellow']);

var tmp = new Date();

var dhtData = [ {"key": "Temperature","values":[{"x":tmp,"y": 0},{"x":tmp+1000, "y":10}]},
	{"key": "Humidity"   ,"values":[{"x":tmp,"y":10},{"x":tmp+1000, "y":20}]}
];

function readDHT22(){
	var readout = dht.read();

	var dhtSensor;
	var getData1 = {"x":0,"y":0};
	var getData2 = {"x":0,"y":0};

	var tmpDate = new Date();

	dhtTemp = Number(readout.temperature.toFixed(2));
	dhtHumi = Number(readout.humidity.toFixed(2));

	dhtTemp = ( 100 < dhtTemp ) ? 100 : dhtTemp;
	dhtTemp = ( 0   > dhtTemp ) ? 0   : dhtTemp;

	dhtHumi = ( 100 < dhtHumi ) ? 100 : dhtHumi;
	dhtHumi = ( 0   > dhtHumi ) ? 0   : dhtHumi;
 
	getData1.x = tmpDate;
	getData1.y = dhtTemp;

	getData2.x = tmpDate;
	getData2.y = dhtHumi;
	
	dhtData[0].values.push(getData1);
	dhtData[1].values.push(getData2);

/*
	var str = "ROOM [405] : Temperature = " + dhtTemp+ " \260C";
	str += "Humidity = " +  dhtHumi + "% : " + tmpDate.toString();
	document.getElementById("title").innerHTML = str;
*/

  d3.select('#chart svg')
    .datum(dhtData)
    .transition().duration(500)
    .call(chart)
    ;

	chart.update;

	setTimeout(readDHT22, 3000);
}

readDHT22( );


const YEAR_COUNT = 175200;		// 365 * 24 * 60 / 3

$("document").ready(function() {
//   if (oscope) oscope.init();
});

process.on('SIGTERM', function () {
    process.exit(0);
});

process.on('SIGINT', function () {
    process.exit(0);
});
 
process.on('exit', function () {
    console.log('\nShutting down, performing GPIO cleanup');
    process.exit(0);
});

//--- d3 line chart proc

win.on("loaded",function(){

	var tmpDate = new Date();

	var str = "ROOM [405] : Temperature = " + dhtTemp+ " \260C";
	str += "Humidity = " +  dhtHumi + "% : " + tmpDate.toString();
	document.getElementById("title").innerHTML = str;

});




