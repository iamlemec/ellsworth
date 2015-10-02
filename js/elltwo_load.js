// get script location
var scripts = document.getElementsByTagName('script');
var path = scripts[scripts.length-1].src.split('?')[0]; // remove any ?query
var prefix = path.split('/').slice(0, -1).join('/') + '/';  // remove filename

// insert utilities
var head = document.getElementsByTagName("head")[0];
function headAppend(elem) {
  head.appendChild(elem);
}

function loadCSS(url) {
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = prefix + url;
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
  script.src = prefix + url;
  headAppend(script);
}

// insert CSS defs - KaTeX and elltwo
loadCSS("../katex/katex.min.css");
loadCSS("../css/elltwo.css");

// load jQuery then KaTex then elltwo + theme
function ElltwoAutoload(opts) {
  if (!opts) {
    opts = {};
  }

  var theme;
  if ("theme" in opts) {
    theme = opts["theme"];
  } else {
    theme = "shakirm";
  }
  loadCSS("../css/"+theme+".css");

  loadScript("jquery.min.js", function () {
    loadScript("../katex/katex.min.js", function () {
      loadScript("elltwo.js", function () {
        ElltwoConfig(opts);
      });
    });
  });
}
