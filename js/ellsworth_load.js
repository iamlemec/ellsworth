(function () {
  function headAppend(elem) {
    document.getElementsByTagName("head")[0].appendChild(elem);
  }

  function loadCSS(url) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = url;
    headAppend(link);
  }

  function loadScript(url, callback) {
    var script = document.createElement("script")
    script.type = "text/javascript";
    if (callback) {
      script.onload = function() {
        callback();
      };
    }
    script.src = url;
    headAppend(script);
  }

  // insert CSS defs - bootstrap, ellsworth
  loadCSS("/css/bootstrap.min.css");
  loadCSS("/testing/ellsworth/css/ellsworth.css");

  // insert meta info - this is dumb
  var meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = "initial-scale=1.0, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0, width=device-width";
  headAppend(meta);

  // load jQuery and subsequently the rest - bootstrap, MathJax, ellsworth
  loadScript("/js/jquery.min.js", function () {
    loadScript("/js/bootstrap.min.js");
    loadScript("/testing/ellsworth/js/ellsworth.js?version=1.0");
    loadScript("/js/MathJax/MathJax.js?config=TeX-AMS-MML_HTMLorMML");
  });
})();
