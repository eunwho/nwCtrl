//"use strict";
const dataLength = 450;
var traceCount = 0;
var traceData0 = { channel:0,length:dataLength,sample:[dataLength]};
var traceData1 = { channel:1,length:dataLength,sample:[dataLength]};
var traceData2 = { channel:2,length:dataLength,sample:[dataLength]};
var traceData3 = { channel:3,length:dataLength,sample:[dataLength]};
var trace =[traceData0,traceData1,traceData2,traceData3];
 
var adcValue = [0,0,0,0];
var noVac = 1;
var messages = 0;
var tripNumber=0;
var errState = 0;
var motorErro =0;
var heatErro = 0;
var flowErro = 0;
var adcValue = [0,0,0,0];
var procStartTime = new Date();
var minute = 0;
var ADDR_IN1 = 0x20, ADDR_IN2 = 0x21, ADDR_OUT1=0x22,ADDR_OUT2= 0x23;

var Promise = require('promise');
var fs = require('fs');

var reloadWatcher=fs.watch('./js/',function(){
	location.reload();
	reloadWatcher.close();
});

var path= require('path');

var digitalOutBuf = [0];

var count = 0 ;
var channel = 0;
var vacuumData = { data : [4]};

var testCount = 0;
var emitCount = 0;
var selVacRecord = 1;

var traceData = {channel:[0,0,0,0],State:0};

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
var msgBoxCount=0;

var motorError=0;
var heatErro = 0;
var flowSensErro =0;

var machineState = 0;
var recordState = 0;
var startTime = 0;
var poweroff = 0;
var startState = 0;

var coefDegr = [[690,900],[0,200]]; // 1V --> 0도 --> 690, 5V --> 200degree --> 900,
var coefPres = [[690,900],[0,10]]; // 1V --> 0.0Mpa --> 690, 5V --> 2.0 Mpa --> 900,
var coefVacu = [[690,900],[0,-100]]; // 1V --> 0.0Mpa --> 690, 5V --> -0.1Mpa --> 900,

var dataFileName ='record0.dat';
var tripLogFileName = 'ewtrip.log'
var recordCount = 0;

setInterval(function() {

	var date = new Date();
	var n = date.toLocaleDateString();
	var time = date.toLocaleTimeString();

	var xDataL = dataLength/4;
	var test = 100 * Math.sin(  2*Math.PI * (traceCount * 2)/300 ) + 100;

   recordCount = (recordCount > (xDataL -1 )) ? 0 : recordCount+1;
	traceData0.sample[traceCount] = test;
	traceData1.sample[traceCount] = test;
	traceData2.sample[traceCount] = test;
	traceData3.sample[traceCount] = test;
   traceCount = (traceCount > (dataLength -1) ) ? 0 : traceCount+1;
	oscope.onPaint(trace);
},200);

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


function processExit(){
   console.log('\nShutting down, performing GPIO cleanup');
   process.exit(0);
}

function btnEmg(){
/*
*/
}

function btnStart(){
}

function btnRestart(){
	traceCount = 0;
	for( var i = 0 ; i < dataLength ; i ++){

		traceData0.sample[i] = ' ';
		traceData1.sample[i] = ' ';
		traceData2.sample[i] = ' ';
		traceData3.sample[i] = ' ';
	}
}

$("document").ready(function() {
   if (oscope) oscope.init();

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
