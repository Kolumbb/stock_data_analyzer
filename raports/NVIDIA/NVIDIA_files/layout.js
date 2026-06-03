(function($){
  
  $(document).ready(function(){
    
    $(".back-to-top").on("click",function(){
      $("html, body").animate({
        scrollTop: 0
      }, {
        duration: '500'
      });
    });

    /*
    $(".subscribe-container .btn-manual").on("click",function(){
      var el = $(this);
      console.log(el.data("href"));
      $.colorbox({
        href: el.data("href"),
        inline: true,
        width: '854px'
      })
    });
    */

    $(".da-container",".brand-container").on("click",function(){
      if($(".dropdown-arrow", ".da-container").hasClass("dropdown-expanded")) {
        $(".dropdown-arrow", ".da-container").removeClass("dropdown-expanded");
        $(".global-menu-overlay").addClass("fade").removeClass("show in");
      } else {
        $(".dropdown-arrow", ".da-container").addClass("dropdown-expanded");
        $(".global-menu-overlay").removeClass("fade").addClass("show in");        
      }
      return false;
    });
    
    $("body").on("click",function(e){
      if($(e.target).parents(".global-nav").length==0 && $(".dropdown-arrow", ".da-container").hasClass("dropdown-expanded")) {
        $(".dropdown-arrow", ".da-container").removeClass("dropdown-expanded");
        $(".global-menu-overlay").addClass("fade").removeClass("show in");        
      };
    })
    
    
    switchOffMobileMenu();
    $(".ic-menu").on("click",function(){
      if($("html").hasClass("mobileMenuOn")) {
        switchOffMobileMenu();
        $("html").removeClass("mobileMenuOn");
      } else {        
        switchOnMobileMenu();
        $("html").addClass("mobileMenuOn");
      }
      return false;
    });
    $(".lightbox-background").on("click",function(){
      switchOffMobileMenu();
    })
    $(window).on("resize",function(){
      switchOffMobileMenu();
    })
    
  })
  
  var prePos = 0;

  $(window).scroll(function(){
    var pos = $(window).scrollTop();
    setScrollClasses(pos, (prePos - pos > 0 ? "up" : "down" ));
    prePos = pos;
  })
  
  function setScrollClasses(pos, direct) {
    
    // header naviation menu
    if(pos<44){
      $(".global-nav").removeClass("pull-up");
      $("#page-content").removeClass("pull-up");
    } else {
      if(direct == "down") {
        $(".global-nav").addClass("pull-up");
        $("#page-content").addClass("pull-up");        
      } else {
        $(".global-nav").removeClass("pull-up");
        $("#page-content").removeClass("pull-up");
      }
    }
    
    // toTop link
    if(pos>0) {
      $(".back-to-top").slideDown();
    } else {
      $(".back-to-top").slideUp();
    }
    
  }
  
  
  function switchOffMobileMenu(){
    $(".mobile-menu-container").css({
      "opacity": "0",
      "overflow": "hidden",
      "transition": "all 0.5s ease 0s",
      "height": "0px"
    });
    
    $(".lightbox-background").css({
      "opacity": "0",
      "visibility": "hidden"
    }).addClass("hide");
    $("body").removeClass("noscroll");
    
    setTimeout(function(){
      if($(".global-nav").hasClass("pull-up")) {
        $(".global-nav").removeClass("pull-up");
        $(".mobile-menu-container").css({
          "display": "none"
        });
      }
    },800);
    
    $("#menu-line-top","#menu-icon").css({
      "transform-origin": "0px 0px 0px",
      "stroke": "rgb(255, 255, 255)",
      "transform": "matrix(1, 0, 0, 1, 0, 0)"
    });
    $("#menu-line-mid","#menu-icon").css({
      "transform-origin": "0px 0px 0px",
      "stroke": "rgb(255, 255, 255)",
      "transform": "matrix(1, 0, 0, 1, 0, 0)"
    });
    $("#menu-line-bot","#menu-icon").css({
      "transform-origin": "0px 0px 0px",
      "stroke": "rgb(255, 255, 255)",
      "transform": "matrix(1, 0, 0, 1, 0, 0)"
    });
  }
  
  function switchOnMobileMenu(){
    $(".mobile-menu-container").css({
      "display": "block",
      "opacity": "1",
      "overflow": "hidden auto",
      "transition": "all 0.8s ease 0s",
      "height": "100vh"
    });
    $(".lightbox-background").css({
      "opacity": "1",
      "visibility": "inherit"
    }).removeClass("hide");
    $(".global-nav").addClass("pull-up");
    $("body").addClass("noscroll");
    
    $("#menu-line-top","#menu-icon").css({
      "transform-origin": "0px 0px 0px",
      "stroke": "rgb(118, 185, 0)",
      "transform": "matrix(-0.7071, -0.7071, 0.7071, -0.7071, 16.2426, 24.7279)"
    });
    $("#menu-line-mid","#menu-icon").css({
      "transform-origin": "0px 0px 0px",
      "stroke": "rgba(118, 185, 0, 0)",
      "transform": "matrix(-0.7071, -0.7071, 0.7071, -0.7071, 16.2426, 24.7279)"
    });
    $("#menu-line-bot","#menu-icon").css({
      "transform-origin": "0px 0px 0px",
      "stroke": "rgb(118, 185, 0)",
      "transform": "matrix(-0.7071, 0.7071, -0.7071, -0.7071, 33.2132, 16.2426)"
    });
    
  }

    $('input[name="category"]').change(function() {
      const selectedValue = $('input[name="category"]:checked').val();
  
      const currentUrl = window.location.href;
  
      const [baseUrl, queryParams] = currentUrl.split('?');
  
      const params = new URLSearchParams(queryParams);
  
      params.set('c', selectedValue);
  
      const newUrl = baseUrl + '?' + params.toString();
  
      window.location.href = newUrl;
    }); 
  
})(jQuery)
