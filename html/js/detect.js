// initialize our user agent string to lower case.
var uagent = navigator.userAgent.toLowerCase();

// mobile cues
var deviceMobile = "(android|iphone|ipod|ipad)";

// Detects if the current device is an Android OS-based device.
function detectMobile()
{
  if (uagent.search(deviceMobile) > -1) {
    return true;
  } else {
    return false;
  }
}

// return which CSS file to use
function getCSS()
{
  if (detectMobile()) {
    mathjax_scale = 200;
    return "css/mobile.css";
  } else {
    mathjax_scale = 80;
    return "css/core.css";
  }
}

function includes()
{
  var cssFile = getCSS();
  var cssLine = "<link href=\"" + cssFile + "\" type=\"text/css\" rel=\"stylesheet\"/>";
  document.write(cssLine);
}
