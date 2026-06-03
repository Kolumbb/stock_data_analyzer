/*
 * External links plugin (c) iPressroom Inc, 2010-2012
 * v 2.0.0
 *  
 * Default usage .prExternal() -- marks externals and pdf
 * Custom usage .prExternal("ext", function(){})
 * Filter names: "ext" -- external links, "pdf" -- pdf files
 * You can pass your own function as argument to process links, 
 * similar to jQuery .each() function    
 */
 
(function($){

$("head").append('<link rel="stylesheet" type="text/css" href="/static/pr_external/pr_external.css">')
    
$.fn.prExternal = function() {
  // predefined filters
  var default_filters = defineFilters();
  var filters = new Array();  

  // obtain filters list
  if (arguments.length)
   filters = Array.prototype.slice.call(arguments)
  else 
   for (f in default_filters)
     filters.push(f);
  
  // common fitering links array
  var links = this.filter(function(){
   return this.className == "" &&
          $(this).children("img").length == 0 &&
          $(this).html() != "" 
  });

  // applying filters  
  for (var i=0; i < filters.length; i++) {
   // predefined filters
   if (typeof(filters[i]) == "string" && default_filters[filters[i]])
    links.each(default_filters[filters[i]]);

   // custom filters
   if (typeof(filters[i]) == "function")
    links.each(filters[i])
  }
  
  // define standard filters
  function defineFilters() {
   return {
    // file links
    "pdf": fileChecker("pdf", /\.pdf$/i, "PDF file"),
    "doc": fileChecker("doc", /\.docx?$/i, "Microsoft Word document"),
    "ppt": fileChecker("ppt", /\.pptx?$/i, "PowerPoint presentation"),
    "xls": fileChecker("xls", /\.xlsx?$/i, "Excel Spreadsheet"),
    "arc": fileChecker("arc", /\.(rar|zip|7z)$/i, "Archive file"),
    // external links
    "ext": 
    function () {
     if(!this.className && this.hostname && this.hostname != location.hostname) 
       decorateLink(this, "ext", "External link");
    }
   }
  }
  
  // returns file checker function
  function fileChecker(name, regexp, title) {
    return function() {
      // this -- is a link element here
      if(!this.className && regexp.test(this.href))
        decorateLink(this, name, title)
    };
  };
  
  // add icon, target and title to link
  function decorateLink(link, name, title) {
    if (!link.title)
      link.title = title;

    $(link).attr("target","_blank")
         .addClass("prexternal-link prexternal-link-"+name)
         .append('<span class="prexternal-icon prexternal-icon-'+ name +'" title="'+ title +'"></span>');
  }
}

})(jQuery);

