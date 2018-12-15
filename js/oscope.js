const GRAPH_MAX_COUNT= 3 * 60 * 60; // 1 hour count

var oscope = (function() {
  var m_canvas;
  var m_context;
  var m_width = 900;
  var m_height = 200;
  var m_h2;
  var m_voffset = [];
  // these must match the initial values of the controls
  // doh! no two way data bindind
  var mSecPerDiv		  		 = 0.100;
  var m_samples_per_second = 1000;
  var m_divisions          = 10;
  var m_yscale             = 512;
  var m_sample_bits        = 10;
  var m_volts_per_div      = 5;
  var m_vrange             = 5;
  var m_run                = true;
  var m_size_index         = 0;
  var m_text_size          = 12;
  var m_updates            = 0;

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
    [0.0,9.0/10.0,1.0,9.0/10.0],
  ];var hgrid;

  var vgrid_base = [
    [ 1.0/12.0,0.0, 1.0/12.0,1.0],
    [ 2.0/12.0,0.0, 2.0/12.0,1.0],
    [ 3.0/12.0,0.0, 3.0/12.0,1.0],
    [ 4.0/12.0,0.0, 4.0/12.0,1.0],
    [ 5.0/12.0,0.0, 5.0/12.0,1.0],
    [ 6.0/12.0,0.0, 6.0/12.0,1.0],
    [ 7.0/12.0,0.0, 7.0/12.0,1.0],
    [ 8.0/12.0,0.0, 8.0/12.0,1.0],
    [ 9.0/12.0,0.0, 9.0/12.0,1.0],
    [10.0/12.0,0.0,10.0/12.0,1.0],
    [11.0/12.0,0.0,11.0/12.0,1.0]
  ];
  var vgrid;

  var text_size = [ 12, 8, 6 ];

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
    ctx.strokeStyle = 'darkgray';
    ctx.lineWidth   = 6;
    drawPath(ctx,outline);
    ctx.restore();

    // draw the grid
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,1.0)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([1,1]);
    drawLines(ctx,hgrid);
    drawLines(ctx,vgrid);
    ctx.restore();
  }

  function drawAnnotations(ctx,width,height,dy)
  {

	const T_SITE=10;
	const V_SITE=880;
	const P_SITE=800;

    var t;
    var y;
	var delta = 40;
	var dy_offset = 20;


    ctx.font = dy.toFixed(0) + "px monospace";

    y = dy_offset;
	ctx.textAlign="right"; 
    ctx.fillStyle = "green";
    ctx.fillText('10kg/cm*2	'  , P_SITE,y);
    y += delta;
    ctx.fillText('7.5', P_SITE,y);
    y += delta;
    ctx.fillText('5.0', P_SITE,y);
    y += delta;
    ctx.fillText('2.5', P_SITE,y);
    y += delta;
    ctx.fillText('0.0', P_SITE,y);
    y += 12;
    ctx.fillText('압력', P_SITE,y);


    y = dy_offset;
    ctx.fillStyle = "blue";

    ctx.fillText('   0',V_SITE,y);
    y += delta;
    ctx.fillText('- 25',V_SITE,y);
    y += delta;
    ctx.fillText('- 50',V_SITE,y);
    y += delta;
    ctx.fillText('- 75',V_SITE,y);
    y += delta;
    ctx.fillText('-100',V_SITE,y);
    y += 12;
    ctx.fillText('진공',V_SITE,y);

    y = dy_offset;

	ctx.textAlign="left"; 
    ctx.fillStyle = "black";
    ctx.fillText('3시간화면',T_SITE+70,y);

    ctx.fillStyle = "red";
    ctx.fillText('200C',T_SITE,y);
    y += delta;
    ctx.fillText('150C',T_SITE,y);
    y += delta;
    ctx.fillText('100C',T_SITE,y);
    y += delta;
    ctx.fillText(' 50C',T_SITE,y);
    y += delta;
    ctx.fillText('  0C',T_SITE,y);
    y += 12;
    ctx.fillText('온도',T_SITE,y);

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

  function onPaint(trace) {
    drawBackground(m_context,m_width,m_height,m_voffset);
    drawAnnotations(m_context,m_width,m_height,m_text_size);
	 writeLegend(); 
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
      m_samples_per_second = 1000;
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

  function onResize() {
    var parent = $("#oscope-parent");

    m_text_size = 12;

    m_canvas = $("#oscope")[0];

    m_canvas.width  = m_width;
    m_canvas.height = m_height;

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

	function drawDot(gCount, chData){
		try{
			var hs = 900 / GRAPH_MAX_COUNT;
			var ctx = m_context;
			var i;

			var tempOffset = [ 25, 1.25, 112.5, 112.5, 112.5, 112.5, 112.5, 112.5]; 
   		var ys = [ 200/250, 200/12.5, 200/125, 200/125, 200/125, 200/125, 200/125, 200/125];
   		var fStyle=["red","green","aquamarine","black","blue","cyan","darkgray","aqua"];

			for(i = 0; i < 8 ; i ++){
	      	ctx.fillStyle = fStyle[i];
   	   	ctx.fillRect( gCount * hs, 200 - ( chData[i] * 1.0 + tempOffset[i]) * ys[i],2,2);    
			}
		} catch ( err ){
			alert("err oscope.drawDot()");
		}
	}

  function writeTime(start, end){
		try{
      	m_context.textAlign="left"; 
      	m_context.fillStyle = "white";
  	   	m_context.fillRect( 150,10,300,10);    
      	m_context.fillStyle = "black";
      	m_context.fillText(start,150,20);
      	m_context.textAlign="right"; 
      	m_context.fillStyle = "white";
  	   	m_context.fillRect( 450,10,300,10);    
       	m_context.fillStyle = "black";
	     	m_context.fillText(end,690,20);
		} catch(err){
			alert("err oscope.writeTime()");
		}
   }

   function writeLegend( ){
		try{
		const Y_OFFSET = 195;
      const DELTA_X = 70;
      var x = 180;

      m_context.textAlign="left"; 

      m_context.fillStyle = "red";      
      m_context.fillText('온도',x,Y_OFFSET);
      
      x = x+ DELTA_X;
      m_context.fillStyle = "green";    
      m_context.fillText('압력',x,Y_OFFSET);
      
      x = x+ DELTA_X;
      m_context.fillStyle = "aquamarine";    
      m_context.fillText('진공1',x,Y_OFFSET);
      
      x = x+ DELTA_X;
      m_context.fillStyle = "black";      
      m_context.fillText('진공2',x,Y_OFFSET);
      
      x = x+ DELTA_X;
      m_context.fillStyle = "blue";     
      m_context.fillText('진공3',x,Y_OFFSET);
      
      x = x+ DELTA_X;
      m_context.fillStyle = "cyan";    
      m_context.fillText('진공4',x,Y_OFFSET);

      x = x+ DELTA_X;
      m_context.fillStyle = "darkgray";      
      m_context.fillText('진공5',x,Y_OFFSET);            

      x = x+ DELTA_X;
      m_context.fillStyle = "aqua";     
      m_context.fillText('진공6',x,Y_OFFSET);            


		} catch(err){
			alert("err oscope.writeLegend()");
		}	
   }

  return {
    init               : onInit,
    onResize           : onResize,
    onPaint            : onPaint,
    onVoltsPerDiv      : onVoltsPerDiv,
    onSecondsPerDiv    : onSecondsPerDiv,
    onSamplesPerSecond : onSamplesPerSecond,
    onVoltageRange     : onVoltageRange,
	 drawDot				  : drawDot,
	 writeTime			: writeTime
  };

})();


