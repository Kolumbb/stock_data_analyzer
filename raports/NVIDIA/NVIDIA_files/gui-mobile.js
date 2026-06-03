// mobile menu slidebars
$( document ).ready( function () {
  $.slidebars({
    siteClose: true, // true or false
    hideControlClasses: true, // true or false
    scrollLock: false // true or false
  });          
});
        
$(function(){
  $(".wrapContent a, .kiosk-col a").prExternal(); 
  $( "#socialTabs" ).tabs();
 
  /*
  */
  var slider_options_common = {
    pager: true,
    auto: true,
    pause: 6000,
    speed: 500,
    mode: 'fade',
    adaptiveHeight: true,
    onSliderLoad: function(){
      $("html").addClass("featuredCarousel_slider_load");
    },
    onSlideBefore: function(slide, oldIndex, newIndex){
    },
    onSlideAfter: function(slide, oldIndex, newIndex){
    }
  }
  var slider_options_lg = {
    controls: false,
    touchEnabled: false
  }
  var slider_options_sm = {
    controls: false,
    touchEnabled: true
  }
 
  if($(".carousel-inner","#featuredCarousel").length) {
    
    var slider_options_initial = slider_options_common;
    if($(window).width() >= 1024){
      slider_options_initial = $.extend(slider_options_common,slider_options_lg);
    } else {
      slider_options_initial = $.extend(slider_options_common,slider_options_sm);
    }

    var slider = $(".carousel-inner","#featuredCarousel").bxSlider(slider_options_initial);
 
    if($(window).width() >= 1024){
      slider.reloadSlider($.extend(slider_options_common,slider_options_lg));
    } else {
      slider.reloadSlider($.extend(slider_options_common,slider_options_sm));
    }
    
    $(window).on("resize",function(){
      if($(window).width() >= 1024){
        slider.reloadSlider($.extend(slider_options_common,slider_options_lg));
      } else {
        slider.reloadSlider($.extend(slider_options_common,slider_options_sm));
      }
    })    
  }
  
  if($("#latestNews").length && $("#featuredCarousel").length){
    var carouselItems = $("#featuredCarousel").find(".carousel-item ").find(".carousel-item-text-title").toArray();
    carouselItems.forEach(function(item,i){
      var title = $(item).text().trim();
      var recentItems = $("#latestNews").find(".tiles-item").toArray();
      recentItems.forEach(function(item){
        if($(item).find(".tiles-item-text-title").text().trim() == title) {
          $(item).remove();
        }
      })
    })
    $("#latestNews").addClass("ready");
  }
 
})

$(document).ready(function() {
  
  if($('.select2').length) {
    $('.select2').select2({
    });    
  }

  
  $("body").on("pr_dropdown_opened",function(e,param){
    if(param.caller == "topSearch") {
      setTimeout(function(){
        $(".search-popup input[name='q']")[0].focus();
      },100)
    }
  })
  
  function getSearchNumbers() {
    var tabs = $(".nv_news_list .tab-list a").toArray();
    tabs.forEach(function(item,i){
      var searchParams = $(item).attr("data-href");
      var tabItem = $(item);
      $.ajax({
        url : "/helper-search-total" + searchParams,
        success: function(response) {
          tabItem.find("span").text(response);
          $(tabItem.attr("href")).find(".index").attr("data-total",response); // needed for load on demand
          $("html").addClass(tabItem.attr("id")+"-completed");
          if(parseInt(response)!="0") {
            tabItem.parents("li").show();
          } else {
            $("html").addClass(tabItem.attr("id")+"-empty");
          }
        }
      })
    });
  }
  getSearchNumbers();
  
  
  
  var searchTabs = $("#tab-results");
  searchTabs.tabs({
    create: function(event, ui){
      getSearchContent(ui.panel);
    },
    activate: function(event, ui){
      getSearchContent(ui.newPanel);
    }
  });
  
  
  function getSearchContent(tab) {
    var contentPanel = tab.find(".indexPage");
    var caller = tab.find("[data-newsload='caller']");
    
    if( !contentPanel.hasClass("inited")) {
      contentPanel.pr_newsLoad();
      caller.click();
      contentPanel.addClass("inited");
    }
  }
  
  $("select",".header-innerpage-search-form").on("change",function(){
    $(this).parents("form").submit();
  })

  
  
  /*
  
  if(location.search.toString().indexOf("origin=multimedia")!=-1) {
    var c_notHide = 1;
  }
  
  
  var a = $("#results-releases .index-item ").length;
  if(a) {
    $(".count01").text(a + " result(s)");    
  } else {
    $(".count01").parents("li").hide();
  }
  
  var b = $("#results-bios .index-item").length;
  if(b) {
    $(".count02").text(b + " result(s)");    
  } else {
    $(".count02").parents("li").hide();
  }
  
  var c = $("#results-multimedia .album-item-wrapper").length;
  if(c || c_notHide) {
    $(".count03").text(c + " result(s)");    
  } else {
    $(".count03").parents("li").hide();
  }

  $("select",".header-innerpage-search-form").on("change",function(){
    $(this).parents("form").submit();
  })
  
  if(c_notHide) {
    $("#tab-results").tabs({"active":2});    
  } else {
    $(".ui-tabs-nav").find("li:visible:first a").click();
  }
  
  */
  
  // video play on hover
  var players = $(".multimedia-item.video,.featured_media-item-figure.video,.album-item.video").toArray();
  players.forEach(function(item, i){
    var player_id = $(item).find("video").attr("id");
    var player_element = document.getElementById(player_id);
      
    $(item).find("a").on("mouseover focus",function(){
      var playPromise = player_element.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          console.log("promise here");
          player_element.play();
          // Automatic playback started!
        }).catch(function(error) {
          console.warn("error while try to play: " + error);
          // Automatic playback failed.
          // Show a UI element to let the user manually start playback.
        });
      }
    });
    $(item).find("a").on("mouseout blur",function(){
      player_element.pause();
    });      
    
  })
  
})  

$(function(){
  var url = window.location.pathname,
  urlRegExp = new RegExp(url.replace(/\/$/,'') + "$"); 
  $('.mb-menu-list li a').each(function(){
      if(urlRegExp.test(this.href.replace(/\/$/,''))){
          $(this).addClass('active');
      }
  });

});


// Cookie policy
$(document).ready(function(){
  if(document.cookie.indexOf("CookiePolicy")==-1) {
    $("#cookiePolicy-layer").css("display","flex");
    $("#cookiePolicy-btn-close").on("click",function(){
      document.cookie = "CookiePolicy=1;path=/;max-age=9999999";
      $("#cookiePolicy-layer").removeAttr("style");
    })
  }
})


// Fancybox
/*
$('[data-fancybox="gallery"]').fancybox({
	afterLoad : function( instance, slide ) {
		console.info( instance );
	}
});
*/