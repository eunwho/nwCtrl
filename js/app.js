function saveAsImg(chartContainer) {
        var imgData = getImgData(chartContainer);
        
        // Replacing the mime-type will force the browser to trigger a download
        // rather than displaying the image in the browser window.
        window.location = imgData.replace("image/png", "image/octet-stream");
}

/*
  function btnStart(){
			saveAsImg(document.getElementById('chart_div1'));
	}
*/

function btnStart(){
	var my_div = document.getElementById('chart_div1');
	var my_chart = google.visualization.ScatterChart(my_div);
	google.visualization.events.addListener(my_chart, 'ready', function () {
	  	my_div.innerHTML = '<img src="' + chart.getImageURI() + '">';
	});
}

function btnStop(){

}

function btnRestart(){
	msgTx.selVac = 3;
	socket.emit('btnClsik',msgTx);
}

function setChannelOffset(channel,element) {
	var offset = parseInt(element.value);
   if (offset < -4) {
      element.value = "-4";
      offset = -4;
   }
   if (offset > 4) {
      element.value = "4";
      offset = 4;
   }
   oscope.onVerticalOffset(channel,offset);
}


//	var test = [0,200,2.0,-0.1,-0.1,-0.1,-0.1,-0.1,-0.1];
//	msg.push(test);
  
/*
socket.on('trip',function(msg){
	console.log('trip on =%d',msg);
	  document.getElementById('stater').innerHTML = '이상발생';
	if(msg == 1 ){
	  document.getElementById('stopRecord').innerHTML = '모터과열 ,냉각팬,유압모터,팬모터';
	}else if( msg == 2){
	  document.getElementById('stopRecord').innerHTML = '히터조절기, 내부 과열 이상';
	}else if( msg == 3){
	  document.getElementById('stopRecord').innerHTML = '플로센서 이상';
	}
});	
*/

/*
socket.on('graph', function (msgIn) {

	var msg1=[];
	var msg2=[];
	var msg3=[];
	var i =0;

	var msg = msgIn.graphData;
	var startTime = msgIn.startTime;
	var endTime = msgIn.endTime;
	var startTime = msgIn.startTime;

  document.getElementById('startTimeStamp').innerHTML = startTime;
  document.getElementById('endTimeStamp').innerHTML = endTime;

	console.log(endTime);


	msg.forEach(function(each1){
		msg1.push([each1[0]/60]);  // time
		msg1[i].push(each1[1]/60); // temperature
		i++;
	});	
	console.log(msg1);

	i=0;
	msg.forEach(function(each1){
		msg2.push([each1[0]/60]);  // time
		msg2[i].push(each1[2]/60); // pressor
		i++;
	});	
	console.log(msg2);

	i=0;
	msg.forEach(function(each1){
		msg3.push([each1[0]/60]);  // time
		msg3[i].push(each1[3]/60); // vacuum
		msg3[i].push(each1[4]/60); // vacuum
		msg3[i].push(each1[5]/60); // vacuum
		msg3[i].push(each1[6]/60); // vacuum
		msg3[i].push(each1[7]/60); // vacuum
		msg3[i].push(each1[8]/60); // vacuum
		i++;
	});	
	console.log(msg3);
	graphData1 = msg1;
	graphData2 = msg2;
	graphData3 = msg3;
	
	var graphTitle = 'Start Time = ' + startTime + ' :::   End Time = ' + endTime;
	drawStuff(graphTitle);
});
*/

