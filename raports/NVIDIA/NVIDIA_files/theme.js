(function($){
    if(cookieExists('nv-news-unibrow')){
        $('#announcement-banner').remove();
    }
    else{
        $('#announcement-banner').css('display', 'block');
    }
    adjust_page_margin();
    $('#announcement-banner .btn-toggle-additional-text').click(function(){
        $('#announcement-banner').toggleClass('show-additional-text')
        adjust_page_margin();
    })

    $('#btn-close-announcement-banner').click(function(){
        $('#announcement-banner').fadeOut('slow', function() {
            $(this).remove();
            adjust_page_margin();
        });
        set_anouncement_banner_cookie();
    })

    function adjust_page_margin(){
        var height_global_nav = $('.navigation .global-nav').height();
        $('#page-content').css('margin-top',  height_global_nav+"px")
    }

    
    function set_anouncement_banner_cookie() {
        const cookieName = 'nv-news-unibrow';
        const cookieValue = 'nv-news-unibrow';
        const hoursToExpire = 24;

        var date = new Date();
        date.setTime(date.getTime() + (hoursToExpire * 60 * 60 * 1000));
        var expires = "expires=" + date.toUTCString();
        document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
    }
    function cookieExists(cookieName) {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Check if this cookie is the one we're looking for
            if (cookie.indexOf(cookieName + '=') === 0) {
                return true;
            }
        }
        return false;
    }
    
})(jQuery);


// YouTube Fallback if Cookies Not Accepted

(function () {

  var ADVERTISING_CATEGORY = 'C0004';

  function hasAdvertisingConsent() {
    var groups = window.OnetrustActiveGroups || window.OptanonActiveGroups || '';
    return groups.indexOf(ADVERTISING_CATEGORY) !== -1;
  }

  function updateYouTubeEmbeds() {

    var consentAccepted = hasAdvertisingConsent();

    document.querySelectorAll('.youtube-consent-embed').forEach(function (wrap) {
      var fallback = wrap.querySelector('.youtube-fallback');
      var iframe = wrap.querySelector('.youtube-frame');

      if (!iframe) return;
      if (consentAccepted) {
        var src = iframe.getAttribute('data-src');

        if (src) {
          iframe.src = src;
          iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        }

        iframe.style.display = 'block';

        if (fallback) {
          fallback.style.display = 'none';
        }

      } else {
        iframe.removeAttribute('src');
        iframe.style.display = 'none';

        if (fallback) {
          fallback.style.display = 'block';
        }
      }
    });
  }

  window.addEventListener('load', updateYouTubeEmbeds);
  window.addEventListener('OneTrustGroupsUpdated', updateYouTubeEmbeds);

  setTimeout(updateYouTubeEmbeds, 1000);

})();

// Instagram Fallback if Cookies Not Accepted
(function () {
  var ADVERTISING_CATEGORY = 'C0004';
  var instagramScriptLoaded = false;

  function hasAdvertisingConsent() {
    var groups = window.OnetrustActiveGroups || window.OptanonActiveGroups || '';
    return groups.indexOf(ADVERTISING_CATEGORY) !== -1;
  }

  function loadInstagramScript(callback) {
    if (window.instgrm && window.instgrm.Embeds) {
      callback();
      return;
    }

    if (instagramScriptLoaded) {
      setTimeout(callback, 500);
      return;
    }

    instagramScriptLoaded = true;

    var script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.onload = callback;

    document.body.appendChild(script);
  }

  function updateInstagramEmbeds() {
    var consentAccepted = hasAdvertisingConsent();

    document.querySelectorAll('.instagram-consent-embed').forEach(function (wrap) {
      var fallback = wrap.querySelector('.instagram-fallback');
      var embed = wrap.querySelector('.instagram-embed-content');

      if (!embed) return;

      if (consentAccepted) {
        embed.style.display = 'block';

        if (fallback) {
          fallback.style.display = 'none';
        }

        loadInstagramScript(function () {
          if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
          }
        });
      } else {
        embed.style.display = 'none';

        if (fallback) {
          fallback.style.display = 'block';
        }
      }
    });
  }

  window.addEventListener('load', updateInstagramEmbeds);
  window.addEventListener('OneTrustGroupsUpdated', updateInstagramEmbeds);
  window.addEventListener('consent.onetrust', updateInstagramEmbeds);

  setTimeout(updateInstagramEmbeds, 1000);
})();

