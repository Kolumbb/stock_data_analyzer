// Image strip kiosk script
// iPressroom (c) 2009-2011
// v 2.5.0
//
// October, 2019: added support for Fancybox
//

$(function() {
  // switch content for strip kiosks
  function switchContent() {
    var kiosk = $(this).parents(".imageStrip");
    $(".imageStrip-active", kiosk).empty().append($(this).parents(".article-images-item").clone(true));   
    
    $(this).parents("li").find("[data-fancybox]").removeAttr("data-fancybox");
    var siblings = $(this).parents("li").siblings().find("[data-fancybox_restore]").toArray();
    siblings.forEach(function(item,i){
      if(typeof $(item).attr("data-fancybox") === "undefined") {
        $(item).attr("data-fancybox",$(item).attr("data-fancybox_restore"));
      }
    })
    /*
    if(kiosk.hasClass("imageStrip-video")) {
      sid = $(".newsImage",".newsBody-active").attr("data-id");
        if(sid) {
          try {
            eval("player_"+sid+"()");
          } catch(e) {}
        }
    }
    */
    
    $(".newsImageSmall a", kiosk).removeClass("active");
    $(this).addClass("active");
    return false;
  };
  
  // bind events for strip kiosks
  function bindKioskStrip() {
   $(".imageStrip").each(function() {
    var kiosk = $(this);
    var links = $(".newsImageSmall a", this);
    links.click(switchContent);
    
    // hide for single image
    if (links.length == 1)
      $("ul", this).hide();

  
    // activate first element
    if (links.length > 0) 
     switchContent.call(links[0]);
     
   });
  };
  
  
  bindKioskStrip();
});

