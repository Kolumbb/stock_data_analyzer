function parse_timestamp(s) {
	var match = s.match(/^(?:([0-9]{2,}):)?([0-5][0-9]):([0-5][0-9][.,][0-9]{0,3})/);
	if (match == null) {
		throw 'Invalid timestamp format: ' + s;
	}
	var hours = parseInt(match[1] || "0", 10);
	var minutes = parseInt(match[2], 10);
	var seconds = parseFloat(match[3].replace(',', '.'));
	return seconds + 60 * minutes + 60 * 60 * hours;
}

// https://w3c.github.io/webvtt/
// https://developer.mozilla.org/en/docs/Web/API/Web_Video_Text_Tracks_Format
// https://en.wikipedia.org/wiki/WebVTT
//
// For better parsers, look at:
// https://github.com/annevk/webvtt
// https://github.com/mozilla/vtt.js

function quick_and_dirty_vtt_or_srt_parser(vtt) {
	var lines = vtt.trim().replace('\r\n', '\n').split(/[\r\n]/).map(function(line) {
		return line.trim();
	});
	var cues = [];
	var start = null;
	var end = null;
	var payload = null;
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].indexOf('-->') >= 0) {
			var splitted = lines[i].split(/[ \t]+-->[ \t]+/);
			if (splitted.length != 2) {
				throw 'Error when splitting "-->": ' + lines[i];
			}

			// Already ignoring anything past the "end" timestamp (i.e. cue settings).
			start = parse_timestamp(splitted[0]);
			end = parse_timestamp(splitted[1]);
		} else if (lines[i] == '') {
			if (start && end) {
        try {
  				var cue = new VTTCue(start, end, payload);        
        } catch(e) {
          var cue = new TextTrackCue(start, end, payload);        
        }
				cues.push(cue);
				start = null;
				end = null;
				payload = null;
			}
		} else if(start && end) {
			if (payload == null) {
				payload = lines[i];
			} else {
				payload += '\n' + lines[i];
			}
		}
	}
	if (start && end) {
	
    try {
  		var cue = new VTTCue(start, end, payload);        
    } catch(e) {
      var cue = new TextTrackCue(start, end, payload);        
    }
    
		cues.push(cue);
	}

	return cues;
}

function init_subtitle(video_id, track_id) {
	// http://www.html5rocks.com/en/tutorials/track/basics/
	// https://www.iandevlin.com/blog/2015/02/javascript/dynamically-adding-text-tracks-to-html5-video
	var video = document.getElementById(video_id);
	var subtitle = document.getElementById(track_id);
	var language_labels = []
	for (var i = 0; i < video.textTracks.length; i++) {
    	language_labels.push(video.textTracks[i].label);
	}
	if (language_labels.indexOf(subtitle.dataset.label) != -1) {
    	return;
	}
	var track = video.addTextTrack('subtitles', subtitle.dataset.label, subtitle.dataset.lang);
	quick_and_dirty_vtt_or_srt_parser(subtitle.innerHTML).map(function(cue) {
		track.addCue(cue);
	});
}