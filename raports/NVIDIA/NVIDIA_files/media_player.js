/*
 * flash media player embed helper
 * see media_player macro for embed code
 * requires: flowplayer
*/     

// id - container id
// clip - file js params for player 
// setup - player setup options, like autoplay for example
function media_player(id, clip, setup) {
    if(clip.brightcove_video=="true" || clip.brightcove_video=="True"){
        return false;
    }
    return false
 if (!flashembed.isSupported([9,0]))   // flashembed is a part of flowplayer                                            
  return;
  
 var _player_swf = {src: '/static/flowplayer/flowplayer-3.2.9.swf', wmode: 'opaque'};
 var _rtmp_swf = "flowplayer.rtmp-3.2.9.swf";

 var isVideo = Boolean(clip.width);
 // player config
 var config = {
  plugins: {
  	
  	// the captions plugin
    captions: {
        url: "flowplayer.captions-3.2.10.swf",
 
            // pointer to a content plugin (see below)
        captionTarget: 'content'
        },
 
        // configure a content plugin so that it
    // looks good for showing subtitles
    content: {
        url: "flowplayer.content-3.2.9.swf",
        bottom: 25,
        height:40,
        backgroundColor: 'transparent',
        backgroundGradient: 'none',
        border: 0,
        textDecoration: 'outline',
        display: "none",
        style: {
            body: {
                fontSize: 14,
                fontFamily: 'Arial',
                textAlign: 'center',
                color: '#FFFFFF'
            }
        }
    },
  	
    rtmp: {
     url: _rtmp_swf
    },
    controls: {
     stop: true
    }
  }
 };
 
 // setup video or audio
 if (isVideo) {
  config.playlist = [
   {
    url: clip.url_prv
   },
   {
    autoPlay: setup.autoplay,
    url: "mp4:" + clip.filename_encoded_mp4,
    captionUrl: clip.closed_caption_files_fp_url,
    provider: "rtmp",
    netConnectionUrl: clip.net_connection_url
   }
  ];
 } else {
  config.clip = {
    autoPlay: setup.autoplay,
    url: "mp3:" + clip.name,
    provider: "rtmp",
    netConnectionUrl: clip.net_connection_url
  };
  config.plugins.rtmp.durationFunc = 'getStreamLength';
  config.plugins.controls.autoHide = false;
  config.plugins.controls.fullscreen = false;
 }
 
 // install player 
 flowplayer(id, _player_swf, config).load();
}


// ajax wrapper for media_player function
// this function is defined by macro for ajax calls
// function _media_player_ajax() { }
