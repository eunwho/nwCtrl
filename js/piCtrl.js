//"use strict"
const GRAPH_MAX_COUNT = 3 * 60 * 60;

const MOTOR_TRIP_MSG = '모터 과부하 트립 : 팬모타, 유압모터, 수중모터';
const HEAT_TRIP_MSG 	= '온도제어기 트립발생';
const FLOW_TRIP_MSG 	= '플로센서 이상 발생';

var startTime = new Date();
var graphStartTime = new Date();

var adcValue = [0,0,0,0,0,0,0,0];
var gTripState =0, motorErr = 0, heatErr = 0, flowSensErr =0;
var ADDR_IN1 = 0x20, ADDR_IN2 = 0x21, ADDR_OUT1=0x22,ADDR_OUT2= 0x23;

var machineState = 0, recordState = 0, msgBoxCount=0, poweroff = 0;

var coefDegr = [[690,900],[0,200]]; 		// 1V --> 0도 --> 690, 5V --> 200degree --> 900,
var coefPres = [[690,900],[0,10]]; 			// 1V --> 0.0Mpa --> 690, 5V --> 2.0 Mpa --> 900,
var coefVacu = [[690,900],[0,-100]]; 		// 1V --> 0.0Mpa --> 690, 5V --> -0.1Mpa --> 900,

var dataFileName ='record0.dat';
var tripLogFileName = './err/autoClaveTrip.log';

// require('nw.gui').Window.get().showDevTools();

var Promise = require('promise');
var fs = require('fs');

var reloadWatcher=fs.watch('./',function(){
	location.reload();
	reloadWatcher.close();
});

var path= require('path');
var i2c = require('i2c-bus');
var piI2c = i2c.openSync(1);

piI2c.scan(function(err,res){
	try{
	   if(err) console.log(err.message);
   	else    console.log(res);
	}catch(e){
		console.log(e.message);
	}
});

//set spi
var rpio= require('rpio');
rpio.spiBegin(0);
rpio.spiChipSelect(0);
rpio.spiSetCSPolarity(0,rpio.LOW);
rpio.spiSetClockDivider(2048);
rpio.spiSetDataMode(0);

var inMcp23017=[0,0,0,0];
var digitalOutBuf = [0];

var channel = 0;
var traceData = {channel:[0,0,0,0,0,0,0,0],State:0};

piI2c.writeByteSync(ADDR_OUT1,0,0,function(err){
  if(err) console.log(err);
});

piI2c.writeByteSync(ADDR_OUT1,1,0,function(err){
  if(err) console.log(err);
});

piI2c.writeByteSync(ADDR_OUT2,0,0,function(err){
  if(err) console.log(err);
});

piI2c.writeByteSync(ADDR_OUT2,1,0,function(err){
  if(err) console.log(err);
});

