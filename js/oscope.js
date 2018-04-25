var oscope = (function() {

  var m_canvas;
  var m_context;
  var m_width;
  var m_height;
  var m_h2;
  var m_trace = [];
  var m_voffset = [];

  var mSecPerDiv		  		 = 0.100;
  var m_samples_per_second = 450;
  var m_divisions          = 10;
  var m_yscale             = 250;
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

  m_trace[0] = null;
  m_trace[1] = null;
  m_trace[2] = null;
  m_trace[3] = null;

  m_voffset[0]         = 0;
  m_voffset[1]         = 0;
  m_voffset[2]         = 0;
  m_voffset[3]         = 0;

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

  var mid_div_base = [
    0.0,5.0/10.0,1.0,5.0/10.0
  ];

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
    [0.0,9.0/10.0,1.0,9.0/10.0]
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
    [0.0,0.0,1.0,0.0]  // 3 vertical
  ];

	var m_cursor;

  var canvas_size = [
    {width:450,height:250},
    {width:400,height:200},
    {width:200,height:150}
  ];

  // responsive text size
  var text_size = [
      12,
      8,
      6
  ];

  function getCanvasSize(window_height,parent_width,parent_height) {

    var r;

    if (window_height > parent_height) {
      parent_height = window_height;
    }

    var s = canvas_size.filter(function(v) {
      return ((v.width < parent_width)&&(v.height < parent_height));
    });

    // if nothing matches
    if (s.length <= 0) {
      // use the smallest
      r = s[2];
    }
    else {
      // use first fit
      r = s[0];
    }

    return r;
  }

  function getTextSize(width) {
    var s;

    s = canvas_size.reduce(function(p,v,i) {
      return (width <= v.width) ? text_size[i] : p;
    },text_size[2]);

    return s;
  }

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
    ctx.fillStyle = "black";
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
    ctx.strokeStyle = 'gray';
    ctx.lineWidth   = 6;
    drawPath(ctx,outline);
    ctx.restore();

    // draw the grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
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
    y += dy + 1;
    y += dy + 22;
    ctx.fillText('10kg/cm*2'  ,2,y);
    y += dy + 30;
    ctx.fillText('7.5',10,y);
    y += dy + 30;
    ctx.fillText('5.0',10,y);
    y += dy + 30;
    ctx.fillText('2.5',10,y);
    y += dy + 30;
    ctx.fillText('0.0',10,y);
    y += dy + 2;
    ctx.fillText('압력',10,y);


    y = dy + 1;
    y += dy + 1;
    ctx.fillStyle = "white";

    y += dy + 22;
    ctx.fillText('   0',80,y);
    y += dy + 30;
    ctx.fillText('- 25',80,y);
    y += dy + 30;
    ctx.fillText('- 50',80,y);
    y += dy + 30;
    ctx.fillText('- 75',80,y);
    y += dy + 30;
    ctx.fillText('-100',80,y);
    y += dy + 2;
    ctx.fillText('진공',80,y);

	ctx.textAlign="right"; 
    y = dy + 1;
    y += dy + 1;
    ctx.fillStyle = "yellow";

    y += dy + 22;
    ctx.fillText('200C',400,y);
    y += dy + 30;
    ctx.fillText('150C',400,y);
    y += dy + 30;
    ctx.fillText('100C',400,y);
    y += dy + 30;
    ctx.fillText(' 50C',400,y);
    y += dy + 30;
    ctx.fillText('  0C',400,y);
    y += dy + 2;
    ctx.fillText('온도',400,y);

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

  function drawTrace(ctx,trace,width,height,voffset) {
		var	tempOffset = 0;
    var t = [];
    var ys;
    var hs;
    var i;

    hs = computeHorizontalScale(mSecPerDiv*m_divisions,m_samples_per_second,m_width);

    ctx.save();
    ctx.translate(0,height);
    ctx.scale(1.0,-1.0);

    // set channel parameters
    switch(trace.channel) {
    case 0:
		tempOffset = 0;
	    ys = 1;
      ctx.strokeStyle = "yellow";
      break;

    case 1:
			tempOffset = 10;
	    ys = 1; 
      ctx.strokeStyle = "#2ECCFA";
      break;

    case 2:
			tempOffset = 1;
	    ys = 1 ; 
      ctx.strokeStyle = "magenta";
      break;

    case 3:
			tempOffset = 15;
	    ys = 1; 
      ctx.strokeStyle = "white";
      break;
	}

    for(i=0;i<trace.length;++i) {
      t.push([i*hs,((trace.sample[i])*1+tempOffset) * ys]);
    }

    // draw it
    drawPath(ctx,t);
    
    ctx.restore();    
    // restore context
  }

  function onPaint(trace) {
    // draw oscope background
    drawBackground(m_context,m_width,m_height,m_voffset);

    // update trace if running and there is a new trace
    if (m_run & (trace !== null)) {
      // count updates
      m_updates++;
      // store the trace by channel
//      m_trace[trace.channel] = trace;
      m_trace[0] = trace[0];
      m_trace[1] = trace[1];
      m_trace[2] = trace[2];
      m_trace[3] = trace[3];
    }

    // draw last traces
    if (m_trace[0] !== null) {
      drawTrace(m_context, m_trace[0], m_width, m_height, m_voffset[0]);
    }
    if (m_trace[1] !== null) {
      drawTrace(m_context, m_trace[1], m_width, m_height, m_voffset[1]);
    }
    if (m_trace[2] !== null) {
      drawTrace(m_context, m_trace[2], m_width, m_height, m_voffset[2]);
    }
    if (m_trace[3] !== null) {
      drawTrace(m_context, m_trace[3], m_width, m_height, m_voffset[3]);
    }

    // draw text annotations
    drawAnnotations(m_context,m_width,m_height,m_text_size);
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
    onPaint(null);
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

  function onResize() {
    var parent = $("#oscope-parent");
    var size = getCanvasSize($(window).height(),parent.width(),parent.height());
    m_text_size = getTextSize(size.width);
    m_canvas = $("#oscope")[0];
    m_width  = m_canvas.width  = size.width;
    m_height = m_canvas.height = size.height;
    m_h2     = m_height / 2;
    rescale(m_width,m_height);
    onPaint(null);
  }

  function onInit() {
    m_canvas  = $("#oscope")[0];
    m_context = m_canvas.getContext("2d");
    // attach resize event
    $(window).resize(onResize);
    onResize();
    onPaint(null);
  }

  return {
    init               : onInit,
    onResize           : onResize,
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
  };

})();
