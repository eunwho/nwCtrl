//"use strict";
var tripNumber=0;
var errState = 0;

var motorErro =0;
var heatErro = 0;
var flowErro = 0;
var adcValue = [0,0,0,0,0,0,0,0];

var	procStartTime = new Date();
var minute = 0;
var ADDR_IN1 = 0x20, ADDR_IN2 = 0x21, ADDR_OUT1=0x22,ADDR_OUT2= 0x23;

var Promise = require('promise');

var path= require('path');

var i2c = require('i2c-bus');
var piI2c = i2c.openSync(1);

/*
piI2c.scan(function(err,res){
   if(err) console.log(err);
   else     console.log(res);
});
*/
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

/*
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
*/
/*
var writeMcp23017 = function(address,port,byte){

  return new Promise(function ( resolve , reject ){

    if(port) var GPIO = 0x13;
    else     var GPIO = 0x12;

    piI2c.writeByte(address,GPIO,byte,function(err){
      if(err){
        reject(err);
      }
      else{
        resolve();
      }
    });
  });
}

var writeCmdMcp23017 = function(address,port,byte){

  return new Promise(function ( resolve , reject ){

    piI2c.writeByteSync(address,port,byte,function(err){
      if(err){
        reject(err);
      }
      else{
        resolve();
      }
    });
  });
}

/*
var readMcp23017 = function(address,port){

  return new Promise(function ( resolve , reject ){

    var GPIO = 0x12;

    if( port ) GPIO = 0x13;
    else       GPIO = 0x12;
   
    piI2c.readByte(address,GPIO,function(err,Byte){
      if(err){
        reject(err);
      }
      else{
        resolve(Byte);
      }
    });
  });
}

/*
machineState 
0   --> ready
1   --> runing
2   --> trip
*/

var machineState = 0;
var recordState = 0;
var startTime = 0;
var poweroff = 0;
var startState = 0;

var coefDegr = [[690,900],[0,200]]; // 1V --> 0도 --> 690, 5V --> 200degree --> 900,
var coefPres = [[690,900],[0,10]]; // 1V --> 0.0Mpa --> 690, 5V --> 2.0 Mpa --> 900,
var coefVacu = [[690,900],[0,-0.1]]; // 1V --> 0.0Mpa --> 690, 5V --> -0.1Mpa --> 900,


