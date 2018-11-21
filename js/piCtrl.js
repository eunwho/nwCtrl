//"use strict";

const dataLength = 600;

var scopeImage = document.createElement('canvas');
var graphStartTime;
var traceCount = 0;

var gData = { channel:0,length:dataLength,sample:[dataLength]}

var trace =[];

for( var i = 0 ; i < 8 ; i ++){ 
	gData.channel = i;
	trace.push(gData);
}

var adcValue = [0,0,0,0,0,0,0,0];

var messages = 0,tripNumber=0, errState = 0, motorErro =0,heatErro = 0,flowErro = 0;
var adcValue = [0,0,0,0,0,0,0,0];

var procStartTime = new Date();
var minute = 0;
var ADDR_IN1 = 0x20, ADDR_IN2 = 0x21, ADDR_OUT1=0x22,ADDR_OUT2= 0x23;

//nw.Window.get().showDevTools();
require('nw.gui').Window.get().showDevTools();

var Promise = require('promise');
var fs = require('fs');

var reloadWatcher=fs.watch('./js/',function(){
	location.reload();
	reloadWatcher.close();
});

var path= require('path');
var i2c = require('i2c-bus');
var piI2c = i2c.openSync(1);

piI2c.scan(function(err,res){
   if(err) console.log(err);
   else     console.log(res);
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

var count = 0 
var channel = 0;
var dataLength = 600;
var vacuumData = { data : [8]};

var adcOffset = [630,630,630,630,630,630,630,630]

var testCount = 0;
var emitCount = 0;
var selVacRecord = 1;

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
    if(port) var GPIO = 0x13;
    else     var GPIO = 0x12;

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
      (err) ? reject(err): resolve();
    });
  });
}

var readMcp23017 = function(address,port){
  return new Promise(function ( resolve , reject ){
    var GPIO = 0x12;
    if( port ) GPIO = 0x13;
    else       GPIO = 0x12;
   
    piI2c.readByte(address,GPIO,function(err,Byte){
      if(err){
        reject(err);
      } else {
        resolve(Byte);
      }
    });
  });
}

function getElapedTime(count){
	var second = count /1000;
	var hour = Math.floor( second / 3600 );
	var min  = Math.floor(( second - hour * 3600)/60);
 	var sec  = Math.floor( second - hour * 3600 - min * 60);

	return (':'+hour +'시간:' +min +'분:'+sec+'초 동작함');
}

var msgBoxCount=0,motorError=0, heatErro = 0, flowSensErro =0;
var machineState = 0, recordState = 0, startTime = 0, poweroff = 0, startState = 0;

var coefDegr = [[690,900],[0,200]]; // 1V --> 0도 --> 690, 5V --> 200degree --> 900,
var coefPres = [[690,900],[0,10]]; // 1V --> 0.0Mpa --> 690, 5V --> 2.0 Mpa --> 900,
var coefVacu = [[690,900],[0,-100]]; // 1V --> 0.0Mpa --> 690, 5V --> -0.1Mpa --> 900,

var dataFileName ='record0.dat';
var tripLogFileName = 'ewtrip.log'
var recordCount = 0;

var date = new Date();
var n = date.toLocaleDateString();
var time = date.toLocaleTimeString();

