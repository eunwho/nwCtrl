var scope = (function() {
  var m_canvas;
  var m_context;
  var m_width = 600;
  var m_height = 450;
  var m_h2;
  var m_trace = [];
  var m_voffset = [];
  // these must match the initial values of the controls
  // doh! no two way data bindind
  var mSecPerDiv		  		 = 0.100;
  var m_samples_per_second = 600;
  var m_divisions          = 10;
  var m_yscale             = 512;
  var m_sample_bits        = 10;
  var m_volts_per_div      = 5;
  var m_vrange             = 5;
  var m_cursor_index       = 2;
  var m_cursor_seconds     = 0.0;
  var m_cursor_volts       = 0.0;
  var m_run                = true;
  var m_size_index         = 0;
  var m_text_size          = 12;
  var m_updates            = 0;

  m_trace[0]           = null;
  m_trace[1]           = null;
  m_trace[2]           = null;
  m_trace[3]           = null;
  m_trace[4]           = null;
  m_trace[5]           = null;
  m_trace[6]           = null;
  m_trace[7]           = null;

  m_voffset[0]         = 0;
  m_voffset[1]         = 0;
  m_voffset[2]         = 0;
  m_voffset[3]         = 0;
  m_voffset[4]         = 0;
  m_voffset[5]         = 0;
  m_voffset[6]         = 0;
  m_voffset[7]         = 0;

  // ==============================================================
  // background display scaffolding
  // ==============================================================
  var outline_base = [
    [0.0,0.0],
    [1.0,0.0],
    [1.0,1.0],
    [0.0,1.0],
    [0.0,0.0]
  ];
  var outline;

  var xaxis_base = [
    [0.0,5.0/10.0,1.0,5.0/10.0], // channel 1
    [0.0,5.0/10.0,1.0,5.0/10.0]  // channel 2
  ];

  var xaxis;

  var vdiv_base  =  1.0/10.0;
  var vdiv;

  var mid_div_base = [0.0,5.0/10.0,1.0,5.0/10.0];
  var mid_div = [0,0,0,0];

  var hgrid_base = [
    [0.0,1.0/10.0,1.0,1.0/10.0],
    [0.0,2.0/10.0,1.0,2.0/10.0],
    [0.0,3.0/10.0,1.0,3.0/10.0],
    [0.0,4.0/10.0,1.0,4.0/10.0],
    [0.0,5.0/10.0,1.0,5.0/10.0],
    [0.0,6.0/10.0,1.0,6.0/10.0],
    [0.0,7.0/10.0,1.0,7.0/10.0],
    [0.0,8.0/10.0,1.0,8.0/10.0],
    [0.0,9.0/10.0,1.0,9.0/10.0],
  ];
	
  var hgrid;

  var vgrid_base = [
    [1.0/10.0,0.0,1.0/10.0,1.0],
    [2.0/10.0,0.0,2.0/10.0,1.0],
    [3.0/10.0,0.0,3.0/10.0,1.0],
    [4.0/10.0,0.0,4.0/10.0,1.0],
    [5.0/10.0,0.0,5.0/10.0,1.0],
    [6.0/10.0,0.0,6.0/10.0,1.0],
    [7.0/10.0,0.0,7.0/10.0,1.0],
    [8.0/10.0,0.0,8.0/10.0,1.0],
    [9.0/10.0,0.0,9.0/10.0,1.0]
  ];
  var vgrid;

  var cursor_base = [
    [0.0,0.0,0.0,1.0],  // 0 horizontal
    [0.0,0.0,0.0,1.0],  // 1 horizontal
    [0.0,0.0,1.0,0.0],  // 2 vertical
    [0.0,0.0,1.0,0.0],  // 3 vertical
  ];
  var m_cursor;

  var canvas_size = [
    {width:600,height:450},
    {width:400,height:300},
    {width:200,height:150}
  ];

  // responsive text size
  var text_size = [
      12,
      8,
      6
  ];

  function rescale(w,h) {
    // rescale horizontal divisions
    hgrid = hgrid_base.map(function (v) {
      var d = new Array(4);
      d[0] = v[0] * w;
      d[1] = v[1] * h;
      d[2] = v[2] * w;
      d[3] = v[3] * h;
      return d;
    });

    // rescale vertical division size
    vdiv = vdiv_base * h;

    // rescale vertical divisions
    vgrid = vgrid_base.map(function(v) {
      var d = new Array(4);
      d[0] = v[0] * w;
      d[1] = v[1] * h;
      d[2] = v[2] * w;
      d[3] = v[3] * h;
      return d;
    });

		// 2018.03. delete by jsk
    // scale channel axes
    xaxis = xaxis_base.map(function(v) {
      var d = new Array(4);
      d[0] = v[0] * w;
      d[1] = v[1] * h;
      d[2] = v[2] * w;
      d[3] = v[3] * h;
      return d;
    });

    // rescale outline
    outline = outline_base.map(function(v) {
      var d = [0,0];
      d[0] = v[0] * w;
      d[1] = v[1] * h;
      return d;
    });

    // rescale cursor
    m_cursor = cursor_base.map(function(v) {
      var d = new Array(4);
      d[0] = v[0] * w;
      d[1] = v[1] * h;
      d[2] = v[2] * w;
      d[3] = v[3] * h;
      return d;
    });

    // rescale mid divider
    mid_div[0] = mid_div_base[0] * w;
    mid_div[1] = mid_div_base[1] * h;
    mid_div[2] = mid_div_base[2] * w;
    mid_div[3] = mid_div_base[3] * h;
  }

  function clear(ctx,width,height) {
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,width,height);
  }

  function drawLine(ctx,line)  {
      ctx.beginPath();
      ctx.moveTo(line[0],line[1]);
      ctx.lineTo(line[2],line[3]);
      ctx.stroke();
  }

  function drawLines(ctx,lines) {
    lines.forEach(function(v) {
      drawLine(ctx,v);
    });
  }

  function drawPath(ctx,path) {
    ctx.beginPath();
    ctx.moveTo(path[0][0],path[0][1]);
    path.slice(1).forEach(function(v) {
      ctx.lineTo(v[0],v[1]);
    });
    ctx.stroke();
  }

  function drawBackground(ctx,width,height,voffset) {
    // clear background
    clear(ctx,width,height);

    // draw geometry with cartesian coordinates (0,0) lower left
    ctx.save();
    ctx.translate(0,height);
    ctx.scale(1.0,-1.0);

    // draw the outline
    ctx.save();
//    ctx.strokeStyle = 'gray';
    ctx.strokeStyle = 'black';
    ctx.lineWidth   = 6;
    drawPath(ctx,outline);
    ctx.restore();

    // draw the grid
    ctx.save();
//    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([1,1]);
    drawLines(ctx,hgrid);
    drawLines(ctx,vgrid);
    ctx.restore();

    // draw the x axes
    ctx.save();
    ctx.translate(0,voffset[0]);
    ctx.strokeStyle = "magenta";
    ctx.lineWidth   = 1;
    drawLine(ctx,xaxis[0]);
    ctx.restore();

    ctx.save();
    ctx.translate(0,voffset[1]);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth   = 1;
    drawLine(ctx,xaxis[1]);
    ctx.restore();

    // draw the cursors
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "blue";
    drawLine(ctx,m_cursor[0]);
    drawLine(ctx,m_cursor[2]);
    ctx.strokeStyle = "orange";
    drawLine(ctx,m_cursor[1]);
    drawLine(ctx,m_cursor[3]);
    ctx.restore();

    ctx.restore();
  }

  function drawAnnotations(ctx,width,height,dy)
  {

    var t;
    var y;

    ctx.font = dy.toFixed(0) + "px monospace";

	ctx.textAlign="left"; 
    ctx.fillStyle = "#01a9db";
    y = dy + 1;
//     ctx.fillText('sec/div     = ' + (mSecPerDiv*1.0).toFixed(3) + '     dS = ' + m_cursor_seconds.toFixed(4),2,y);
    y += dy + 1;
//    ctx.fillText('volts/div   = ' + m_volts_per_div.toFixed(4)   + '    dV = ' + m_cursor_volts.toFixed(4) ,2,y);
    y += dy + 22;
    ctx.fillText('10kg/cm*2	'  ,2,y);
    y += dy + 80;
    ctx.fillText('7.5',10,y);
    y += dy + 77;
    ctx.fillText('5.0',10,y);
    y += dy + 77;
    ctx.fillText('2.5',10,y);
    y += dy + 77;
    ctx.fillText('0.0',10,y);
    y += dy + 2;
    ctx.fillText('압력',10,y);


    y = dy + 1;
    y += dy + 1;
    ctx.fillStyle = "black";

    y += dy + 22;
    ctx.fillText('   0',80,y);
    y += dy + 80;
    ctx.fillText('- 25',80,y);
    y += dy + 77;
    ctx.fillText('- 50',80,y);
    y += dy + 77;
    ctx.fillText('- 75',80,y);
    y += dy + 77;
    ctx.fillText('-100',80,y);
    y += dy + 2;
    ctx.fillText('진공',80,y);

	ctx.textAlign="right"; 
    y = dy + 1;
    y += dy + 1;
    ctx.fillStyle = "green";

    y += dy + 22;
    ctx.fillText('200C',580,y);
    y += dy + 80;
    ctx.fillText('150C',580,y);
    y += dy + 77;
    ctx.fillText('100C',580,y);
    y += dy + 77;
    ctx.fillText(' 50C',580,y);
    y += dy + 77;
    ctx.fillText(' 0C',580,y);
    y += dy + 2;
    ctx.fillText('온도',580,y);

    ctx.lineWidth   = 4;
    t = (m_run) ? ("RUN : " + m_updates.toFixed(0)) : "STOP";
    ctx.fillStyle = (m_run) ? 'lime' : 'red';
    ctx.fillText(t,2,height-4);
  }

  function computeVerticalScale ( height , yscale){ 
	 //divide by 2 to make scale for signed value
    return height / yscale ;
  }

  function computeHorizontalScale(seconds,samples_per_second,width) {
    return width / (seconds * samples_per_second);
  }

  function drawTrace(fName,ctx,width,height) {

  var i;
    var hs = 600/36000;
	var tempOffset = [ 25, 1.25, 112.5, 112.5, 112.5, 112.5, 112.5, 112.5]; 
	var ys = [ 450/250, 450/12.5, 450/125, 450/125, 450/125, 450/125, 450/125, 450/125];
	var fStyle=["green","#2ECCFA","magenta","black","red","#FF8000","gray","purple"];

   var readText = fs.readFileSync(fName,'utf8');  
   var test = readText.split('\r\n');

    ctx.save();
    ctx.translate(0,height);
    ctx.scale(1.0,-1.0);

   test.forEach(function(element){
      // console.log(element);
      var dot = element.split('\t');
		if( ! isNaN(dot[0]) ){
			var i =1;
			dot.forEach(function(value){				
			   ctx.fillStyle = fStyle[i-1];
				if( ! isNaN( dot[i])) ctx.fillRect( dot[0]*1.0 * hs, ( dot[i]*1.0 + tempOffset[i-1]) * ys[i-1],1,1);    
				i++;
			});
		}			
   });
   
	ctx.restore();     
 
	}

  function onPaint(fName) {
    drawBackground(m_context,m_width,m_height,m_voffset);
	if(fName !== null) drawTrace(fName,m_context, m_width, m_height);
    drawAnnotations(m_context,m_width,m_height,m_text_size);
	 writeLegend(); 
  }

  function onSampleBits(bits) {
    switch(bits) {
    case 8:
      m_sample_bits = 8;
      m_yscale      = 128;
      break;
		case 10:
      m_sample_bits = 10;
      m_yscale      = 512;
      break;
    case 12:
      m_sample_bits = 12;
      m_yscale      = 2048;
      break;
    case 16:
      m_sample_bits = 16;
      m_yscale      = 32768;
      break;
    default:
      m_sample_bits = 16;
      m_yscale      = 32768;
      break;
    }
    onPaint(null);
  }

  function onVerticalOffset(channel,offset)
  {
    if ((offset < -4)||(4 < offset)) {
      return;
    }
    m_voffset[channel-1] = offset * vdiv;
    onPaint(null);
  }

  function onVoltsPerDiv(volts) {
    m_volts_per_div = volts;

    updateCursorDiff();
    onPaint(null);
  }

  function onSecondsPerDiv(seconds) {
    mSecPerDiv = seconds;

    updateCursorDiff();
    onPaint(null);
  }

  /**
   * event handler for samples per second
   * @param samples_per_second
   */
  function onSamplesPerSecond(samples_per_second) {
    // no zero or negative
    if (samples_per_second < Number.MIN_VALUE) {
      m_samples_per_second = 600;
    }
    else {
      // rate is in samples/second
      m_samples_per_second = samples_per_second;
    }
    onPaint(null);0.
  }

  /**
   * set voltage range (maximum volts per sample)
   * @param vrange
   */
  function onVoltageRange(vrange) {
    m_vrange = vrange;
    onPaint(null);
  }

  function updateCursorDiff() {
    // compute current cursor diff in seconds
    m_cursor_seconds = Math.abs(m_cursor[0][0] - m_cursor[1][0]) * (mSecPerDiv * 10.0 / m_width);
    m_cursor_volts   = Math.abs(m_cursor[2][1] - m_cursor[3][1]) * (m_volts_per_div   * 10.0 / m_height);
  }

  function onCursorMove(x,y) {
    var cursor = m_cursor[m_cursor_index];
    switch(m_cursor_index) {
    case 0:
    case 1:
      cursor[0] = x;
      cursor[2] = x;
      break;
    case 2:
    case 3:
      cursor[1] = m_height - y;
      cursor[3] = m_height - y;
      break;
    }

    updateCursorDiff();
    onPaint(null);
  }

  function onCursorSelect(index) {
    m_cursor_index = index;
  }

  function onRunStop(run) {
    m_run = run;
  }

	function writeTime(start, end){

	   m_context.fillStyle = "black";
		
		m_context.textAlign="left"; 
	   m_context.fillText(start,10,20);
		m_context.textAlign="right"; 
	   m_context.fillText(end,590,20);
	}

	function writeLegend( ){

		var x = 50;
		var delta_x = 70;

		m_context.textAlign="left"; 

	   m_context.fillStyle = "green";		
	   m_context.fillText('온도',x,40);
		
		x = x+ delta_x;
	   m_context.fillStyle = "#2ECCFA";		
	   m_context.fillText('압력',x,40);
		
		x = x+ delta_x;
	   m_context.fillStyle = "magenta";		
	   m_context.fillText('진공1',x,40);
		
		x = x+ delta_x;
	   m_context.fillStyle = "black";		
	   m_context.fillText('진공2',x,40);
		
		x = x+ delta_x;
	   m_context.fillStyle = "red";		
	   m_context.fillText('진공3',x,40);
		
		x = x+ delta_x;
	   m_context.fillStyle = "#FF8000";		
	   m_context.fillText('진공4',x,40);
		
		x = x+ delta_x;
	   m_context.fillStyle = "darkgray";		
	   m_context.fillText('진공5',x,40);				

		x = x+ delta_x;
	   m_context.fillStyle = "purple";		
	   m_context.fillText('진공6',x,40);				
	}

function onResize(canvas) {

    m_text_size = 12; // getTextSize(size.width);

    m_canvas = canvas;
    m_width  = m_canvas.width  = 600;
    m_height = m_canvas.height = 450;
    m_h2     = m_height / 2;
    rescale(m_width,m_height);
    onPaint(null);
  }
  function onInit(canvas) {
    m_canvas  = canvas;
    m_context = m_canvas.getContext("2d");
    onResize(canvas);
    onPaint(null);
 }

  return {
	init						: onInit,
	onResize				:onResize,
    onPaint            : onPaint,
    onSampleBits       : onSampleBits,
    onVoltsPerDiv      : onVoltsPerDiv,
    onSecondsPerDiv    : onSecondsPerDiv,
    onSamplesPerSecond : onSamplesPerSecond,
    onVoltageRange     : onVoltageRange,
    onVerticalOffset   : onVerticalOffset,
    onCursorMove       : onCursorMove,
    onCursorSelect     : onCursorSelect,
    onRunStop          : onRunStop,
	 writeTime			  : writeTime 
  };

})();


