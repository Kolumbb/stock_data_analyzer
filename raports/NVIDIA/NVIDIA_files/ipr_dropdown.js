(function($){

  jQuery.prototype.pr_dropdown = function() {
    
    var _self = this;

    _self.targetID = _self.attr("id");
    _self.target = jQuery("[aria-labelledby=" + _self.targetID + "]");

    _self.on("click",function(){
      _self.toggleState();
      return false;
    });
    
    jQuery("body").on("pr_dropdown_close_all",function(event_handler, param){
      if(param.caller != _self.targetID) {
        _self.close();        
      }
    })
    
    jQuery("body").on("click",function(event_handler){
      if(event_handler.originalEvent && !$(event_handler.originalEvent.path[0]).parents(_self.targetID).length && !$(event_handler.originalEvent.path[0]).parents("[aria-labelledby='"+_self.targetID+"']").length ) {
        _self.close();        
      }
    })
    
    jQuery("body").on("closeAllDropdowns",function(event_handler){
      _self.close();        
    })
    
    _self.toggleState = function(){
      if(_self.hasClass("opened")) {
        _self.close();
      } else {
        // close all the rest dropdowns
        jQuery("body").trigger("pr_dropdown_close_all",[{"caller" : _self.targetID}]);
        jQuery("body").trigger("pr_dropdown_opened",[{"caller" : _self.targetID}]);
        _self.open();
      }
    }
    
    _self.close = function(){
      _self.removeClass("opened");
      _self.target.removeClass("opened");
      jQuery("body").removeClass(_self.targetID+"-opened");
    }
    
    _self.open = function() {
      _self.addClass("opened");
      _self.target.addClass("opened");
      jQuery("body").addClass(_self.targetID+"-opened");
    }
    
    _self.target.on("click","[data-action='close']",function(){
      _self.toggleState();
      return false;
    })
    
    _self.swtichOffAll = function(){
      
    }
  }

})(jQuery)