setInterval(function() {

	date = new Date();
	n = date.toLocaleDateString();
	time = date.toLocaleTimeString();

  for ( var i = 0; i <= 7; i++){
		try{
	    var sendBuffer = new Buffer([0x01,(8 + i<<4),0x1]);
   	 var recieveBuffer = new Buffer(3)
			
		rpio.spiTransfer(sendBuffer, recieveBuffer, sendBuffer.length); // send Tx buffer and recieve Rx buffer

    // Extract value from output buffer. Ignore first byte
    var junk = recieveBuffer[0];
    var MSB = recieveBuffer[1];
    var LSB = recieveBuffer[2];
    // Ignore first six bits of MSB, bit shift MSB 8 position and 
    // finally combine LSB and MSB to get a full 10bit value
    var value = ((MSB & 3 ) << 8 ) + LSB;
		var alpa = 0;
		var beta = 0;
		var offset = 0;

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
	} catch(e) {
		date = new Date();
		n = date.toLocaleDateString();
		time = date.toLocaleTimeString();
		console.log('E time = ',n+' : ' + time);
		console.log('SPI ADC error = ',e);
	}
  };

	// console.log('check1 = '+ traceData.channel);
  var promise = readMcp23017(ADDR_IN1,0); //외부 입력을 읽음

  promise
  .then(function(byte){
	if(byte < 256 ){
		inMcp23017[0] = byte;

      var temp =  (inMcp23017[0] & 1 );
		if( temp ){
			if ( machineState ) {  // 시작상태에 있다가 정지상태로 변환 되는 시점의 처리
				recordState ++;
				if(recordState > 2 ) {
					var endTime = new Date();
					var elapedTime = endTime-startTime;

   				var n = endTime.toDateString();
   				var time = endTime.toLocaleTimeString();

  					document.getElementById('endTimeStamp').innerHTML = n +':'+ time;
					document.getElementById('elapedTimeStamp').innerHTML = getElapedTime(elapedTime);    
					// myEmitter.emit('event', startTime );
					machineState = 0; // machine ready
					recordState = 0;
					saveGraphImage(dataFileName);  
				} 
			}else{
				machineState = 0;
				recordState = 0;
			}
		} else {
			if( recordState == 0 ){
				recordCount = 0; recordState = 1;

				graphStartTime = new Date();

				for( var j = 0 ; j < 8 ; j ++) {
					for( var i = 0 ; i < 600 ; i ++) { trace[j].sample[i] = 0 ;} 
				}

				traceCount = 0;

			   startTime = new Date();
   			var n = startTime.toDateString();
   			var time = startTime.toLocaleTimeString();

  				document.getElementById('startTimeStamp').innerHTML = n +':'+ time;
				dataFileName = getFileName()+".dat";				

				var dataOut = '=======================================\r\n';
		      fs.writeFileSync(dataFileName,dataOut,'utf8');

				var dataOut = '    일성화이바 오토크레브 동작 데이터 \r\n';
		      fs.appendFileSync(dataFileName,dataOut,'utf8');

				var dataOut = '시작시간 =' + n + ':'+ time + '\r\n';
		      fs.appendFileSync(dataFileName,dataOut,'utf8');

				var dataOut = '=======================================\r\n';
		      fs.appendFileSync(dataFileName,dataOut,'utf8');

				var dataOut = '초\t온도\t압력\t진공1\t진공2\t진공3\t진공4\t진공5\t진공6 \r\n';
		      fs.appendFileSync(dataFileName,dataOut,'utf8');
			}

			var recordTime = new Date();
			var recordNumber = Math.floor((recordTime.getTime() - startTime.getTime())/1000);

			var dataOut =  recordNumber +'\t';
			for( var i = 0; i < 8 ; i++){
				dataOut += traceData.channel[i] + '\t';
			}	

			dataOut +='\r\n';			
	      fs.appendFileSync(dataFileName,dataOut,'utf8');
			machineState = 1;	// machine running
			recordSate = 1;
	   } 

      temp =  (inMcp23017[0] & 2 );
		if( temp ){
			poweroff = 0;
		} else {
			poweroff++;
			if(poweroff > 1 ) shutdown ();
		}

      temp =  (inMcp23017[0] & 4 );
		if( temp ){
			motorError = 0;
		} else {
			if(!motorError){
				motorError++;
				var textOut ='모터 과부하 트립 : 팬모타, 유압모터, 수중모터';
				var d = new Date()+':\t'+textOut+'\r\n';
		      fs.appendFileSync(tripLogFileName,d,'utf8',function(err){
					if (err) {
						console.log('Err appendFileSync() :'+ err);
        				throw 'could not open file: ' + err;
    				}
				});
				errMsgOut(d);
			} 
		}

      temp =  (inMcp23017[0] & 8 );
		if( temp ){
			heatErro = 0;
		} else {
			if(!heatErro){
				heatErro++;
				var textOut ='온도제어기 트립발생';
				var d = new Date()+':\t'+textOut+'\r\n';
		      fs.appendFileSync(tripLogFileName,d,'utf8',function(err){
					if (err) {
						console.log('Err appendFileSync() tripLogFile : '+ err);
        				throw 'could not open file: ' + err;
    				}
				});
				errMsgOut(d);
			}
		}

      temp =  (inMcp23017[0] & 16 );
		if( temp ){
				flowSensErro = 0;
		} else {
			if(!flowSensErro){
				flowSensErro++;
				var textOut ='플로센서 이상 발생';
				var d = new Date()+':\t'+textOut+'\r\n';
		      fs.appendFileSync(tripLogFileName,d,'utf8',function(err){
					if (err) {
						console.log('Err appendFileSync() :'+ err);
        				throw 'could not open file: ' + err;
    				}
				});
				errMsgOut(d);
			}
		}
		 return writeMcp23017(ADDR_OUT1,0,byte);
 		}
   
  }).catch(function(err){
    console.log(err);
  }).then(function(){
    return(readMcp23017(ADDR_IN1,1));
  }).catch(function(err){
    console.log(err);
  }).then(function(byte){
    if(byte < 256 ){
      inMcp23017[1] = byte;
      return writeMcp23017(ADDR_OUT1,1,byte);
    } 
  }).catch(function(err){
    console.log(err);
  }).then(function(){
    return(readMcp23017(ADDR_IN2,0));
  }).catch(function(err){
    console.log(err);
  }).then(function(byte){
    if(byte < 256 ){
      inMcp23017[2] = byte;
      return writeMcp23017(ADDR_OUT2,0,byte);
    } 
  }).catch(function(err){
    console.log(err);
  }).then(function(){
    return(readMcp23017(ADDR_IN2,1));
  }).then(function(byte){
    if(byte < 256 ){
	  	inMcp23017[3] = byte;
      return writeMcp23017(ADDR_OUT2,1,byte);
    } 
  }).catch(function(err){
    console.log(err);
  }); 

	try{
		count = (channel > 598 ) ? 0 : count+1; 
	  var portVal = 0;
		if( (count % 10) == 0 ){
			var endTime = new Date();
			var timeDiff = endTime - procStartTime;
			timeDiff /= 1000;
			timeDiff /= 60;
			minute = Math.round(timeDiff);
		}
	} catch(e) {
		var date = new Date();
		var n = date.toLocaleDateString();
		var time = date.toLocaleTimeString();
		console.log('E time = ',n+' : ' + time);
		console.log('process.stdout.write error = ',e);
	}

	try{

	for( var i = 0 ; i < 8 ; i ++ ){
		trace[i].sample[traceCount] = traceData.channel[i];
	}

	
   $('canvas[id="rGauge1"]').attr('data-value', (traceData.channel[0]));
   $('canvas[id="rGauge2"]').attr('data-value', (traceData.channel[1]));
   $('canvas[id="rGauge3"]').attr('data-value', (traceData.channel[2]));
   $('canvas[id="rGauge4"]').attr('data-value', (traceData.channel[3]));
   $('canvas[id="rGauge5"]').attr('data-value', (traceData.channel[4]));
   $('canvas[id="rGauge6"]').attr('data-value', (traceData.channel[5]));
   $('canvas[id="rGauge7"]').attr('data-value', (traceData.channel[6]));
   $('canvas[id="rGauge8"]').attr('data-value', (traceData.channel[7]));


   if( machineState === 0 ){
		document.getElementById('stater').innerHTML ='대기중';    
      $('stater').removeClass('csStateLampRunning');
      $('stater').addClass('csStateLampReady');
   }else{
    	document.getElementById('stater').innerHTML ='동작중';
      $('stater').removeClass('csStateLampReady');
      $('stater').addClass('csStateLampRunning');
   }  

   var date = new Date();
   var n = date.toDateString();
   var time = date.toLocaleTimeString();

	var timeStamp = n + ' : ' + time;
	document.getElementById('clock1').innerHTML = timeStamp;
   
	console.log(timeStamp);
   
	traceCount = (traceCount > 598) ? 0 : traceCount+1;

	// oscope.onPaint(trace);
	oscope.drawDot(traceCount,traceData.channel);
	recordCount +=1;

	} catch(e) {
		var date = new Date();
		var n = date.toLocaleDateString();
		var time = date.toLocaleTimeString();
		console.log('E time = ',n+' : ' + time);
		console.log('process.stdout.write error = ',e);
	}
},1000);

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


