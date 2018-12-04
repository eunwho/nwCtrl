//"use strict";

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

function getFileName(){
	var tFs = "./piCtrl.conf";

	//var testOut = "fileNumber:10";
	//var temp = fs.readFileSync(tFs,'utf8');  
	//var test = temp.split(':');

	var readText = fs.readFileSync(tFs,'utf8');  
	var test = readText.split(':');
	var temp = test[1] * 1;
	
	if( (temp > 0) && (temp < 100) ){
		( temp == 100 )? temp = 1: temp ++;
	}	else temp = 1;

	var textOut = "fileNumber:"+temp;
	fs.writeFileSync(tFs,textOut, 'utf8');  

	return ( 'record'+temp+'.dat');
}

function getElapedTime(count){
	var second = count /1000;
	var hour = Math.floor( second / 3600 );
	var min  = Math.floor(( second - hour * 3600)/60);
 	var sec  = Math.floor( second - hour * 3600 - min * 60);

	return (':'+hour +'시간:' +min +'분:'+sec+'초 동작함');
}

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

function btnEmg(){
}

function btnStart(){
}

function btnRestart(){
}

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

function updateGauge(gaugeData1,gaugeData2){
   try{
      $('canvas[id="gauge1"]').attr('data-value', (gaugeData1));
      $('canvas[id="gauge2"]').attr('data-value', (gaugeData2));
   }catch(err){
      console.log('err updateGauge ',err.message);
   }
}

function readDHT22(){
	var readout = dht.read();
	var dhtTemp = readout.temperature.toFixed(2) + 'C';
	var dhtHumi = readout.humidity.toFixed(2) + '%';

	updateGauge(dhtTemp, dhtHumi);

	setTimeout(readDHT22, 5000);
}

readDHT22( );