var writeMcp23017 = function(address,port,byte){
  return new Promise(function ( resolve , reject ){
   var GPIO = 0x12;
	GPIO = ( port == 0 ) ? 0x12 : 0x13;
    piI2c.writeByte(address,GPIO,byte,function(err){
      if(err){
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

var writeCmdMcp23017 = function(address,port,byte){
  return new Promise(function ( resolve , reject ){
    piI2c.writeByteSync(address,port,byte,function(err){
      if(err) {
			reject(err);
		} else {
			resolve();
		}
    });
  });
}

var readMcp23017 = function(address,port){
  return new Promise(function ( resolve , reject ){

	var GPIO = 0x12;
	//GPIO = ( port == 0 ) ? 0x12 : 0x13;
   if( port === 0 ){ 
		GPIO = 0x12;
	} else {
		GPIO = 0x13;
	}
	 piI2c.readByte(address,GPIO,function(err,Byte){
      if(err){
  	     reject(err);
     	} else {
     		resolve(Byte);
     	}
    });
  });
}

function getElapsedTime(sTime){
	try{
		var tempDate = new Date();
		var tmpCount = tempDate - sTime;
		var tmpSecond = tmpCount /1000;
		var tmpHour = Math.floor( tmpSecond / 3600 );
		var tmpMin  = Math.floor(( tmpSecond - tmpHour * 3600)/60);
 		var tmpSec  = Math.floor( tmpSecond - tmpHour * 3600 - tmpMin * 60);
		return (':'+tmpHour +'시간:' +tmpMin +'분:'+tmpSec+'초 동작함');
	} catch(err) {
		console.log(err);
		return ("err getElapsedTime");
	}
}

function getClockStr(){
	try{
   	var tmpDate = new Date();
   	var tmpN = tmpDate.toDateString();
   	var tmpTime = tmpDate.toLocaleTimeString();
		var timeStamp = tmpN + ' : ' + tmpTime;
		return timeStamp;
	}catch(err){
		console.log(err.message);
		return "err getClockStr";
	}
}
	
function setGraphStart(){

	recordState = 1;
	graphStartTime = new Date();	
	oscope.init();

	document.getElementById('startTimeStamp').innerHTML = getClockStr( );
	dataFileName = getFileName();

	var dFileName = dataFileName + '.dat';				

	var dataOut = '=======================================\r\n';
	dataOut	+= '    일성화이바 오토크레브 동작 데이터 \r\n';
	dataOut += '시작시간 = ';
	dataOut += startTime.toLocaleDateString() + ':';
	dataOut += startTime.toLocaleTimeString()+ '\r\n';
	dataOut += '=======================================\r\n';
	dataOut += '초\t온도\t압력\t진공1\t진공2\t진공3\t진공4\t진공5\t진공6 \r\n';

   fs.writeFile(dFileName, dataOut, 'utf8', function(err){
		if(err) {
			console.error("write error : "+ err.message);
		} else {
			console.log("start and record head filename = "+dFileName);
		}
	});
}

function getAdcValue(){
	try{

	var alpa = 0, beta = 0, offset = 0;
	var junk = 0, MSB = 0, LSB = 0;
	var sendBuffer = new Buffer([0x01,(8 + i<<4),0x1]);
   var recieveBuffer = new Buffer(3)
	var value = 0;

	for ( var i = 0; i < 8 ; i++){
		sendBuffer = new Buffer([0x01,(8 + i<<4),0x1]);
   	recieveBuffer = new Buffer(3)
			
		rpio.spiTransfer(sendBuffer, recieveBuffer, sendBuffer.length);

		junk = recieveBuffer[0];
	   MSB = recieveBuffer[1];
   	LSB = recieveBuffer[2];
    	value = ((MSB & 3 ) << 8 ) + LSB;
		adcValue[i] = value;

		if( i == 0 ){
			alpa = (coefDegr[1][1]-coefDegr[1][0])/( coefDegr[0][1] - coefDegr[0][0]);
			beta = coefDegr[1][1] - alpa * coefDegr[0][1];
			offset = 3.0;
			traceData.channel[0] = ((( alpa * value + beta) + offset ).toFixed(1))*1; 
		}else if(i == 1 ){
			alpa = (coefPres[1][1]-coefPres[1][0])/( coefPres[0][1] - coefPres[0][0]);
			beta = coefPres[1][1] - alpa * coefPres[0][1];
			offset = 0.0;
			traceData.channel[1] = ((( alpa * value + beta) + offset ).toFixed(2))*1; 
		} else{
			alpa = (coefVacu[1][1]-coefVacu[1][0])/( coefVacu[0][1] - coefVacu[0][0]);
			beta = coefVacu[1][1] - alpa * coefVacu[0][1];
			offset = 0.0;
			traceData.channel[i] = ((( alpa * value + beta) + offset ).toFixed(3))*1; 
		}
	}
	// console.log(traceData.channel);
	} catch(err) {
		console.log('AT = ' + getClockStr());
		console.log('SPI ADC error = ',err.message);
	}
}

function startProc ( byteInput ){

	try{
	if ( 255 < byteInput ){
		console.log('input error = '+byteInput);
		return;
	}

   var temp =  ( byteInput & 1 );

	if( temp !== 0 ){
		if ( machineState !== 0 ) {  //리
			recordState ++;
			if(recordState > 2 ) {
				machineState = 0; // machine ready
				recordState = 0;
  				document.getElementById('endTimeStamp').innerHTML = getClockStr( );
				document.getElementById('elapsedTimeStamp').innerHTML = getElapsedTime(startTime);    
				saveGraphImage(dataFileName);  
			} 
		}else{
			machineState = 0;	recordState = 0;
		}
	} else {	// start input ON
		if( machineState === 0 ){ // machine start input 
			startTime = new Date();	
			setGraphStart();
		}
		machineState = 1;	// machine running
		recordSate = 1;
	} 
	}catch(err){
		console.log(err.message);
	}
}


//--- end of start input process

function exitInProc( input ){
	var temp =  (input & 2 );
	if( 0 !== temp ){
		poweroff = 0;
	} else {
		poweroff++;
		if(poweroff > 2 ){
			gracefulShutdown( );
		}
	}
}
		
function checkMotor(input){
	try{
	   var temp =  ( input & 4 );
		
		if( 0 !== temp ){
			motorErr = 0;
			return 0;
		} else if(motorErr === 0){
			motorErr = 1;
			var d  = new Date();
			 d += ':\t' + MOTOR_TRIP_MSG + '\r\n';
			errMsgOut(d);

			try{
		      fs.appendFileSync(tripLogFileName,d);
			}catch(err){
				console.log(err.message);
			}

			if( gTripState === 0 ){
				if(dataFileName === 'record0.dat'){
					dataFileName = getFileName();					
			 	}
				console.log(dataFileName);
				saveGraphImage(dataFileName);  
			}
			gTripState = 1;
			return 1;
		}
	} catch(err){
		document.write ("catch caught " + err.message + "<br/>");
	}
}

//--- check heat Error
 
function checkHeat(input){

	try{
		var temp = (input & 8 );

		if( 0 !== temp ){
			heatErr = 0;
		} else if(heatErr === 0){
			heatErr = 1;
			var d = (new Date()) + ':\t' + HEAT_TRIP_MSG + '\r\n';
			errMsgOut(d);

			try{
		      fs.appendFileSync(tripLogFileName,d);
			}catch(err){
				console.log(err.message);
			}

			if( gTripState === 0 ){
				if(dataFileName === 'record0.dat'){
					dataFileName = getFileName();					
			 	}
				console.log(dataFileName);
				saveGraphImage(dataFileName);  
			}
			gTripState = 1;
			return 1;
		}
	}catch(err){
		console.log(err.message);
	}
}
//--- check flowSensError

function checkFlowSens(input){
	try{
   	var temp =  (input & 16 );

		if( 0 !== temp ){
			flowSensErr = 0;
		} else if( flowSensErr === 0){
			flowSensErr = 1;
			var d = (new Date()) + ':\t' + FLOW_TRIP_MSG + '\r\n';
			errMsgOut(d);
			try{
		      fs.appendFileSync(tripLogFileName,d);
			}catch(err){
				console.log(err.message);
			}

			if( gTripState === 0 ){
				if(dataFileName === 'record0.dat'){
					dataFileName = getFileName();					
			 	}
				console.log(dataFileName);
				saveGraphImage(dataFileName);  
			}
			gTripState = 1;
			return 1;
		}
	}catch(err){
		console.log(err.message);
	}
}

// return writeMcp23017(ADDR_OUT1,0,byte);
function updateGauge(gaugeData){
	try{
	   $('canvas[id="rGauge1"]').attr('data-value', (gaugeData[0]));
   	$('canvas[id="rGauge2"]').attr('data-value', (gaugeData[1]));
   	$('canvas[id="rGauge3"]').attr('data-value', (gaugeData[2]));
   	$('canvas[id="rGauge4"]').attr('data-value', (gaugeData[3]));
   	$('canvas[id="rGauge5"]').attr('data-value', (gaugeData[4]));
   	$('canvas[id="rGauge6"]').attr('data-value', (gaugeData[5]));
   	$('canvas[id="rGauge7"]').attr('data-value', (gaugeData[6]));
   	$('canvas[id="rGauge8"]').attr('data-value', (gaugeData[7]));
	}catch(err){
		console.log('err updateGauge ',err.message);
	}
}

function simTraceData(){

	try{
		var temp =0; 
		temp = 25.0 +  Math.round( Math.random() *(-10));
		traceData.channel[0] = temp;
		temp = 3.0 +  Math.round( Math.random() *(-10.0))/10.0;
		traceData.channel[1] = temp;

		for(var i = 2 ; i < 8 ; i++ ){  
			temp = -50.0 +  Math.round( Math.random() *( 10));
			traceData.channel[i] = temp;
		}
	}catch(err){
		console.log("Err simTraceData() :  %s" + err.message );
	}
}

//setInterval(function() {
(function loop() {

	getAdcValue();	// upDate traceData.channel 
	var promise = readMcp23017(ADDR_IN1,0); 
  promise
  .then(function(byte){
		var input = byte;
		startProc(input);
		exitInProc(input);
		checkMotor(input);
		checkHeat(input);
		checkFlowSens(input);
  }).catch(function(err){
    console.log(err.message);
  });

	try{ 

		var nowClock = getClockStr();
		updateGauge(traceData.channel);
		document.getElementById('stater').innerHTML = ( 0 !== machineState ) ? '동작중' : '대기중';    
		document.getElementById('clock1').innerHTML = nowClock;
		if(machineState === 1 ){ 

			var tempTime = new Date();
			var elapedTime = tempTime - graphStartTime;
			var xTimeCount1 = elapedTime/1000;
			var xTimeCount2 = 0;		

			if ( xTimeCount1 < GRAPH_MAX_COUNT ){
				xTimeCount2 = xTimeCount1;

				//var dataOut =  xTimeCount2 +'\t';
				var dataOut = tempTime.toLocaleTimeString() +'\t';
				// console.log(dataOut);

				for( var i = 0; i < 8 ; i++){
					dataOut += traceData.channel[i] + '\t';
				}	
				dataOut +='\r\n';			
      		fs.appendFile(dataFileName+'.dat',dataOut,'utf8',function(err){
					if(err) throw err;
					// console.log('append to file = ' + dataFileName + '.dat'); 
				});

			} else {
				saveGraphImage(dataFileName);  
				setGraphStart();
				graphStartTime = new Date();
				oscope.init();
			}
			document.getElementById('elapsedTimeStamp').innerHTML = getElapsedTime(startTime);    
			oscope.drawDot(xTimeCount2, traceData.channel);
		}
	}catch(err) {
		console.log(err.message);
	}
	setTimeout(loop, 2000);
})();

var exec = require('child_process').exec;

function shutdown(callback){
    exec('shutdown now', function(error, stdout, stderr){ callback(stdout); });
}

var gracefulShutdown = function() {
  console.log("Received kill signal, shutting down gracefully.");
  server.close(function() {
    console.log("Closed out remaining connections.");
    process.exit()
  });
  
   // if after 
   setTimeout(function() {
       console.error("Could not close connections in time, forcefully shutting down");
       process.exit()
  }, 10*1000);
}

function btnExit(){
   console.log('\n Shutting down, performing GPIO cleanup');
   rpio.spiEnd();
   process.exit(0);
}

function btnRun1(){
	saveGraphImage(dataFileName);
}

function btnStop(){
	// testGraphImage( );
}

function saveGraphImage(fileName ){
	try{
   	var startDateString = graphStartTime.toDateString();
   	var startClock = graphStartTime.toLocaleTimeString();
   	var start = "[ START = " + startDateString +':'+ startClock +" ]";

   	var endTime = new Date();
   	var endDateString = endTime.toDateString();
   	var endClock = endTime.toLocaleTimeString();
   	var end = "[ END = " + endDateString +':'+ endClock +" ]";

		oscope.writeTime(start,end);

		var scopeImage = $("#oscope")[0]; 
  		var dataUrl = scopeImage.toDataURL();
		var buffer = new Buffer(dataUrl.split(",")[1], 'base64');

		fs.writeFile(fileName+'.png',buffer,'base64',function(err){
			if(err){
				//throw 'could not open file : ' +err;
				// alert('graph file writeFile Error :');
				console.log( err.message);
			}	
		});
		// buffer = null;
	} catch(err){
		console.log(err.message);
	}
}

function getFileName(){

  	var endTime = new Date();
  	var endDateString = endTime.toDateString();
  	var endClock = endTime.toLocaleTimeString();

	var endMonth = ( (endMonth = endTime.getMonth() + 1)<10)? '_0'+endMonth: '_'+endMonth;
	var endDay =  ( (endDay = endTime.getDate()) < 10 ) ? '0'+ endDay : endDay;

	var endHour = ( ( endHour = endTime.getHours()) < 10 ) ? '_0'+ endHour : '_'+ endHour;
	var endMinute = (( endMinute = endTime.getMinutes()) < 10 ) ? '0'+ endMinute : endMinute;

	var fileName = 'data/'+endTime.getFullYear()+ endMonth + endDay + endHour + endMinute;

	return fileName;
}

function btnRestart(){
	//var startDateString = graphStartTime.toDateString();
  	//var startClock = graphStartTime.toLocaleTimeString();
	//var start = "[ START = " + startDateString +':'+ startClock +" ]";

  	//var endTime = new Date();
  	//var endDateString = endTime.toDateString();
  	//var endClock = endTime.toLocaleTimeString();
	//var end = "[ END = " + endDateString +':'+ endClock +" ]";
}

function initTempGauge(gId){
   var a = 'canvas[id=' + gId + ']';

   $(a).attr('data-units',"°C");
   $(a).attr('data-title',"온도계");
   $(a).attr('data-min-value',0);
   $(a).attr('data-max-value',250);
   $(a).attr('data-major-ticks',[0,50,100,150,200,250]);
// $(a).attr('data-minor-ticks',5);
   $(a).attr('data-stroke-ticks',true);
	$(a).attr('data-highlights',
		'[ {"from": 0, "to": 170, "color": "rgba(0,255, 0, .3)"},{"from": 170, "to": 250, "color": "rgba(255,0, 0, .5)"} ]');
   $(a).attr('data-animation-duration',100);
}

function initPressGauge(gId){
   var a = 'canvas[id=' + gId + ']';

   $(a).attr('data-units',"kg/cm*2");
   $(a).attr('data-title',"압력");
   $(a).attr('data-min-value',0);
   $(a).attr('data-max-value',10);
   $(a).attr('data-major-ticks',[0,2.5,5,7.5,10]);
// $(a).attr('data-minor-ticks',0.1);
   $(a).attr('data-stroke-ticks',true);
   $(a).attr('data-highlights',
 '[ {"from": 0, "to": 7 , "color": "rgba(0,0, 255, .3)"},{"from": 7, "to": 10, "color": "rgba(255,0, 0, .5)"} ]');
}

function initVacuGauge(gId){
   var a = 'canvas[id=' + gId + ']';

   $(a).attr('data-units',"g/cm*2");
   $(a).attr('data-title',"진공"+( gId[6]*1-2));
   $(a).attr('data-min-value',-100);
   $(a).attr('data-max-value', 0);
   $(a).attr('data-major-ticks',[-100,-75,-50,-25,0]);
// $(a).attr('data-minor-ticks',0.005);
   $(a).attr('data-stroke-ticks',true);
   $(a).attr('data-highlights',
	'[ {"from": -100, "to": -50 , "color": "rgba(0,255, 255, .3)"},{"from": -50, "to": 0, "color": "rgba(255,255, 255, .5)"} ]');
}

function initGauge(gId){
   var a = 'canvas[id=' + gId + ']';

   $(a).attr('data-ticks-angle',275);
   $(a).attr('data-start-angle',45);
   $(a).attr('data-value-text-shadow',"true");
   $(a).attr('data-color-major-ticks',"#ddd");
   $(a).attr('data-color-minor-ticks',"#ddd");
   $(a).attr('data-color-title',"#eee");
   $(a).attr('data-color-units',"#ccc");
   $(a).attr('data-color-numbers',"#eee");
   $(a).attr('data-color-plate',"#222");
   $(a).attr('data-border-shadow-width',0);
   $(a).attr('data-borders',true);
   $(a).attr('data-needle-type',"arrow");
   $(a).attr('data-needle-width',2);
   $(a).attr('data-needle-circle-size',7);
   $(a).attr('data-needle-circle-outer',true);
   $(a).attr('data-needle-circle-inner',false);
   $(a).attr('data-animation-rule',"linear");
	$(a).attr('data-color-border-outer',"#333");
   $(a).attr('data-color-border-outer-end',"#111");
   $(a).attr('data-color-border-middle',"#222");
   $(a).attr('data-color-border-middle-end',"#111");
   $(a).attr('data-color-border-inner',"#111");
   $(a).attr('data-color-border-inner-end',"#333");
   $(a).attr('data-color-needle-shadow-down',"#333");
   $(a).attr('data-color-needle-circle-outer',"#333");
   $(a).attr('data-color-needle-circle-outer-end',"#111");
   $(a).attr('data-color-needle-circle-inner',"#111");
   $(a).attr('data-color-needle-circle-inner-end',"#222");
   $(a).attr('data-color-value-box-rect',"#222");
   $(a).attr('data-color-value-box-rect-end',"#333");
   $(a).attr('data-value-box',false);
   $(a).attr('data-value-box-strocke',100);
   $(a).attr('data-value-box-width',100);
   $(a).attr('data-value-box-text',100);
   $(a).attr('data-value-box-text-shadow',false);
   $(a).attr('data-value-box-border-radius',0);
   $(a).attr('data-animation-duration',10);
}

function errMsgOut(input){ 

	try{
	   msgBoxCount = (msgBoxCount < 4) ? msgBoxCount + 1 : 0; 

		if( msgBoxCount === 0 ){
	   	document.getElementById('rxMsg').innerHTML = 'Error Message:';
		}
		var textA = document.getElementById('rxMsg').innerHTML;
   	textA += input+'<br>';
		document.getElementById('rxMsg').innerHTML = textA;
	} catch(err){
		console.log(err.message);
	}
}

$("document").ready(function() {

	try{
   	if (oscope) oscope.init();

   	for(var i = 1 ; i < 9 ; i ++){
      	var gId = 'rGauge' + i;  
      	initGauge( gId );
   	}

   	for(var i = 3 ; i < 9 ; i ++){
      	var gId = 'rGauge' + i;  
      	initVacuGauge( gId );
   	}

   	initTempGauge("rGauge1");
   	initPressGauge("rGauge2");

   	startTime = new Date();
		document.getElementById('startTimeStamp').innerHTML = getClockStr( );
		document.getElementById('endTimeStamp').innerHTML = getClockStr( );
	}catch(err){
		console.log(err.message);
	}
});

process.on('exit', function () {
    console.log('\nShutting down, performing GPIO cleanup');
    rpio.spiEnd();
    process.exit(0);
});
		
