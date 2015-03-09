// prefix = "";
prefix = "/testing";

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
  var script = document.createElement("script");
  script.type = "text/javascript";
  if (callback) {
    script.onload = function() {
      callback();
    };
  }
  script.src = url;
  headAppend(script);
}

// insert CSS defs - KaTeX and elltwo
loadCSS("/js/katex/katex.min.css");
loadCSS(prefix+"/ellsworth/css/elltwo.css");

// insert meta info
var meta1 = document.createElement("meta");
meta1.name = "viewport";
meta1.content = "width=device-width, initial-scale=1, user-scalable=no, minimum-scale=1, maximum-scale=1";
headAppend(meta1);

var meta2 = document.createElement("meta");
meta2.setAttribute("charset","utf-8");
headAppend(meta2);

// load jQuery then KaTex then elltwo + theme
function ElltwoAutoload(opts) {
  if (!opts) {
    opts = {};
  }

  var theme;
  if ("theme" in opts) {
    theme = opts["theme"];
  } else {
    theme = "plain";
  }
  loadCSS(prefix+"/ellsworth/css/"+theme+".css");

  loadScript("/js/jquery.min.js", function () {
    loadScript("/js/katex/katex.min.js", function () {
      loadScript(prefix+"/ellsworth/js/elltwo.js", function () {
        ElltwoConfig(opts);
      });
    });
  });
}