// Facebook Fallback if Cookies Not Accepted

;(function () {

  var ADVERTISING_CATEGORY = 'C0004';
  var facebookSdkLoaded = false;

  function hasAdvertisingConsent() {

    var groups =
      window.OnetrustActiveGroups ||
      window.OptanonActiveGroups ||
      '';

    return groups.indexOf(ADVERTISING_CATEGORY) !== -1;
  }

  function loadFacebookSdk(callback) {

    if (window.FB && window.FB.XFBML) {
      callback();
      return;
    }

    if (facebookSdkLoaded) {
      setTimeout(callback, 500);
      return;
    }

    facebookSdkLoaded = true;

    var script = document.createElement('script');

    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.src =
      'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';

    script.onload = callback;

    document.body.appendChild(script);
  }

  function updateFacebookEmbeds() {

    var consentAccepted = hasAdvertisingConsent();

    document.querySelectorAll('.facebook-consent-embed').forEach(function (wrap) {

      var fallback =
        wrap.querySelector('.facebook-fallback');

      var embed =
        wrap.querySelector('.facebook-embed-content');

      if (!embed) return;

      if (consentAccepted) {

        embed.style.display = 'block';

        if (fallback) {
          fallback.style.display = 'none';
        }

        loadFacebookSdk(function () {

          if (window.FB && window.FB.XFBML) {
            window.FB.XFBML.parse(wrap);
          }

        });

      } else {

        embed.style.display = 'none';

        if (fallback) {
          fallback.style.display = 'block';
        }
      }

    });
  }

  window.addEventListener(
    'load',
    updateFacebookEmbeds
  );

  window.addEventListener(
    'OneTrustGroupsUpdated',
    updateFacebookEmbeds
  );

  window.addEventListener(
    'consent.onetrust',
    updateFacebookEmbeds
  );

  setTimeout(updateFacebookEmbeds, 1000);

})();

// X Fallback if Cookies Not Accepted

;(function () {

  var ADVERTISING_CATEGORY = 'C0004';
  var xScriptLoaded = false;

  function hasAdvertisingConsent() {
    var groups =
      window.OnetrustActiveGroups ||
      window.OptanonActiveGroups ||
      '';

    return groups.indexOf(ADVERTISING_CATEGORY) !== -1;
  }

  function loadXScript(callback) {
    if (window.twttr && window.twttr.widgets) {
      callback();
      return;
    }

    if (xScriptLoaded) {
      setTimeout(callback, 500);
      return;
    }

    xScriptLoaded = true;

    var script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.onload = callback;

    document.body.appendChild(script);
  }

  function updateXEmbeds() {
    var consentAccepted = hasAdvertisingConsent();

    document.querySelectorAll('.x-consent-embed').forEach(function (wrap) {
      var fallback = wrap.querySelector('.x-fallback');
      var embed = wrap.querySelector('.x-embed-content');

      if (!embed) return;

      if (consentAccepted) {
        embed.style.display = 'block';

        if (fallback) {
          fallback.style.display = 'none';
        }

        loadXScript(function () {
          if (window.twttr && window.twttr.widgets) {
            window.twttr.widgets.load(wrap);
          }
        });
      } else {
        embed.style.display = 'none';

        if (fallback) {
          fallback.style.display = 'block';
        }
      }
    });
  }

  window.addEventListener('load', updateXEmbeds);
  window.addEventListener('OneTrustGroupsUpdated', updateXEmbeds);
  window.addEventListener('consent.onetrust', updateXEmbeds);

  setTimeout(updateXEmbeds, 1000);

})();