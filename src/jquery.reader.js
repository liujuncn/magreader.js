/**
 * Boguan jQuery reader plugin file.
 * 
 * @algorithm design: Liu Jun <junliu44@gmail.com>
 * @author Chunyou Zhao <snowtigersoft@126.com>
 * @version $Id: jquery.reader.js 2011-12-26 11:11 AM $
 */
;(function($) {

$.extend({
	reader : {
	    settings : {
	      id: 'reader',
	      width: 910,
	      height: 520,
	      dataUrl: '', //fetch data url
	      dataFetch: 20,
	      adUrl: '', //fetch ad url
	      hardAdFrequency: 3,//平均3次出一次
	      softAdFrequency: 3,//平均3次出一次
	      cover: '',
	      minW: 225,
	      minH: 40,
	      borderW: 10,
	      borderH: 10,
	      minArea: 0.6, //区块填充最小程度
	      usePage: false, //true时，使用page翻页
	      debug: true,
	      scale: [[{"dir":0,"scale":0.5}, {"dir":0,"scale":1/3}, {"dir":0,"scale":2/3}],
	      		  [{"dir":1,"scale":0.5}, {"dir":1,"scale":1/3}, {"dir":1,"scale":2/3}],
	      		  [{"dir":0,"scale":0.5}, {"dir":0,"scale":1/3}, {"dir":0,"scale":2/3}, {"dir":1,"scale":0.5}, {"dir":1,"scale":1/3}, {"dir":1,"scale":2/3}]]
	    },
	    _elm : null,
	    _v_text_elm : null,
	    _h_text_elm : null,
	    _data: [],
	    _max_page: 0,
	    _next_page: 1,
	    init: function( elm, opts ){
	    	this._elm = $(elm);
	    	$.extend(this.settings,opts);
	    	if(!this._elm.is("div") || this.settings.dataUrl == ''){
	    		return false;
	    	}
	    	this._elm.removeData(this.settings.id);
	    	this._elm.data(this.settings.id, []);
	    	this._data = [];
	    	this._max_page = 9999;
	    	this._next_page = 1;
	    	this._elm.empty().width(this.settings.width).height(this.settings.height).addClass("reader-container");
	    	var offset = this._elm.offset();
	    	this.settings.cover = $("<div></div>");
	    	this.settings.cover.width(942)
	    		.height(522)
	    		.addClass("reader-loading-overlay")
	    		.css({'left':0, 'top':0})
	    		.insertAfter(this._elm)
	    		.hide();
	    		if($.browser.msie && $.browser.version == 6.0 ){
	    			this.settings.cover.css("left",-912);
	    		}
	    	this._v_text_elm = $("<div></div>");
	    	this._v_text_elm.addClass("reader-text-calc").addClass("reader-text-calc-v").hide().appendTo($("body"));
	    	this._h_text_elm = $("<div></div>");
	    	this._h_text_elm.addClass("reader-text-calc").hide().appendTo($("body"));
	    	return this;
	    },
	    setUrl: function( dataUrl, adUrl ){
	    	this.settings.dataUrl = dataUrl;
	    	this.settings.adUrl = adUrl;
	    },
	    // load page content
	    page: function( page, callback ){
	    	if(page < 1)
	    		page = 1;
	    	var $this = this;
	    	this.loading(true);
	    	var cacheData = this._elm.data(this.settings.id);
	    	if(typeof(cacheData[page]) === 'undefined'){
	    		//缓存数据条数不够
	    		if(this._data.length < this.settings.dataFetch && this._max_page >= this._next_page){
	    			var data = {count:this.settings.dataFetch};
	    			if(this.settings.usePage){
	    				data.page = this._next_page;
	    			}else{
	    				data.start_id = this._data.length == 0?'':this._data[this._data.length - 1].id;
	    			}
			    	$.ajax({
			    		type: "GET",
			    		url: this.settings.dataUrl,
			    		data: data,
			    		dataType: "json",
			    		success: function(data){
			    			if($this.settings.usePage){
			    				$this._next_page += 1;
			    				$this._max_page = Math.ceil(data.count/$this.settings.dataFetch); //count为总条数
			    				data = data.publish;//publish为内容数组
			    			}
			    			//loading images
			    			for(var i in data){
			    				if(data[i].thumbnail_pic != ''){
			    					var myImg=new Image();
	    							myImg.setAttribute("src",data[i].thumbnail_pic);
			    				}
			    			}
			    			$.merge($this._data, data);
			    			var content = $this.dealWithData();
			    			cacheData[page] = content;
			    			$this._elm.data($this.settings.id, cacheData);
			    			$this.showContent(content);
			    			if(callback)
								callback.apply({has_next:$this._data.length > 0, success:true});
			    		},
			    		error: function(xhr, textStatus, errorThrown){
			    			$.reader.loading(false);
			    			if(callback)
								callback.apply({success:false});
			    		}
			    	});
		    	}else{
		    		var content = this.dealWithData();
			    	cacheData[page] = content;
			    	this._elm.data(this.settings.id, cacheData);
			    	this.showContent(content);
			    	if(callback)
						callback.apply({has_next:this._data.length > 0, success:true});
		    	}
	    	}else{
	    		var content = cacheData[page];
	    		this.showContent(content);
	    		if(callback)
					callback.apply({has_next:(this._data.length > 0 || page<_max_page), success:true});
	    	}
	    },
	    loading: function(show){
	    	if(show){
	    		this.settings.cover.show();
	    	}else{
	    		this.settings.cover.hide();
	    	}
	    },
	    showContent: function( content ){
	    	if(content.has)
	    		this._elm.empty().append(content.html);
	    	$.reader.loading(false);
	    },
	    dealWithData: function(){
	    	var result = {has:false, html:""};
	    	var time = {"start":new Date().getTime()};
	    	if(this._data.length > 0){
	    		result.has = true;
	    		var continer = $("<div></div>");
	    		var layout = this.clip(this.settings.width, this.settings.height, 0);
	    		if(this.settings.debug)
	    			console.dir(layout);
	    		this.adjustLayout(layout);
	    		result.html = this.renderLayout(continer, layout).html();
	    	}
	    	time.end = new Date().getTime();
	    	time.cost = time.end - time.start;
	    	if(this.settings.debug)
	    		console.dir(time);//print for debug
	    	return result;
	    },
	    adjustLayout: function(layout, cell){
	    	if(typeof(cell) == "undefined"){
	    		cell = this.adjustLayout(layout, {"text":[], "img":[]});
	    		
	    		cell.text.sort(function(a,b){return a.data.cell>b.data.cell});//文字区块按照填充程度升序
	    		cell.img.sort(function(a,b){return a.width*a.height>b.width*b.height});//图片区块按照面积升序
	    		
	    		if(this.settings.debug)
	    			console.dir(cell);
	    		
	    		//如果没有图或者没有文字，直接返回
	    		if(cell.text.length ==0 || cell.img.length == 0)
	    			return layout;
	    			
	    		//计算交换，交换条件： 图的区块比文字区块小 and 图的cell比文字cell大，交换后图片与文字效果整体有改善
	    		for(var i in cell.text){
	    			if(cell.text[i].data.cell < this.settings.minArea){
	    				for(var j in cell.img){
		    				if(cell.text[i].data.cell < cell.img[j].data.cell && cell.text.width * cell.text.height > cell.img.width * cell.img.height){
		    					var icell = this.fitCell(cell.img[j].data, cell.text[i].width, cell.text[i].height);//计算图片的新效果
		    					var tcell = this.fitCell(cell.text[i].data, cell.img[j].width, cell.img[j].height);//计算text的新效果
		    					if(Math.abs(cell.text[i].data.cell-cell.img[j].data.cell) > Math.abs(tcell-icell)){
		    						cell.text[i].data.cell = tcell;
		    						cell.img[j].data.cell = icell;
		    						cell.img[j].width = cell.text[i].width;
		    						cell.img[j].height = cell.text[i].height;
		    						layout = this.repalceData(layout, cell.text[i].data, cell.img[j].data);
		    						layout = this.repalceData(layout, cell.img[j].data, cell.text[i].data);
		    						cell.img.sort(function(a,b){return a.width*a.height>b.width*b.height});//图片区块按照面积升序
		    						break;
		    					}
		    				}
	    				}
	    			}else{
	    				break;
	    			}
	    		}
	    		
	    		return layout;
	    	}else{
	    		if(layout.isCell){
	    			if(layout.data.thumbnail_pic == "")
	    				cell.text.push(layout);
	    			else
	    				cell.img.push(layout);
	    			return cell;
	    		}else{
	    			var a = this.adjustLayout(layout.a.child, {"text":[], "img":[]});
	    			var b = this.adjustLayout(layout.b.child, {"text":[], "img":[]});
	    			$.merge(cell.text, a.text);
	    			$.merge(cell.text, b.text);
	    			$.merge(cell.img, a.img);
	    			$.merge(cell.img, b.img);
	    			return cell;
	    		}
	    	}
	    },
	    repalceData: function(layout, search, data){
	    	if(layout.isCell){
	    		if(layout.data.id == search.id){
	    			layout.data = data;
	    		}
	    	}else{
	    		layout.a.child = this.repalceData(layout.a.child, search, data);
	    		layout.b.child = this.repalceData(layout.b.child, search, data);
	    	}
	    	return layout;
	    },
	    renderLayout: function(continer, layout){
	    	if(layout.isCell){
	    		continer.append(this.renderCell(layout.data, layout.width, layout.height));
	    	}else{
	    		var a = $("<div></div>");
	    		var b = $("<div></div>");
	    		
	    		b.width(layout.b.width).height(layout.b.height).css({'float':'left'});
	    		
	    		if(layout.dir == 0){
	    			a.width(layout.a.width).height(layout.a.height).css({'float':'left',"border-right":"1px #d3d3d3 solid"});
	    		}else{
	    			a.width(layout.a.width).height(layout.a.height).css({'float':'left',"border-bottom":"1px #d3d3d3 solid"});
	    		}
	    		
	    		continer.append(this.renderLayout(a, layout.a.child));
	    		continer.append(this.renderLayout(b, layout.b.child));
	    	}
	    	return continer;
	    },
	    renderCell: function(data, width, height){
	    	var $this = this;
	    	var img = function(){
	    		var realW = width - 2 * $this.settings.borderW;
    			var realH = height - 2 * $this.settings.borderH - $this.settings.minH;
    			var area = {};
    			
    			var outer = $("<div></div>")
    			outer.addClass("reader-content").width(realW).height(realH).attr("sid",data.id);
    			if($this.settings.debug)
    				outer.attr("title","w:"+realW+",h:"+realH+",cell:"+data.cell);
    			if(data.thumbnail_pic != ""){
    				area = $this.contentArea(data.thumbnail_pic, data.text, realW, realH);
	    			
	    			if(area != false){
	    				var imgDiv = $("<div></div>");
		    			imgDiv.addClass("mimg"); //TODO add event
		    			imgDiv.width(area.img.width).height(area.img.height).css({"text-align":"center"});
		    			if(area.img.use == 'w'){
		    				imgDiv.append("<img src=\""+(area.img.thumbs?data.thumbnail_pic:data.bmiddle_pic)+"\" style=\"width:"+area.img.width+"px\"/>");
		    			}else{
		    				imgDiv.append("<img src=\""+(area.img.thumbs?data.thumbnail_pic:data.bmiddle_pic)+"\" style=\"height:"+area.img.height+"px\"/>");
		    			}
		    			if($this.settings.debug)
		    				imgDiv.attr("title","Use:"+area.img.use+",aUse:"+area.img.ause+" \nBlock w:"+area.img.width+",Block h:"+area.img.height+"\nimage w:"+area.img.w+",image h:"+area.img.h+"\nttxt w:"+area.text.width+",text h:"+area.text.height+"\ntotal w:"+area.total.width+",total h:"+area.total.height);
		    			//if(Math.random() > 0.5)
		    				//imgDiv.css({"float":"right"});
		    			outer.append(imgDiv);
	    			}
    			}
    			
    			outer.append(data.text);
    			
    			return outer;
	    	}
	    	var header = function(){
	    		var head = $("<div></div>");
	    		head.addClass("mhead").height($this.settings.minH);
	    		head.append('<div class="mhead_left"><img width="36" height="36" src="'+data.avatar+'"/></div>');
	    		var right = $('<div class="mhead_right"></div>');
	    		right.append(
	    			'<div class="mhead_right_name">'+data.screen_name+(data.thumbnail_pic != '')+
	    			'</div><span class="mhead_right_time">'+data.created_at+
	    			'</span><span class="mhead_right_site"><em class="icon_'+data.site+'"></em></span>'
	    		).width(width - 2 * $this.settings.borderW - 44);
	    		head.append(right);
	    		//data.screen_name+"("+(data.thumbnail_pic != '')+")"
	    		
	    		return head;
	    	}
	    	
	    	var cell = $("<div></div>");
	    	cell.addClass("reader-cell")
	    		.width(width - 2 * this.settings.borderW)
	    		.height(height - 2 * this.settings.borderH)
	    		.append(header)
	    		.append(img);
	    	return cell;
	    },
	    textArea: function(text, width, height){
	    	if(width > 0){
	    		this._h_text_elm.html(text).width(width);
		    	return {width: width, height: this._h_text_elm.height() + this.settings.borderH * 3};
	    	}else{
	    		this._v_text_elm.html(text).height(height);
	    		return {width: this._v_text_elm.width() + this.settings.borderW * 3, height: height};
	    	}
	    },
	    contentArea: function(img, text, width, height){
	    	var area = {img:{width:width,height:height,thumbs:true},text:{width:0,height:0},total:{width:width,height:height}};
	    	
	    	var myImg=new Image();//定义图像对象，获取宽高
	    	myImg.setAttribute("src",img);
	    	var W=myImg.width;
    		var H=myImg.height;
    		
    		//预先检测文字排版
    		area.text = this.textArea(text, 0, height);
    		
    		//纵版
    		if(W/H > width/height || W == 0 || area.text.width - this.settings.borderW < 50){
    			area.img.ause = 'w';
    			if(W == 0){
    				W = 120;
    				H = 90;
    			}
    			area.text = this.textArea(text, width);
    			var iw = (W<120 && H<120)?W:width;
    			area.img.width = iw;
    			var ih = Math.floor((iw/W) * H);
    			var mh = height - area.text.height;
    			area.img.height = ih<mh?ih:mh;
    			if(area.img.height<60  || (area.img.height < 90 && mh < ih))
    				return false;
    			
    			//gif 图片不剪裁, 裁剪程度超过3/4的不剪裁
    			if((mh<ih && img.substring(img.length-4).toLowerCase() == ".gif") || (mh/ih < 3/4 && W/H > 3/4)){
    				var nh = Math.floor(Math.sqrt(area.img.height * area.img.width * H / W));
    				if(nh > height)
    					nh = height;
    				var nw = Math.floor(area.img.height * area.img.width / nh);
    				var inw = H*nh/W;
    				nw = nw<inw?nw:inw;
    				if( nw > width * 0.7 - this.settings.borderW){
    					nw = width;
    					nh = area.img.height;
    					area.img.use = 'h'; //图片在上面居中排列
    				}
    				area.img.width = nw;
    				area.img.height = nh;
    			}
    				
    			area.total.height = (area.img.height * area.img.width + area.text.height * area.text.width)/width;
    			area.text.height = height - area.img.height;
    			
    			if(W < area.img.width || H < area.img.height)
    				area.img.thumbs = false;
    		}else{
    			area.img.ause = 'h';
    			var ih = (W<120 && H<120)?H:height;
    			area.img.height = ih;
    			var iw = Math.floor((ih/H) * W);
    			if(iw < 60){
    				iw = Math.floor(width * 0.45);
    				area.img.use = 'w';
    			}
    			var mw = width - area.text.width;
    			area.img.width = iw<mw?iw:mw;
    			if(area.img.width<60  || (area.img.width < 90 && mw < ((ih/H) * W)))
    				return false;
    			
    			//gif 图片不剪裁, 裁剪程度超过3/4的不剪裁
    			if((mw<((ih/H) * W) && img.substring(img.length-4).toLowerCase() == ".gif") || mw/((ih/H) * W) < 3/4){
    				var nw = Math.floor(Math.sqrt(area.img.height * area.img.width * W / H));
    				if(nw > width)
    					nw = width;
    				var nh = Math.floor(area.img.height * area.img.width / nw);
    				var inh = H*nw/W;
    				if( nw > width * 0.7 - this.settings.borderW){
    					nw = width;
    					nh = Math.floor(area.img.height * area.img.width / nw);
    					inh = H*nw/W;
    				}
    				area.img.width = nw;
    				area.img.height = nh<inh?nh:inh;
    			}

    			area.total.width = (area.img.height * area.img.width + area.text.height * area.text.width)/height;
    			area.text.width = width - area.img.width;
    			
    			if(H < area.img.height || W < area.img.width)
    				area.img.thumbs = false;
    		}
    		
    		if(typeof(area.img.use) == 'undefined'){
	    		if((W == 120 && H == 90) ||area.img.width/area.img.height > W/H){
	    			area.img.use = 'w';
	    		}else{
	    			area.img.use = 'h';
	    		}
    		}
    		area.img.w = W;
    		area.img.h = H;
    		
    		return area;
	    },
	    fitCell: function(data, width, height){
	    	if(data.thumbnail_pic == ""){
		    	var a = this.textArea(data.text, width);
		    	if(a.height / height > 1)
		    		return -1;
				return a.height / height;
		   	}else{
		    	var a = this.contentArea(data.thumbnail_pic, data.text, width, height);
		    	if(a == false){
		    		return -1;
		    	}else{
		    		if(a.total.width == width){
		    			return a.total.height / height;
		    		}else{
		    			return a.total.width / width;
		    		}
		    	}
			}
	    },
	    clip: function(width, height, level, data){
	    	if(this.settings.scale.length <= level){
	    		return {isCell:true,width: width, height: height, data:data};
	    	}
	    	if(this._data.length == 1 && typeof(data) == 'undefined'){
	    		return {isCell:true,width: width, height: height, data:this._data.pop()};
	    	}
	    	var scales = this.settings.scale[level].slice(0);
	    	scales.sort(function(){return Math.random()>0.5?-1:1;})//乱序
	    	if(width > 2*height){
	    		var scale = 0;
	    		for(scale = 0; scale < scales.length; scale += 1){
	    			if(scales[scale].dir == 1){
	    				scales.splice(scale,1);
	    				scale -= 1;
	    			}
	    		}
	    	}else if(width*2 < height){
	    		var scale = 0;
	    		for(scale = 0; scale < scales.length; scale += 1){
	    			if(scales[scale].dir == 0){
	    				scales.splice(scale,1);
	    				scale -= 1;
	    			}
	    		}
	    	}
	    	
	    	var nw = width;
	    	var nwb = width;
	    	var nh = height;
	    	var nhb = height;
	    	var s  = false;
	    	var dir = 0;
	    	if(typeof(data) == 'undefined')
	    		data = this._data.shift();
	    	
	    	var baseline = this.fitCell(data, width, height);
	    	baseline = (baseline == -1)?1:(((width == this.settings.width && height == this.settings.height) ||  baseline< 0.7)?0:0.8);
	    	
	    	var childa = {w:width, h:height, data:data};
	    	var childb = {w:width, h:height, data:this._data.shift()};
	    	
		   	for(var scale in scales){
		    	nw = nwb = width;
			   	nh = nhb = height;
			   	dir = scales[scale].dir;
			   	//纵切
			   	if(scales[scale].dir == 0){
			   		if(Math.random()>baseline){
			    		nw = Math.floor(width * scales[scale].scale);
			    		nwb = width - nw - 1;
			    		if((nw + 2 * this.settings.borderW)  > this.settings.minW && (nwb + 2 * this.settings.borderW) > this.settings.minW){
				    		var realW = nw - 2 * this.settings.borderW;
				    		var realWb = nwb - 2 * this.settings.borderW;
		    				var realH = nh - 2 * this.settings.borderH - this.settings.minH;
		    				var fc1=0,fc2=0,fc3=0,fc4=0;
		    				fc1 = this.fitCell(childa.data, realW, realH);
		    				if(fc1 > 0)
		    					fc2 = this.fitCell(childb.data, realWb, realH);
		    				fc3 = this.fitCell(childa.data, realWb, realH);
		    				if(fc3 > 0)
		    					fc4 = this.fitCell(childb.data, realW, realH);
		    					
		    				if(fc1 > 0 && fc2 > 0 && fc3 > 0 && fc4 > 0){
		    					if(Math.abs(fc1-fc2) < Math.abs(fc3-fc4)){
		    						childa.w = nw;
			    					childa.data.cell = fc1;
			    					childb.w = nwb;
			    					childb.data.cell = fc2;
		    					}else{
		    						childa.w = nwb;
			    					childa.data.cell = fc3;
			    					childb.w = nw;
			    					childb.data.cell = fc4;
		    					}
		    					s = true;
			    				break;
		    				}else if(fc1 > 0 && fc2 > 0){
		    					childa.w = nw;
			    				childa.data.cell = fc1;
			    				childb.w = nwb;
			    				childb.data.cell = fc2;
		    					s = true;
			    				break;
		    				}else if(fc3 > 0 && fc4 > 0){
		    					childa.w = nwb;
		    					childa.data.cell = fc3;
		    					childb.w = nw;
		    					childb.data.cell = fc4;
		    					s = true;
		    					break;
		    				}
			    		}
			    	}
			   	}else{
			   		if(Math.random()>baseline){
			    		nh = Math.floor(height * scales[scale].scale);
			    		nhb = height - nh - 1;
			    		if((nh + 2 * this.settings.borderH)  > this.settings.minH && (nhb + 2 * this.settings.borderH) > this.settings.minH){
				    		var realW = nw - 2 * this.settings.borderW;
		    				var realH = nh - 2 * this.settings.borderH - this.settings.minH;
		    				var realHb = nhb - 2 * this.settings.borderH - this.settings.minH;
		    				var fc1=0,fc2=0,fc3=0,fc4=0;
		    				fc1 = this.fitCell(childa.data, realW, realH);
		    				if(fc1 > 0)
		    					fc2 = this.fitCell(childb.data, realW, realHb);
		    				fc3 = this.fitCell(childa.data, realW, realHb);
		    				if(fc3 > 0)
		    					fc4 = this.fitCell(childb.data, realW, realH);
		    					
		    				if(fc1 > 0 && fc2 > 0 && fc3 > 0 && fc4 > 0){
		    					if(Math.abs(fc1-fc2) < Math.abs(fc3-fc4)){
		    						childa.h = nh;
			    					childa.data.cell = fc1;
			    					childb.h = nhb;
			    					childb.data.cell = fc2;
		    					}else{
		    						childa.h = nhb;
			   						childa.data.cell = fc3;
			   						childb.h = nh;
			   						childb.data.cell = fc4;
		    					}
		    					s = true;
			    				break;
		    				}else if(fc1 > 0 && fc2 > 0){
		    					childa.h = nh;
			    				childa.data.cell = fc1;
			    				childb.h = nhb;
			    				childb.data.cell = fc2;
		    					s = true;
			    				break;
		    				}else if(fc3 > 0 && fc4 > 0){
		    					childa.h = nhb;
		    					childa.data.cell = fc3;
		    					childb.h = nh;
		    					childb.data.cell = fc4;
		    					s = true;
		    					break;
		    				}
					    }
			    	}
			   	}
		    }
	    	
	    	if(s){
	    		return {dir:dir, a:{isCell:false, width: childa.w, height: childa.h, child:this.clip(childa.w, childa.h, level+1, childa.data)}, b:{isCell:false, width: childb.w, height: childb.h, child:this.clip(childb.w, childb.h, level+1, childb.data)}};
	    	}else{
	    		this._data.unshift(childb.data);
	    		return {isCell:true, width: width, height: height, data:childa.data};
	    	}
	    }
	}
});

$.fn.reader = function( opts ){
	return $.reader.init( this[0], opts );
};

})(jQuery);