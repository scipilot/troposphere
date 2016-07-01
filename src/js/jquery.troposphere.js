/**
 * Troposphere Word Cloud Plugin v0.7
 * 
 * @author Pip Jones www.scipilot.org
 * @author Lucy Minshal www.deepend.com.au
 * 
 * JQuery plugin:
 *  Name: 'troposphere_cloud'
 * 	Uses the pluginMaker pattern from jupiterjs.com
 * 
 * Initialisation options (all optional):
 * 
 * 	option				default		description
 * 	'width':			800 	// width of created canvas
 * 	'height':			600,	// height of created canvas
 * 	'max_words':		200,	// Top sized N words to show (the rest are discarded)
 * 	'text_brightness':	150,	// 0-255 
 * 	'word_scale':		100,	// General size control
 * 	'word_scale_offset':6,		// Sets the bottom-limit of word sizes. Useful if you have a very wide variance in sizes.
 *	'spread':			50,		// How spread out the words are (tight is nice, but is slower)
 *	'cuddle':			false,	// Try to tightly pack the words amongst the letter shapes? (Runs slower)
 * 	'debug':			0		// 0-3, debugging level. (3 is very slow as it draws the internal process of moving the words around)
 *  'controls':			{}		// Object; list of selectors to the available control panel form input elements
 *  	'max_words':				// number/slider
 *  	'text_brightness':			// number/slider
 *  	'text_scale':				// number/slider
 *  	'text_scale_offset':		// number/slider
 *  	'text_angle':				// number/slider
 *  	'cuddle':					// checkbox
 *  	'spread':					// number/slider
 *  	'generate':					// button
 *  	'render': 					// button in a POST form to a backend script to download the image.
 *  	'font': 					// font selection dropdown
 * 
 * Download form HTML:
 * To enable downloads you must bounce the rendered image data off the server, which is posted base64 encoded.
 * The 'render' button should be part of a form thus:
 * <code>
 * 	<form id="download" method="post" action="DOWNLOAD_SCRIPT_URL">
 * 		<input type="hidden" value="" name="filename" />
 * 		<input type="hidden" value="" name="image" />
 * 		<input id="render" type="button" title="Download this cloud as an image?" value="DOWNLOAD"/><br/>
 * 	</form>
 * </code>
 * 
 * And the backend is something simple like this CodeIgniter example:
 * <code>
 * 	function download(){
 *		$this->load->helper('download');
 *		$sFilename = $this->input->post('filename');
 *		force_download($sFilename, base64_decode($this->input->post('image')));
 *	}
 * </code>
 * 
 * Events raised:
 * 
 * 	'cloud-start-render' 	- just before the cloud begins to render.
 * 	'progress'				- during render, the parameter is the percentage complete (in terms of process not time so it's a bit lumpy).
 * 	'cloud-finish-render' 	- just after the rendering is complete.
 * 
 * Usage:
 * 
 * To use, target a div where you want the cloud and call GenerateCloud with an array of words in this format: 
 * 	[{word:'foo', size:4}, ...]
 * 
 * Basic initialisation example:
 * 
 * <code>
 *	// The array of words will probably be rendered by your back-end
 *	aWords = [
 * 		{word:'did',size:9},
 * 		{word:'today',size:13},
 * 		{word:'tonight',size:4},
 * 		{word:'story',size:3}
 * 	];
 *	$('div#cloud-container').troposphere_cloud({word_scale:100, cuddle:true}); 	// init plugin
 * 	$('div#cloud-container').troposphere_cloud('GenerateCloud', aWords);		// draw
 * </code>
 * 
 * Kitchen sink initialisation example:
 * <code>
 * 	$(document).ready(function(){
		$('div#cloud-container').troposphere_cloud({
			'max_words':				150,
			'text_brightness':			28,
			'word_scale':				100,
			'word_scale_offset':		6,
			'text_angle':				1,
			'cuddle':					true,
			'spread':					25,
			'debug':					0,
			'controls':	{
				'max_words': 'form#rendering-controls input#max_words',
				'text_brightness': 'form#rendering-controls input#brightness',
				'text_scale': 'form#rendering-controls input#scale',
				'text_scale_offset': 'form#rendering-controls input#offset',
				'text_angle': 'form#rendering-controls div#angle',
				'cuddle': 'form#rendering-controls input#cuddle',
				'spread': 'form#rendering-controls input#spread',
				'generate': 'form#rendering-controls input#generate',
				'render': 'form#download input#render'
			}
		});
		$('div#cloud-container').bind('progress', function(event, percent){
			$('div#alert-progress progress').val(percent);
		});
		$('div#cloud-container').bind('cloud-finish-render cloud-start-render', function(e){
			switch(e.type){
				case 'cloud-finish-render':
					$('div#alert-progress').css('visibility', 'hidden');
					break;
				case 'cloud-start-render':
					$('div#alert-progress').css('visibility', 'visibile');
					break;
			}
		});

		$('div#cloud-container').troposphere_cloud('GenerateCloud', aWords);
	});
 * </code>
 */