function changeNoVac(){
   console.log('\nShutting down, performing GPIO cleanup');
   rpio.spiEnd();
   process.exit(0);
}

function btnEmg(){
/*
*/
}


function btnStart(){
	testGraphImage("data/2018_1101_1459.dat");
}

function testGraphImage(fName){

	try{

	scope.onPaint(fName);
	//scope.writeTime(start,end);

  	var dataUrl = scopeImage.toDataURL();
	var buffer = new Buffer(dataUrl.split(",")[1], 'base64');

	fs.writeFileSync(fName+'.png',buffer,'base64',function(err){
		if(err){
			console.log('Err writeFileSync saveGraphImage() : '+err);
			throw 'could not open file : ' +err;
		}	
	});
	buffer = null;

	} catch(e){
		console.log(e);
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

function saveGraphImage(fName){

	try{

  	var startDateString = graphStartTime.toDateString();
  	var startClock = graphStartTime.toLocaleTimeString();
	var start = "[ START = " + startDateString +':'+ startClock +" ]";

  	var endTime = new Date();
  	var endDateString = endTime.toDateString();
  	var endClock = endTime.toLocaleTimeString();
	var end = "[ END = " + endDateString +':'+ endClock +" ]";

	scope.onPaint(fName);
	scope.writeTime(start,end);

  	var dataUrl = scopeImage.toDataURL();
	var buffer = new Buffer(dataUrl.split(",")[1], 'base64');

	fs.writeFileSync(fName+'.png',buffer,'base64',function(err){
		if(err){
			console.log('Err writeFileSync saveGraphImage() : '+err);
			throw 'could not open file : ' +err;
		}	
	});
	buffer = null;

	} catch(e){
		console.log(e);
	}
}

function btnRestart(){
	traceCount = 0;
	for( var j = 0 ; j < 8 ; j++){
		for( var i = 0 ; i < 600 ; i ++){ trace[j].sample[i] = 0;}  	
	}
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
// $(a).attr('data-width',200);
// $(a).attr('data-height',200);
// $(a).attr('data-type',"radial-gauge");
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
   $(a).attr('data-animation-duration',1500);
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
   $(a).attr('data-value-box',false);
   $(a).attr('data-value-box-strocke',100);
   $(a).attr('data-value-box-width',100);
   $(a).attr('data-value-box-text',100);
   $(a).attr('data-value-box-text-shadow',false);
   $(a).attr('data-value-box-border-radius',0);
}

function errMsgOut(input){ 

   (msgBoxCount < 4) ? msgBoxCount++ : msgBoxCount = 0; 

	if( msgBoxCount == 0 ){
	   document.getElementById('rxMsg').innerHTML = '';
	}
	var textA = document.getElementById('rxMsg').innerHTML;
	console.log('msgBoxCount=%d : textA = %s',msgBoxCount,textA);
   textA += input;
	textA += '<br />';
	document.getElementById('rxMsg').innerHTML = textA;
}

$("document").ready(function() {

   if (oscope) oscope.init();

	scopeImage = document.createElement('canvas');
	scopeImage.id = "test";
	scopeImage.width = 600;
	scopeImage.hight = 450;

	scope.init(scopeImage);

   for(i = 1 ; i<9 ; i ++){
      var gId = 'rGauge' + i;  
      initGauge( gId );
   }

   for(i = 3 ; i<9 ; i ++){
      var gId = 'rGauge' + i;  
      initVacuGauge( gId );
   }

   initTempGauge("rGauge1");
   initPressGauge("rGauge2");

   startTime = new Date();
	var n = startTime.toDateString();
	var time = startTime.toLocaleTimeString();
	document.getElementById('startTimeStamp').innerHTML = n +':'+ time;
	document.getElementById('endTimeStamp').innerHTML = n +':'+ time;

});

/*
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});
*/

process.on('uncaughtException', function(err){
	alert('Error found');
	console.log(err);
});


process.on('unhandledRejection', function(reason, p){
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

/*
process.on('SIGTERM', function () {
    process.exit(0);
});

process.on('SIGINT', function () {
    process.exit(0);
});
*/
process.on('exit', function () {
    console.log('\nShutting down, performing GPIO cleanup');
    rpio.spiEnd();
    process.exit(0);
});