setInterval(function() {

	var date = new Date();
	var n = date.toLocaleDateString();
	var time = date.toLocaleTimeString();

  for ( var i = 0; i <= 7; i++){
		try{
		//prepare Tx buffer [trigger byte = 0x01] [channel = 0x80(128)] [placeholder = 0x01]
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

		adcValue[i] = value;

		if( i == 0 ){
			var alpa = (coefDegr[1][1]-coefDegr[1][0])/( coefDegr[0][1] - coefDegr[0][0]);
			var beta = coefDegr[1][1] - alpa * coefDegr[0][1];
			var offset = 3.0;
			traceData.channel[0] = ((( alpa * value + beta) + offset ).toFixed(1))*1; 
		}else if(i == 1 ){
			var alpa = (coefPres[1][1]-coefPres[1][0])/( coefPres[0][1] - coefPres[0][0]);
			var beta = coefPres[1][1] - alpa * coefPres[0][1];
			var offset = 0.0;
			traceData.channel[1] = ((( alpa * value + beta) + offset ).toFixed(2))*1; 
		} else{
			var alpa = (coefVacu[1][1]-coefVacu[1][0])/( coefVacu[0][1] - coefVacu[0][0]);
			var beta = coefVacu[1][1] - alpa * coefVacu[0][1];
			var offset = 0.0;
			traceData.channel[i] = ((( alpa * value + beta) + offset ).toFixed(3))*1; 
		}
		} catch(e) {
			var date = new Date();
			var n = date.toLocaleDateString();
			var time = date.toLocaleTimeString();
			console.log('E time = ',n+' : ' + time);
			console.log('SPI ADC error = ',e);
		}
  };

/*	// console.log('check1 = '+ traceData.channel);
  var promise = readMcp23017(ADDR_IN1,0); //외부 입력을 읽음

  promise
  .then(function(byte){
		inMcp23017[0]=byte;		   
  }).catch(function(err){
    console.log(err);
  });

  console.log('%d,%d,%d,%d,%d,%d,%d,%d',
			adcValue[0],adcValue[1],adcValue[2],adcValue[3],adcValue[4],adcValue[5],adcValue[6],adcValue[7]);

  console.log('%d,%d,%d,%d,%d,%d,%d,%d',
			traceData.channel[0],traceData.channel[1],
			traceData.channel[2],traceData.channel[3],
			traceData.channel[4],traceData.channel[5],
			traceData.channel[6],traceData.channel[7])

  console.log('%d,%d,%d,%d',inMcp23017[0],inMcp23017[1],inMcp23017[2],inMcp23017[3]);
*/
	try{

		count = (channel > 598 ) ? 0 : count+1; 
		//channel = (channel > 6 ) ? 0 : channel+1; 
	
	  var portVal = 0;

		if( (count % 10) == 0 ){
		
			var endTime = new Date();
			var timeDiff = endTime - procStartTime;

			timeDiff /= 1000;

			timeDiff /= 60;

			minute = Math.round(timeDiff);
			console.log('-------------------------------------------------------');
			console.log('                    경과 분  =    ',minute ); 
			console.log('-------------------------------------------------------');
		}

	} catch(e) {
		var date = new Date();
		var n = date.toLocaleDateString();
		var time = date.toLocaleTimeString();
		console.log('E time = ',n+' : ' + time);
		console.log('process.stdout.write error = ',e);
	}
},1000);