(function( $ ){

	var TroposphereCloud = function(el, options) {
		if(el) this.init(el, options);
	};
	$.extend(TroposphereCloud.prototype, {
		// plugin name
		name: 'troposphere_cloud',
		
		// constants/settings
		iMaxWords: 0,
		cloudTextBrightness: 0,
		iWordScale: 0,
		iWordScaleOffset: 0,
		iSpread: 0,
		bCuddle: false,
		debug: 0, // 0-3
		positionInc: 0,
		spiralRadius: 0,
		textAngle: 0,
		iWordPadding: 8,
		bNice: true,
		sFriendlyName: '',
		sFontName: '',

		// private vars
		iHighestCount: 0,
		redBias: 0, 
		greenBias: 0, 
		blueBias: 0,
		canvas: null,
		controls: {},
		el: null,
		aWords: [],
		aWordsSanitised: [],
		collisionDetectMethod: 9, // while we optimise and test. this is the default
		logger: new Logger(false),
		state: {},
		
		// default settings
		settings: {
			'width':				800,//@todo reduce size for tests
			'height':				800,
			'max_words':			200,
			'text_brightness':		150,
			'text_scale':			100,
			'text_scale_offset':	6,
			'text_angle': 			1,               
			'spread':				25,
			'cuddle':				false,
			'debug':				0,
			'font':					'Delicious_500'
		},
		
		// plugin methods
		init: function(el, options ) { 
			this.logger.startTime();
			
			// default the name before merging (can't do this in the class declaration) 
			this.settings.friendly_name = this.name;

			// If options exist, lets merge them with our default settings
			if ( options ) { 
				$.extend( this.settings, options );
			}
			
			// note private variables separate out the style of the class from the plugin model
			this.el = $(el);
			this.iMaxWords = this.settings.max_words;
			this.cloudTextBrightness = this.settings.text_brightness;
			this.iWordScale = this.settings.word_scale;
			this.iWordScaleOffset = this.settings.word_scale_offset;
			this.textAngle = this.settings.text_angle;
			this.bCuddle = this.settings.cuddle == true;// set cuddle first, it affects spread factor!
			this.setSpreadFactor(this.settings.spread);
			this.debug = this.settings.debug;
			this.state =  new CloudState(this.bNice);
			this.sFriendlyName = this.settings.friendly_name;
			this.sFontName = this.settings.font;

			// Optionally bind to the controls
			if(typeof(options.controls) == 'object'){
				
				// todo table-ise this? No - might be a bit hard with the complexity of the different setters e.g. radios?
				
				$(options.controls.max_words).change($.proxy(this.onChangeMaxWords, this));
				$(options.controls.max_words).val(this.iMaxWords);
				
				$(options.controls.text_angle).change($.proxy(this.onChangeTextAngle, this));
				$('input:radio[name=angles][value=1]').attr('checked',true);
				
				$(options.controls.text_brightness).change($.proxy(this.onChangeBrightness, this));
				$(options.controls.text_brightness).val(this.cloudTextBrightness);
				
				$(options.controls.text_scale).change($.proxy(this.onChangeTextScale, this));
				$(options.controls.text_scale).val(this.iWordScale);
				
				$(options.controls.text_scale_offset).change($.proxy(this.onChangeTextScaleOffset, this));
				$(options.controls.text_scale_offset).val(this.iWordScaleOffset);
				
				$(options.controls.cuddle).change($.proxy(this.onChangeCuddle, this));
				$(options.controls.cuddle).attr('checked', this.bCuddle);
				
				$(options.controls.spread).change($.proxy(this.onChangeSpreadFactor, this));
				$(options.controls.spread).val(this.iSpreadFactor);
				
				$(options.controls.font).change($.proxy(this.onChangeFont, this));
				$(options.controls.font).val(this.sFontName);

				$(options.controls.render).click($.proxy(this.renderToImage, this));
				
				if($(options.controls.generate).click($.proxy(this.onClickGenerateCloud, this)).length == 0) console.log('Element not found for generate button "'+ options.controls.generate+'"');
			}
		},
		
		//  these are control field change event listeners
		onChangeMaxWords: function(event){
			this.iMaxWords = $(event.target).val();
		},

		onChangeTextAngle: function(event){
			this.textAngle = Number($(event.target).val());
		},
		
		onChangeBrightness: function(event){
			this.cloudTextBrightness = $(event.target).val();
		},
		
		onChangeTextScale: function(event){
			this.iWordScale = $(event.target).val();
		},
		
		onChangeTextScaleOffset: function(event){
			this.iWordScaleOffset = Number($(event.target).val());
		},
		
		onChangeCuddle: function(event){
			this.bCuddle = event.target.checked;
		},
		
		onChangeSpreadFactor: function(event){
			this.setSpreadFactor(Math.max(Math.min(Number($(event.target).val()), 100), 1));
		},
		
		onChangeFont: function(event){
			this.sFontName = $(event.target).val();
		},
		
		onClickGenerateCloud: function(event){
			this.GenerateCloud();
		},
		
		setSpreadFactor: function(i){
			this.iSpreadFactor = i;
			// tune the spacing, cuddling is /much/ tighter than the box model
			this.positionInc = .5+ (this.bCuddle ? 4 : 1) * this.iSpreadFactor / 100;
			this.spiralRadius = 1+ (this.bCuddle ? 10 : 1) * this.iSpreadFactor / 100;
		},
		
		// Progress handling (could be a separate class?)
		aSections: [],
		aSectionWeight: [],// how long each section takes
		iProgress: 0,
		resetProgress: function(){
			this.aSections = [0, 0, 0, 0, 0, 0];
			this.aSectionWeight = [1, 1, 1, 95, 1, 1];
			this.iProgress = 0;
		},
		setProgress: function(iSection, fPercent){
			var p = 0;
			this.aSections[iSection-1] = fPercent;
			for(var i=0; i<this.aSections.length; i++){
				p += this.aSections[i] * this.aSectionWeight[i] / 100;
			}
			//p = Math.round(p / this.aSections.length);
			if(p > this.iProgress){
				this.iProgress = p;
				this.el.trigger('progress', p);
			}
		},
		
		renderToImage: function(){
			var sImage = this.canvas.toDataURL('png');
			//convert back to binary : data:image/png;base64, 
			sImage = sImage.substr(22);
			var date = new Date();
			
			// can't use ajax for downloads so there must be a postback form
			$('form#download input[name=filename]').val(this.sFriendlyName + '-'+date.toDateString()+ '.png');
			$('form#download input[name=image]').val(sImage);
			$('form#download').submit();
		},
		
		/**
		 * Generates the Canvas and Cloud
		 * @param aWords (optional on subsequent calls) array of words. If omitted it will use the words supplied previously.
		 */
		GenerateCloud: function(aWords) {
			if(aWords) this.aWords = aWords;
			this.state.SetState(this.state.STATE_START);
			this.resetProgress();
			// kick off the FSM
			window.requestAnimationFrame($.proxy(this.FSM, this));
		},
		/**
		 * Finite State Machine which powers the rendering kindly to the processor,
		 * firing events on progress updates.
		 * @private
		 */
		FSM: function(){
			var bProgress = true;
			var s = this.state.GetState();
			switch(s){
			case this.state.STATE_START:
				this.logger.logTime('Creating canvas...');
				this.createCanvas();
				this.redBias = Math.random()*this.cloudTextBrightness;
				this.greenBias = Math.random()*this.cloudTextBrightness;
				this.blueBias  = Math.random()*this.cloudTextBrightness;
				this.setProgress(1,100);
				this.el.trigger('cloud-start-render');
				break;
			case this.state.STATE_PROCESS_WORDS:
				this.logger.logTime('Processing words...');
				this.aWordsSanitised = this.processWords(this.aWords);
				this.setProgress(2,100);
				break;
			case this.state.STATE_MAKE_TEXTS:
				this.logger.logTime('Making texts...');
				this.aFabricTexts = this.makeFabricTexts(this.aWordsSanitised);
				this.setProgress(3,100);
				break;
			case this.state.STATE_PLACE_WORDS:
				this.logger.logTime('Placing texts...');
				this.addTextsToCanvas(); 
				// wait here, as this causes a sub-fsm
				bProgress = false;
				break;
			case this.state.STATE_RENDER:
				this.setProgress(4,100);
				this.logger.logTime('Rendering...');
				this.canvas.renderAll();// otherwise the last word doesn't move?
				this.setProgress(5,100);
				break;
			case this.state.STATE_FINISH:
				this.logger.logTime('Tidy up');
				this.tidyCanvas();
				$(this.canvasEl).show();
				this.setProgress(6,100);
				
				break;
			case this.state.STATE_STOP:
				this.logger.logTime('Done');
				this.logger.logWrite();
				this.el.trigger('cloud-finish-render');
				//this.logger.logGraphDiffs();//todo debuggin!
				bProgress = false;
				break;
			}
			
			if(bProgress){
				this.state.NextState($.proxy(this.FSM, this));
			}
		},

		RunTests: function(aWords){
			// @todo test settings.
			var REPEAT_TESTS = 5;
			var aTests = [];
			aTests[0] = {setup:[{property: 'bCuddle', value: true}]};
			aTests[1] = {setup:[{property: 'bCuddle', value: false}]};
			var dp, da, diff, avg, min, k;
			
			for (var i=0; i<aTests.length; i++){
				avg = 0, min = 999999;
				
				for (var j=1; j<REPEAT_TESTS+1; j++){//1-base for humanity
					this.test = aTests[i];
					sLog = '';
					for(k=0; k<aTests[i].setup.length; k++){
						this[aTests[i].setup[k].property] = aTests[i].setup[k].value;
						sLog += '|' + aTests[i].setup[k].property +'='+ aTests[i].setup[k].value;
					}
					this.logger.logTime('==== TEST #'+i + ' r'+j 
						+ sLog
						+ '|' + this.settings.width +'x'+ this.settings.height
						+ '|' + aWords.length + ' words (' + aWords[0].word + ' ... ' + aWords[aWords.length-1].word + ')'
					);
					dp = new Date();
					this.GenerateCloud(aWords);
					da = new Date();
					diff = da.getTime() - dp.getTime();
					this.logger.logTime('Test time: '+diff);
					avg += diff;
					min = Math.min(min, diff);
				}
				aTests[i].meanTotalExecutionTime = avg/REPEAT_TESTS;
				aTests[i].minTotalExecutionTime = min;
				this.logger.logTime('== Test #'+i 
						+ ' Average time: '+aTests[i].meanTotalExecutionTime 
						+ ' Min: ' +aTests[i].minTotalExecutionTime);
			}
			
			this.logger.logTime('============ SUMMARY ============');
			for (var i=0; i<aTests.length; i++){
				this.logger.logTime('== Test #'+i 
						+ ' Average time: '+aTests[i].meanTotalExecutionTime 
						+ ' Min: ' +aTests[i].minTotalExecutionTime);
			}
		},
		
		createCanvas: function(){
			// create & initialise the canvas & fabric
			// todo: generate a unique ID?
			
			// removing the fabric-generated canvas requires removing some surrounding divs.
			$('div.canvas-container').remove();//todo should we only remove ours? if there's more on the page...
			$('canvas#'+this.name).remove();
			
			this.id = this.name+'-'+ Math.floor( Math.random()*99999 );
			this.el.append('<canvas id="'+this.id+'" width="'+this.settings.width+'" height="'+this.settings.height+'"></canvas>');
			this.el.append('<canvas id="'+this.id+'-collision" style="border: 1px black dashed;" width="'+this.settings.width+'" height="'+this.settings.height+'"></canvas>');
			// todo remove if not used
			//this.el.append('<canvas id="'+this.name+'-coll2" style="border: 1px blue dotted;" width="'+this.settings.width+'" height="'+this.settings.height+'"></canvas>');
			
			// Create the main Fabric Canvas.
			if(this.canvas) this.canvas.dispose();
			this.canvas = new fabric.Canvas(this.id, {
				backgroundColor: '#FFFFFF'
				//backgroundImage: '' 
			});
			this.canvas.selection = false;
			this.canvasEl = this.canvas.getElement();
			this.addHoverEventToCanvas(this.canvas);
			//$(this.canvasEl).hide();

			// Create the buffer canvas, used for pixel testing the word placements
			if(this.canvasCollision) this.canvasCollision.dispose();
			this.canvasCollision = new fabric.Canvas(this.id+'-collision', {
				backgroundColor: '#FFFFFF'
			});
			this.ctxCollide = this.canvasCollision.getContext();
			this.canvasCollideEl = this.canvasCollision.getElement();
			// hide it, although it doesn't make it run any quicker as I'd hoped!
			$(this.canvasCollideEl).hide();
			
			// todo remove if not used for debugging/rendering optimisation experiments
			/*
			// temp double buffer - might move to per-word... if we can update the word movement in the buffer
			if(this.canvasColl2) this.canvasColl2.dispose();
			this.canvasColl2 = new fabric.Canvas(this.id+'-coll2', {
				backgroundColor: '#FFFFFF'
			});
			this.canvasElColl2 = this.canvasColl2.getElement();  
			this.ctxColl2 = this.canvasColl2.getContext();
			*/
		},

		ftHover: null,
		/**
		 * This add mouseover/hover events to fabric.Canvas objects which fabric doesn't have by default.
		 * @author: http://fabricjs.com/hovering
		 * @author: Lucy Minshall / Pip Jones
		 * @since 21-03-2012
		*/
		addHoverEventToCanvas: function(canvas){

			// Catch the Hover Over Event
			this.canvas.observe('object:over', $.proxy(function(e) {
				//e.memo.target.setFill('red');//debug

				// Check it's a cloud word (e.g. not the rollover text!)
				if(e.memo.target.troposphere_size){
					
					// Add the text tip showing word popularity
					this.ftHover = new fabric.Text(
						' ' + e.memo.target.text + ':' + e.memo.target.troposphere_size + ' ', 
						{ 
							left: e.memo.mouseEvent.offsetX + 50,   
							top: e.memo.mouseEvent.offsetY - 20,
							fontFamily: this.sFontName,
							angle: 0, 
							fill: '#FFF',
							backgroundColor: '#333',
							fontSize: 22
						}
					);
					this.canvas.add(this.ftHover);
				}
				
			},this));

			// Catch the Hover Out Event
			this.canvas.observe('object:out', $.proxy(function(e) {
				
				// Remove any text tip
				if(this.ftHover){
					this.canvas.remove(this.ftHover);
					this.ftHover = null;
				}
				
				//e.memo.target.setFill('green');
				this.canvas.renderAll();
				
			},this));	

			// Upgrade the canvas.findTarget method to send over + out events
			canvas.findTarget = (function(originalFn) {
				  return function() {
				    var target = originalFn.apply(this, arguments);
				    if (target) {
				      if (this._hoveredTarget !== target) {
				    	  if (this._hoveredTarget) {
				    		  this.fire('object:out', { target: this._hoveredTarget, mouseEvent:arguments[0]  });
				    		  
				    	  }
				    	  this._hoveredTarget = target;
				    	  this.fire('object:over', { target: target,  mouseEvent:arguments[0] });
				      }
				    }
				    else if (this._hoveredTarget) {
				      this.fire('object:out', { target: this._hoveredTarget, mouseEvent:arguments[0] });
				      _hoveredTarget = null;
				    }
				    return target;
				  };
				})(canvas.findTarget);
		},

		/**
		 * Call this when the rendering is done.
		 */
		tidyCanvas: function(){
			if(this.canvasCollision) this.canvasCollision.dispose();
			this.canvasCollision = this.ctxCollide = this.canvasCollideEl = null;
			$('div.canvas-container:has(canvas#'+this.id+'-collision)').remove();
			
			//if(this.canvasColl2) this.canvasColl2.dispose();
			//this.canvasColl2 = this.canvasElColl2 = this.ctxColl2 = null;
			//$('div.canvas-container:has(canvas#'+this.id+'-coll2)').remove();
		},

		/**
		 * Pre-processes the words to sanitise them and apply settings limits.
		 */
		 processWords : function(aWords){
			var aSaneWords = new Array();
			var aWordsByCount = new Array();
			var aCounts = [];
			var word, i, j;
			
			// find the highest count number
			for(i=0; i< aWords.length; i++){
				word = aWords[i];
				this.iHighestCount = Math.max(word.size, this.iHighestCount);
			}

			// collate words by count
			for(i=0; i< aWords.length; i++){
				word = aWords[i];
				if(typeof(aWordsByCount[word.size]) != 'object'){
					aWordsByCount[word.size] = [];
					aCounts.push(word.size);
				}
				aWordsByCount[word.size].push(word);
			}
			aCounts.sort(this.rSortNumber);

			// add the top most popular words
			for(i=0; i< aCounts.length; i++){
				for(j=0; j<aWordsByCount[aCounts[i]].length; j++){
					if(aSaneWords.length < this.iMaxWords){
						aSaneWords.push(aWordsByCount[aCounts[i]][j]);
					}
					else break;
				}
			}
			
			return aSaneWords;
		},
		
		// array.sort() callback: reverse sorts by number instead of alphanum
		rSortNumber: function(a,b) {
			return b - a;
		},

		/**
		 * Converts a word cloud definition array into an array of fabric.Text objects
		 */
		makeFabricTexts: function(aWords){
			var aFabricTexts = [];
			var tAngle = 0, i, l, word;

			l = aWords.length;
			for(i=0; i< l; i++){
				word = aWords[i];
				
				
				if(this.debug>0){
					// todo test with rects
					ft = new fabric.Rect({ 
						left: fabric.util.getRandomInt(-this.canvas.width/4 + this.canvas.width/2, this.canvas.width/4 + this.canvas.width/2), 
						top: this.canvas.height/2, 
						width:this.iWordScale * word.size/100, height:this.iWordScale * word.size/100, 
						fill: '#'+ this.getRandomColor(), opacity: 0.8
					});
					ft.text = word.word;//simulate text field
					//* /
				} 
				else {
						
					switch(this.textAngle){
					case 2:	
						tAngle = Math.floor(Math.random()*1.2 + 0.9)*90 - 90; // Tetris
						break;

					case 3:
						tAngle = this.rnd(0, 7); // Jumble
						break;

					case 4:
						tAngle = Math.random()*60-30; // Shatter
						break;
					}
					
					// Attempt to automatically spread the later words out towards the edge of the cloud
					// The spiral algorith will do this, but it's the slowest part, so if we can 
					// give it a lttle help here, we can reduce the number of spiral iterations
					//iXYAutoSpread = i / l * 19;
					// todo delete: this didn't help! even widening the STDEV doesn't reduce the growth in
					//spiral steps to 70 placements per word after 60 words.
					
					ft = new fabric.Text(word.word, { 
						//left: this.canvas.width/2,  // @todo remove random for tests 
						//top: this.canvas.height/2,  // @todo remove random for tests
						left: this.rnd(this.canvas.width/2, this.canvas.width/20),   
						top: this.rnd(this.canvas.height/2, this.canvas.width/30),
						fontFamily: this.sFontName,
						angle: tAngle, 
						fill: (this.collisionDetectMethod==9) 
								?	'#000000'
								:	'#'+ this.getBiasedRandomColor(this.redBias, this.greenBias, this.blueBias),
						fontSize: Math.floor(this.iWordScaleOffset + this.iWordScale * word.size / this.iHighestCount),
						opacity: 0.5

					});
					// nb this doesn't seem to affect speed.
					//ft.selectable = ft.hasControls = ft.hasBorders = false;

					// Adding our word size to the fabric text object
					ft.troposphere_size = word.size;
				}

				/*
				if(this.debug > 1){
					//this.debug plot corners. top/left is actually the centre!! wtf? https://github.com/kangax/fabric.js/wiki/Fabric-gotchas
					this.plotPoint(new fabric.Point(ft.left-ft.width/2, ft.top-ft.height/2), 'FF0000');
					this.plotPoint(new fabric.Point(ft.left+ft.width/2, ft.top-ft.height/2), '00FF00');
					this.plotPoint(new fabric.Point(ft.left+ft.width/2, ft.top+ft.height/2), '0000FF');
				}
				//*/
				
				aFabricTexts.push(ft);
			}
			return aFabricTexts;
		},
		
		// De-collides the next Fabric Text object
		direction: 1,
		adjustCoords: function(ft, aFTs){
			var i=0, ft2, sane;
			var position = 0;
			var xOrig = ft.left;
			var yOrig = ft.top;
			// switch the spiral direction to help fill in gaps, reduce patterns.
			this.direction = (this.direction==1) ? -1 : 1;
			this.logger.logMessage('adjustCoords: '+ft.text);//todo debug

			// if we move the text, we need to rescan all the other text over again...!
			var bRescan = true;
			while(bRescan){
				bRescan = false;
				
				//this.logger.logTime('ReScanning...');//todo debug
				
				for(i=0; i<aFTs.length; i++){
					sane = 0;
					ft2 = aFTs[i];
					
					// don't compare with me (or this.debug points)
					if(ft != ft2 && ft2.type != 'circle'){
						//this.logger.logTime('Checking '+ ft2.text +'...');//todo debug

						while(this.FabricRectsIntersect(ft, ft2)){
							//this.logger.logTime('Moving '+ ft.text +'...');//todo debug
							// move out the spiral
							position += this.direction * this.positionInc;
							point = this.GetSpiralPoint(position, this.spiralRadius);
							// They say to Math.floor/round here for performance, but I didn't see any improvement.
							// probably because it's only the centre point that's on-pixel, but the font paths will be all over the shop!
							ft.left = point.x + xOrig;
							ft.top = point.y + yOrig;
							
							// flag rescan needed as we may have now bumped into another word?
							bRescan = true;
							
							//if(this.debug > 2){
							//	this.plotPoint(new fabric.Point(ft.left, ft.top), '000000');//this.debug the spiral
							//}
							
							if(sane++ > 1000) { 
								// note the spiral approach means we probably will never infinite loop
								console.log('Sanity break! "'+ft.text +'" iSpreadFactor='+ this.iSpreadFactor + ' this.spiralRadius='+this.spiralRadius+' this.positionInc='+this.positionInc);
								break;
							}
						}
					}
				}
			}
			//console.log(ft.text+' finished at '+ ft.top +' '+ft.left);
			return ft;
		},

		GetSpiralPoint: function(position, radius) {
			var mult = position / (2 * Math.PI) * radius;
			var angle = position % (2 * Math.PI);
			return {x:(mult * Math.sin(angle)), y:(mult * Math.cos(angle))};
		},
		
		/**
		* Tests if two Fabric Rectangles intersect, handling the registration point quirk.
		* devnote: I only implemented this becuse the fabric intersection function didn't work?
		* @return bool
		*/
		FabricRectsIntersect: function(rec1, rec2){
			return this.RectanglesIntersect(rec1.left-rec1.width/2, rec1.top-rec1.height/2,
											rec1.left+rec1.width/2, rec1.top+rec1.height/2, 
											rec2.left-rec2.width/2, rec2.top-rec2.height/2,
											rec2.left+rec2.width/2, rec2.top+rec2.height/2);
		},

		/**
		* Tests if two rectangles overlap.
		* Sorry - I lost the source I got this from. Thanks whoever you were!
		* @return bool
		*/
		RectanglesIntersect: function(r1x1, r1y1, r1x2, r1y2, r2x1, r2y1, r2x2, r2y2){
			if (r1x2 < r2x1) return false; // a is left of b
			if (r1x1 > r2x2) return false; // a is right of b
			if (r1y2 < r2y1) return false; // a is above b
			if (r1y1 > r2y2) return false; // a is below b
			return true; // boxes overlap
		},

		/**
		* Adds an array of fabrix.Objects to the canvas in an empty space.
		*/
		addTextsToCanvas: function(){
			// kick off the sub-FSM
			this.state.SetWord(0);
			window.requestAnimationFrame($.proxy(this.addTextsToCanvas_FSM, this));
		},
		
		addTextsToCanvas_FSM: function(){
			i = this.state.GetWord();
			
			//this.logger.logTime('Adding '+ aFabricObjects[i].text +'...');
			this.addToCanvasSpace(this.aFabricTexts[i],i);
			this.setProgress(4, 100*Number(i)/this.aFabricTexts.length);
			
			if(i == this.aFabricTexts.length-1){
				// needed if using findEmptySpot...
				if(this.bCuddle) this.colourPlacedTexts(this.aFabricTexts);
				
				// We're done! 'return' back to the main FSM process
				this.state.NextState($.proxy(this.FSM, this));
			}
			else {
				this.state.NextWord($.proxy(this.addTextsToCanvas_FSM, this));
			}
		},

		/**
		* Adds an object into a space in the canvas, near where it is now.
		* i.e. if it's overlapping anything, it's moved to a nearby space.
		*/
		addToCanvasSpace: function(obj,i){
			//this.logger.logTime('Adding to canvas...');//todo debug
			//this.logger.logTime('Adding '+obj.text);
			
			// Note: I tried randomly using adjustCoords on some words, thinking it might speed up cuddle
			// allowing later words to fill in, with less visual impact, but it wasn't any faster!
			// I think the pixel-perfect method is as fast as the rectangle method now.

			if(this.bCuddle && i != 0) this.findEmptySpot(obj);
			
			this.canvas.add(obj);
			
			if(!this.bCuddle) this.adjustCoords(obj, this.canvas.getObjects());
		},
		
		// as the new detection method relies on semitransparent grey text, we need to colour then afterwards
		colourPlacedTexts: function(aFabricObjects){
			for(var i=0; i<aFabricObjects.length; i++){
				aFabricObjects[i].setOpacity(1);
				aFabricObjects[i].fill = '#'+ this.getBiasedRandomColor(this.redBias, this.greenBias, this.blueBias); //todo set palettes?;
			}
			
		},
		
		
		/**
		 * Moves the fabric object into a place it will not collide, before adding to canvas.
		 * Does this by testing pixels in the current cloud and the word in a temporary canvas 
		 * and testing for collisions.
		 * 
		 * @param obj Fabric Text word
		 */
		findEmptySpot: function(obj){
			var position = 0, point = 0, imageData, idWord;
			var iw=0, ih=0, il=obj.left, it=obj.top, iwh, ihh;//optimisers (vars are faster than object.props)
			var xOrig = il, yOrig = it;
			var bTest = true;
			var i, q, r, ii, roff;
			// switch the spiral direction to help fill in gaps, reduce patterns.
			this.direction = (this.direction==1) ? -1 : 1;
			
			//this.logger.logMessage('findEmptySpot:'+obj.text);
			
			// a debug dot!
			//var id = this.ctxCollide.createImageData(1, 1);
			//id.data[0] = 0;	id.data[1] = 0;	id.data[2] = 90; id.data[3] = 255;
			
			// prep
			//we assume this now (becuase word[0] is missed!): obj.setOpacity(.5);
			obj.fontSize += this.iWordPadding;
			//obj.fontWeight = 150; //LM trying to fake outline padding
			
			// draw in the word into the buffer
			// NB widht, height is not set till we render!
			this.ctxCollide.clearRect(0, 0, this.settings.width, this.settings.height);
			obj.render(this.ctxCollide);
			iw = Math.ceil(obj.width);
			ih = Math.ceil(obj.height);
			iwh = iw/2;
			ihh = ih/2;
			idWord = this.ctxCollide.getImageData(
				Math.floor(il - iwh),
				Math.floor(it - ihh),
				iw,
				ih
			);
			
			while(bTest){
				bTest = false;

				// Get the pixels for the overlapping section.
				imageData = this.canvas.contextContainer.getImageData(
					Math.floor(il - iwh),
					Math.floor(it - ihh),
					iw,
					ih
				);
				
				// debug - blit it into the 3rd buffer!
				//this.ctxColl2.clearRect(0, 0, this.settings.width, this.settings.height);
				//this.ctxColl2.drawImage(this.canvasEl, 0, 0, this.settings.width, this.settings.height)
				//obj.render(this.ctxColl2);
				
				// test for collision
				var mid = Math.round(imageData.height/2);
				// search rows from middle outwards
				// thanks to: http://stackoverflow.com/questions/6837990/algorithm-to-loop-over-an-array-from-the-middle-outwards
				for (q=0; q < imageData.height; q++) {
					if(bTest) break;// oh for labelled loops...
					
					r = mid + ( q%2 == 0 ? Math.floor(q/2) : -(Math.floor(q/2)+1));
					roff = r * imageData.width*4;
					for(ii=0; ii<imageData.width*4; ii+=4){
						i = roff + ii;
						
						// Where there nothing we get: 0,0,0,0
						// Where there's fabric rendered text onto nothing we get: 0,0,0,22 -> 0,0,0,128
						// Where there's copied nothing, we get: 255,255,255,255
						// Where there's copied text we get: 127,127,127,255 on Mac / 127,127,127,254 on PC
						// Where there's overlapping text we get: 63,63,63,255
						// Also some tiny words don't even make their full colour (128) due to antialising
						// So it seems there's TWO ways to represent the same thing. 
						// Either black with transparency (fabric's method?) or RGB and A
						//console.log(i+'= r'+imageData.data[i]+' g'+imageData.data[i+1]+' b'+imageData.data[i+2]+' a'+imageData.data[i+3]);
						if((imageData.data[i+3]  == 255 || imageData.data[i+3]  == 254) && imageData.data[i] != 255 
							&& idWord.data[i+3] != 0 && idWord.data[i] == 0){
							
							//console.log(i+'= r'+imageData.data[i]+' g'+imageData.data[i+1]+' b'+imageData.data[i+2]+' a'+imageData.data[i+3]);
							
							// move out the spiral
							position += this.direction * this.positionInc;
							point = this.GetSpiralPoint(position, this.spiralRadius);
							// They say to Math.floor/round here for performance, but I didn't see any improvement.
							// probably because it's only the centre point that's on-pixel, but the font paths will be all over the shop!
							// however I'm doing it anyway so the image buffer copying needs to be on-pixel
							il = obj.left = Math.floor(point.x + xOrig);
							it = obj.top = Math.floor(point.y + yOrig);
							
							// flag a rescan
							bTest = true;
							break;
						}
						
						//this.ctxColl2.putImageData(id, obj.left-obj.width/2 + ((i/4)%imageData.width), obj.top-obj.height/2 + Math.floor(i/4/imageData.width));//debug
						//this.canvas.getContext().putImageData(id, obj.left-obj.width/2 + ((i/4)%imageData.width), obj.top-obj.height/2 + Math.floor(i/4/imageData.width));//debug
					}
				}
			}
			
			// restore changes before leaving
			obj.fontSize -= this.iWordPadding;
			//obj.fontWeight = 100;
		},

		/** Returns left zero padded str.
		*/
		pad: function(str, length) {
			while (str.length < length) {
			  str = '0' + str;
			}
			return str;
		},

		/**
		* Returns a hex RGB string.
		* Respects this.cloudTextBrightness setting.
		*/
		getRandomColor: function() {
			this.getBiasedRandomColor(0,0,0); 
		},

		/**
		* Returns a hex RGB string biased towards the channels indicated, 0-255 each.
		* Respects this.cloudTextBrightness setting.
		*/
		getBiasedRandomColor: function(redBias, greenBias, blueBias) {
			var max = Math.min(this.cloudTextBrightness,255);
			return (
			  this.pad(fabric.util.getRandomInt(Math.min(Math.floor(this.redBias),max), max).toString(16), 2) + 
			  this.pad(fabric.util.getRandomInt(Math.min(Math.floor(this.greenBias),max), max).toString(16), 2) + 
			  this.pad(fabric.util.getRandomInt(Math.min(Math.floor(this.blueBias),max), max).toString(16), 2)
			);
		},
		 
		//  this.debug function, plots a one pixel circle at the point specified. Quickly bogs things down.
		plotPoint: function(p,rgb){
			var c = new fabric.Circle({radius:1, left:p.x, top:p.y, fill:'#'+rgb});
			this.canvas.add(c);
		},

		/**
		 * Random Normal Distibution
		 * Produces random numbers using Math.random but instead of (eventually) producing an evenly-
		 * distributed range, they are weighted towards a central value and will (eventually) produce
		 * a normal distribution. This is useful for faking real normal data, or producing more 
		 * natural feeling randomness.
		 * 
		 * Standard deviation:
		 *  *stdev is in the same units as the mean (e.g. inches for height) 
		 *  * the higher the stdev the wider the range and the shallower the bell-curve. 
		 *  * The first standard deviation is 34% of the range, (i.e. 68% on either side of the mean).
		 *  * The second is 13.6%, then 2.1% then 0.1%. 99.7% of the spread are within 3 stdevs.
		 * e.g. if the mean is 5'6" (5.5) and the stdev is 6" then 68% of people will be 5' - 6' tall
		 * 
		 * Note there should be a chance a really way off number can come out sometimes. 
		 * There is no theoretical limit. However this function caps it at three stdevs.
		 * 
		 * @param Number mean the average value
		 * @param Number stdev Standard Deviation.
		 */
		rnd: function(mean, stdev){
			return Math.round(this.rnd_snd()*stdev+mean);
		},
		/** 
		 * Random Standard Normal Distribution
		 */
		rnd_snd: function(){
			return (Math.random()*2-1)+(Math.random()*2-1)+(Math.random()*2-1);
		}
		
	});//end of prototype

	// Create the JQ plugin from the Class
	$.pluginMaker(TroposphereCloud);


function Logger(bGoogleCharts){
	
	this.lastDate = new Date();
	this.log = [];
	this.diffs =[];
	
	this.logSetup = function(bGoogleCharts){
		if(bGoogleCharts){
			// Load the Visualization API and the piechart package.
			google.load('visualization', '1.0', {
				'packages' : [ 'corechart' ]
			});
		}

	};
	this.logSetup(bGoogleCharts);
	this.startTime = function(){
		this.lastDate = new Date();
	};
	
	this.logMessage =  function(sMessage){
		this.log.push(sMessage);
	};

	this.logTime =  function(sMessage){
		var d = new Date();
		var diff = d.getTime() - this.lastDate.getTime();
		this.diffs.push(diff);
		if(typeof(console.log) == 'function'){
			this.log.push(d.getMinutes() + ':' + d.getSeconds() + ':' + d.getMilliseconds() + ' [' + diff + '] ' + sMessage);
		}
		this.lastDate = d;
	};
	
	this.logClear= function(){
		this.log = [];
	};
	
	/* ridiculously specific function which shows the log time deltas as a graph
	* to help visualise how much slower each word added gets. i think it might flatten out... lets see.
	*/
	this.logGraphDiffs = function(){
		this.drawBARChart('How long each stage took', 'Log Point','ms',this.diffs) ;
	};
	
	this.logWrite = function(){
		if(typeof(console.log) == 'function'){
			console.log(this.log.join("\n"));
		}
		else alert(this.logger.log.join("\n"));
		this.logClear();
	};
	
	/* 
	 * @private
	 * todo Set a callback to run when the Google Visualization API is loaded.
	*  google.setOnLoadCallback(drawCharts);
	*/
	this.drawBARChart = function (sTitle, hAxisTitle,vAxisTitle,aData) {
		if(google.visualization){
			
			var data = new google.visualization.DataTable();
			var i;
	
			data.addColumn('string', vAxisTitle);
			data.addColumn('number', 'Total');
	
			for (i = 0; i < aData.length; i++) {
				data.addRow([ ''+i, aData[i] ]);
			}
	
			var options = {
				title: sTitle,
				hAxis: {
					title: hAxisTitle,
					titleTextStyle: {
						color: 'black'
					}
					//,showTextEvery: 5
				}
			};
			
			var chart = new google.visualization.ColumnChart(document.getElementById('log_chart_div'));
			chart.draw(data, options);
		}
		else {
			this.logTime('google.vizualisation not loaded!');
			this.logWrite();
		}
	};

}
/**
 * FSM manager.
 */
function CloudState(bNice){
	// 'constants'
	this.STATE_START 		= 0;
	this.STATE_SETUP 		= 1;
	this.STATE_PROCESS_WORDS= 2;
	this.STATE_MAKE_TEXTS 	= 3;
	this.STATE_PLACE_WORDS 	= 4;
	this.STATE_RENDER 		= 5;
	this.STATE_FINISH		= 6;
	this.STATE_STOP 		= 7;
	
	// privates
	this.bNice = bNice;
	this.iWordIndex = 0;
	this.iState = this.STATE_START;
	
	this.GetState = function(){
		return this.iState;
	};
	
	this.GetWord = function(){
		return this.iWordIndex;
	};
	
	this.NextState = function(callback){
		this.iState++;
		if(this.bNice) window.requestAnimationFrame(callback);
		else callback();
	};
	
	this.NextWord = function(callback){
		this.iWordIndex++;
		if(this.bNice) window.requestAnimationFrame(callback);
		else callback();
	};
	
	this.SetWord = function(i){
		this.iWordIndex = i;
	};
	
	this.SetState = function(i){
		this.iState = i;
	};
}

})( jQuery ); // $ compatibility + encapsulation closure