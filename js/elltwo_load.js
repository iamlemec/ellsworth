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
var meta = document.createElement("meta");
meta.name = "viewport";
meta.content = "width=device-width, initial-scale=1, user-scalable=no, minimum-scale=1, maximum-scale=1";
headAppend(meta);

// load jQuery then KaTex then elltwo
function EllsworthAutoload(opts) {
  loadScript("/js/jquery.min.js", function () {
    loadScript("/js/katex/katex.min.js", function () {
      loadScript(prefix+"/ellsworth/js/elltwo.js", function () {
        console.log("hi");
        ElltwoConfig(opts);
      });
    });
  });
}