/*
setInterval(function() {

	var date = new Date();
	var n = date.toLocaleDateString();
	var time = date.toLocaleTimeString();

  for ( var i = 0; i <= 7; i++){
		try{
		//prepare Tx buffer [trigger byte = 0x01] [channel = 0x80(128)] [placeholder = 0x01]
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

		adcValue[i] = value;

		if( i == 0 ){
			var alpa = (coefDegr[1][1]-coefDegr[1][0])/( coefDegr[0][1] - coefDegr[0][0]);
			var beta = coefDegr[1][1] - alpa * coefDegr[0][1];
			var offset = 3.0;
			traceData.channel[0] = ((( alpa * value + beta) + offset ).toFixed(1))*1; 
		}else if(i == 1 ){
			var alpa = (coefPres[1][1]-coefPres[1][0])/( coefPres[0][1] - coefPres[0][0]);
			var beta = coefPres[1][1] - alpa * coefPres[0][1];
			var offset = 0.0;
			traceData.channel[1] = ((( alpa * value + beta) + offset ).toFixed(2))*1; 
		} else{
			var alpa = (coefVacu[1][1]-coefVacu[1][0])/( coefVacu[0][1] - coefVacu[0][0]);
			var beta = coefVacu[1][1] - alpa * coefVacu[0][1];
			var offset = 0.0;
			traceData.channel[i] = ((( alpa * value + beta) + offset ).toFixed(3))*1; 
		}
		} catch(e) {
			var date = new Date();
			var n = date.toLocaleDateString();
			var time = date.toLocaleTimeString();
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
				// first stop state 
				// draw graph and save to png image file
				// mongoDB find and set table for graphic data
				if ( recordState ) {  // 시작상태에 있다가 정지상태로 변환 되는 시점의 처리
					recordState++;
					if(recordState > 2 ) {
						console.log('set graph data and emit to clients');
						//경과시간
						var endTime = new Date();
						var elapedTime = endTime-startTime;
						console.log( elapedTime);
						// myEmitter.emit('event', startTime );
						recordState = 0;
					}
				}else{
					machineState = 0; // machine ready
					console.log('OFF  Start Input');
				}
			} else {
				console.log('ON Start Input');
				if( recordState == 0 ){
						recordState = 1;
						startTime = new Date();
				} else { // recording analog signal to mongoDB
					//var adcValue = [0,0,0,0,0,0,0,0];
					//var ilSungSchema = mongoose.Schema({
					//	recordId 	: Number,
					//	value 		: adcValue,
					//	date:{type:Date,default:Date.now}
					//});
					 
			//--- start for saving data to mongoDB
					machineState = 1;	// machine running

					var saveTime = new Date();
					var mongoIn = new ilSungDB({value:traceData.channel});

					mongoIn.save(function(err,mongoIn){
         		if(err){
            	console.log(err);
            	return console.error(err);
         		}else{
            	console.log('Graph Data saved :'+mongoIn);
         		}
      		});  
			//--- end of saving mongoDb data
				} // else of input start.				
	    } 

      temp =  (inMcp23017[0] & 2 );
		if( temp ){
			console.log('OFF Stop Input');
			poweroff = 0;
		} else {
			poweroff++;
			console.log('on stop count = %d',poweroff);
			console.log('ON  Stop Input');
			if(poweroff > 1 ) shutdown ();
		}

      temp =  (inMcp23017[0] & 4 );
		if( temp ){
			console.log('No Motor Error');
				motorError = 0;
		} else {
			motorErro++;
			console.log('motor error count = %d',motorErro);
			tripNumber = 1; // motor overload
			// if( motorErro > 2 )	myEmitter.emit('trip', tripNumber );
		}

      temp =  (inMcp23017[0] & 8 );
		if( temp ){
			console.log('No Heater Error');
				heatErro = 0;
		} else {
			heatErro++;
			console.log('heat error count = %d',heatErro);
			tripNumber = 2; // motor overload
			// if(heatErro > 2 )	myEmitter.emit('trip', tripNumber );
		}
      temp =  (inMcp23017[0] & 16 );
		if( temp ){
			console.log('No Flow Sensor Error');
				flowSensErro = 0;
		} else {
			flowSensErro ++;
			console.log('flowSensor count = %d',flowSensErro);
			tripNumber = 3; // motor overload
			// if(flowSensErro > 2 )	myEmitter.emit('trip', tripNumber );
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
  console.log('%d,%d,%d,%d,%d,%d,%d,%d',
			adcValue[0],adcValue[1],adcValue[2],adcValue[3],adcValue[4],adcValue[5],adcValue[6],adcValue[7]);

  console.log('%d,%d,%d,%d,%d,%d,%d,%d',
			traceData.channel[0],traceData.channel[1],
			traceData.channel[2],traceData.channel[3],
			traceData.channel[4],traceData.channel[5],
			traceData.channel[6],traceData.channel[7])

  console.log('%d,%d,%d,%d',inMcp23017[0],inMcp23017[1],inMcp23017[2],inMcp23017[3]);

	try{

		count = (channel > 598 ) ? 0 : count+1; 
		//channel = (channel > 6 ) ? 0 : channel+1; 
	
	  var portVal = 0;

		if( (count % 10) == 0 ){
		
			var endTime = new Date();
			var timeDiff = endTime - procStartTime;

			timeDiff /= 1000;

			timeDiff /= 60;

			minute = Math.round(timeDiff);
			console.log('-------------------------------------------------------');
			console.log('                    경과 분  =    ',minute ); 
			console.log('-------------------------------------------------------');
		}

	} catch(e) {
		var date = new Date();
		var n = date.toLocaleDateString();
		var time = date.toLocaleTimeString();
		console.log('E time = ',n+' : ' + time);
		console.log('process.stdout.write error = ',e);
	}
},1000);

*/
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

process.on('SIGTERM', function () {
    process.exit(0);
});

process.on('SIGINT', function () {
    process.exit(0);
});
 
process.on('exit', function () {
    console.log('\nShutting down, performing GPIO cleanup');
    rpio.spiEnd();
    process.exit(0);
});
