# Troposphere Word Cloud JQuery Plugin

Version: v0.7
Author: Pip Jones www.scipilot.org
Contributor: Lucy Minshal www.deepend.com.au
Licence: LGPL

# Overview

Troposphere is a word-cloud renderer built in Javascript on Canvas using Fabric. 

It has a few artistic options such as the "jumbliness" and "tightness" of the words, 
how they scale with word-rankings, colour and brightness. 
It also has an API to connect with UI controls.

## History 

I originally developed this visualisation in my spare time, while I was building a product
called "Tastemine" at Deepend Sydney, which could analyse sentiment of posts and likes on client's Facebook pages.
After scraping and histogramming keywords from this (and other potential sources),
the option to render the result in Troposphere was a playful way to present the data visually.

It was, at the time of writing, the only pure-HTML5 implementation, with visual inspiration taken from existing Java and other backend cloud generators.
It was quite challenging to perfect, and still isn't perfect at not crashing some words together, 
and still takes some time to render large clouds. I made huge leaps in optimisation and accuracy during development, 
so it may be possible to further perfect it with improved collision detection and masking algorithms.


# Details

JQuery plugin name: 'troposphere_cloud'
 
Uses the pluginMaker pattern from jupiterjs.com

## Initialisation 

Options (all optional):

	option				default		description
	'width':			800 	// width of created canvas
	'height':			600,	// height of created canvas
	'max_words':		200,	// Top sized N words to show (the rest are discarded)
	'text_brightness':	150,	// 0-255 
	'word_scale':		100,	// General size control
	'word_scale_offset':6,		// Sets the bottom-limit of word sizes. Useful if you have a very wide variance in sizes.
 	'spread':			50,		// How spread out the words are (tight is nice, but is slower)
 	'cuddle':			false,	// Try to tightly pack the words amongst the letter shapes? (Runs slower)
	'debug':			0		// 0-3, debugging level. (3 is very slow as it draws the internal process of moving the words around)
	'controls':			{}		// Object; list of selectors to the available control panel form input elements
 	'max_words':				// number/slider
 	'text_brightness':			// number/slider
 	'text_scale':				// number/slider
 	'text_scale_offset':		// number/slider
 	'text_angle':				// number/slider
 	'cuddle':					// checkbox
 	'spread':					// number/slider
 	'generate':					// button
 	'render': 					// button in a POST form to a backend script to download the image.
 	'font': 					// font selection dropdown

## Download Screenshot

To enable downloads you can "bounce" the rendered image data off the server, which is posted base64 encoded.
The 'render' button should be part of a form thus:

	<form id="download" method="post" action="DOWNLOAD_SCRIPT_URL">
		<input type="hidden" value="" name="filename" />
		<input type="hidden" value="" name="image" />
		<input id="render" type="button" title="Download this cloud as an image?" value="DOWNLOAD"/><br/>
	</form>

And the backend is something simple like this CodeIgniter example:

	function download(){
 		$this->load->helper('download');
 		$sFilename = $this->input->post('filename');
 		force_download($sFilename, base64_decode($this->input->post('image')));
 	}


## Events raised:

	'cloud-start-render' 	- just before the cloud begins to render.
	'progress'				- during render, the parameter is the percentage complete (in terms of process not time so it's a bit lumpy).
	'cloud-finish-render' 	- just after the rendering is complete.

## Usage:

To use, target a div where you want the cloud and call GenerateCloud with an array of words in this format: 

	[{word:'foo', size:4}, ...]

### Basic initialisation example:

	// The array of words will probably be rendered by your back-end
 	aWords = [
		{word:'did',size:9},
		{word:'today',size:13},
		{word:'tonight',size:4},
		{word:'story',size:3}
	];
 	$('div#cloud-container').troposphere_cloud({word_scale:100, cuddle:true}) 	// init plugin
		.troposphere_cloud('GenerateCloud', aWords);							// draw

### Kitchen sink initialisation example:

	$(document).ready(function(){
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

# Demo

See the demo folder for running examples.
