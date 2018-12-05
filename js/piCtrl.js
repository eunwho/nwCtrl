//"use strict";
var dhtTemp;
var dhtHumi;
var dataCount = 0;
var dataPoints1 = [];
var dataPoints2 = [];

require('nw.gui').Window.get().showDevTools();

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

function readDHT22(){
	var readout = dht.read();

	dhtTemp = Number(readout.temperature.toFixed(2));
	dhtHumi = Number(readout.humidity.toFixed(2));
	updateGauge(dhtTemp, dhtHumi);
	setTimeout(readDHT22, 3000);
}

readDHT22( );

window.onload = function () {

var chart = new CanvasJS.Chart("chartContainer", {
	zoomEnabled: true,
	title: {
		text: "Temperature and Humidity House #1"
	},
	axisX: {
		title: "chart updates every 3 secs"
	},

	axisY:{suffix: "\260C", title: "Temperature"},
	toolTip: {shared: true},
	legend: {
		cursor:"pointer",
		verticalAlign: "top",
		fontSize: 10,
		fontColor: "dimGrey",
		itemclick : toggleDataSeries
	},
	data: [{ 
		type: "line",
		xValueType: "dateTime",
		yValueFormatString: "##.0\260C",
		xValueFormatString: "Y:MMM:DD DDD hh:mm:ss TT",
		showInLegend: true,
		name: "Temperature",
		dataPoints: dataPoints1
		},
		{				
		type: "line",
		xValueType: "dateTime",
		xValueFormatString: "Y:MMM:DD DDD hh:mm:ss TT",
		yValueFormatString: "##.0",
		showInLegend: true,
		name: "Humidity",
		dataPoints: dataPoints2
	}]
});

function toggleDataSeries(e) {
	if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
		e.dataSeries.visible = false;
	}
	else {
		e.dataSeries.visible = true;
	}
	chart.render();
}

var updateInterval = 3000;
// initial value


const YEAR_COUNT = 175200;		// 365 * 24 * 60 / 3

function updateChart( ) {

	var time = new Date();
	dataPoints1.push({
		x: time,
		y: dhtTemp 
	});

	dataPoints2.push({
		x: time,
		y: dhtHumi 
	});

	dataCount ++;
	if (YEAR_COUNT < dataCount){
		dataCount = YEAR_COUNT;
		dataPoints1.shift();
		dataPoints2.shift();
 	}

	// updating legend text with  updated with y Value 
	chart.options.data[0].legendText = " Temperature : " + dhtTemp;
	chart.options.data[1].legendText = " Humidity : " + dhtHumi + " : " + time.toLocaleDateString(); 
	chart.render();
}

// generates first set of dataPoints 
updateChart();	
setInterval(function(){updateChart()}, updateInterval);

}

function initTempGauge(gId){
   var a = 'canvas[id=' + gId + ']';
   $(a).attr('data-units',"\260C");
/*   $(a).attr('data-title',"Temperature"); */
   $(a).attr('data-min-value',-50);
   $(a).attr('data-max-value',50);
   $(a).attr('data-major-ticks',[-50,-25,0,25,50]);
   $(a).attr('data-minor-ticks',10);
   $(a).attr('data-stroke-ticks',true);
   $(a).attr('data-ticks-width',15);
   $(a).attr('data-highlights','[{"from":-50, "to": 0, "color": "rgba(0,255,0, .3)"},{"from":0,"to":50,"color":"rgba(255,0,0,.3)"}]');
/*
   $(a).attr('data-ticks-width-minor',7.5);	

   $(a).attr('data-color-major-ticks',"#ffe66a");
   $(a).attr('data-color-minor-ticks',"#ffe66a");
   $(a).attr('data-color-title',"#eee");
   $(a).attr('data-color-units',"#ccc");
   $(a).attr('data-color-numbers',"#eee");
   $(a).attr('data-color-plate',"#2465c0");
   $(a).attr('data-color-plate-end',"#327ac0");
   $(a).attr('data-border-shadow-width',0);
   $(a).attr('data-borders',false);
   $(a).attr('data-borders-radius',10);
   $(a).attr('data-needle-type',"arrow");
   $(a).attr('data-needle-width',3);
   $(a).attr('data-animation-duration',1500);
   $(a).attr('data-animation-rule',"linear");
   $(a).attr('data-color-needle',"#222");
   $(a).attr('data-color-needle-end',"#222");
   $(a).attr('data-color-bar-progress',"#327ac0");

   $(a).attr('data-color-bar',"#f5f5f5");
   $(a).attr('data-bar-stroke',0);
   $(a).attr('data-bar-width',8);
   $(a).attr('data-bar-begin-circle',false);
*/
}

$("document").ready(function() {
//   if (oscope) oscope.init();
	initTempGauge("gauge1");
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

function updateGauge(gaugeData1,gaugeData2){
   try{
      $('canvas[id="gauge1"]').attr('data-value', (gaugeData1));
      $('canvas[id="gauge2"]').attr('data-value', (gaugeData2));
   }catch(err){
      console.log('err updateGauge ',err.message);
   }
}



