var macros = {};
function set_macros(m) {
  macros = m;
}

var biblio;
function set_biblio(b) {
  biblio = b;
}

var environs;
function set_environs(e) {
  environs = e;
}

var replacements;
function set_replacements(r) {
  replacements = r;
}

String.prototype.format_dict = function(dict) {
  return this.replace(/{(.+?)}/g, function(match,key) {
    return (typeof(dict[key])!='undefined') ? dict[key] : key;
  });
};

jQuery(document).ready(function($) {
  var MathJaxURL = "http://cdn.mathjax.org/mathjax/latest/MathJax.js";

  get_offset = function(event,scale) {
    if (!scale) { scale = 1.0; }

    offset_top = event.pageY;
    offset_left = event.pageX;

    if (event.clientY > window.innerHeight/2) {
      v_shift = -20;
      trans_y = -100*scale;
    } else {
      v_shift = 20;
      trans_y = 0;
    }

    if (event.clientX > window.innerWidth/2) {
      trans_x = -100*scale;
    } else {
      trans_x = 0;
    }

    return {'top': (offset_top+v_shift)+'px',
            'left': offset_left+'px',
            '-webkit-transform': 'translate('+trans_x+'%,'+trans_y+'%) scale('+scale+')'};
  };

  get_attributes = function(elem) {
    var attributes = {};
    $(elem[0].attributes).each(function(index,attr) {
      attributes[attr.name] = attr.value;
    });
    return attributes;
  };

  attach_popup = function(parent,popup,scale) {
    parent.append(popup);
    parent.hover(function(event) {
      if (popup.css("display")=="none") {
        popup.css(get_offset(event,scale)).show();
      }
    }, function() {
      popup.hide();
    });
  }

  // track refable objects (figures, equations, sections, etc)
  var n_figures = 1;
  var figures = {};

  var n_equations = 1;
  var equations = {};

  var n_footnotes = 1;
  var footnotes = {};

  var n_sections = 1;
  var sections = {};

  var n_subsections = [];
  var subsections = {};

  // create outer box
  $("body").append($("<div>",{class:"outer_box"}).append($("body>")));
  outer_box = $("div.outer_box");

  // make title
  $("body title").each( function () {
    title = $(this);
    h1text = $("<h1>",{html:title.html(),class:"title_name"});
    outer_box.prepend(h1text);
    spacer = $("<div>",{class:"title_spacer"});
    spacer.insertAfter(h1text);
    title.remove();
  });

  $("author").each( function () {
    author = $(this);
    auth_text = author.html();
    if (author.attr("affiliation")) {
      auth_text += " ("+author.attr("affiliation")+")";
    }
    h3text = $("<h3>",{html:auth_text,class:"author_name"});
    h3text.insertAfter($("h1.title_name"));
    author.remove();
  });

  // do replacements
  $("section").replaceWith(function () {
    var sec = $(this);
    var div = $("<div>",{class:"section_box",sec_num:n_sections++,sec_title:sec.attr("title"),label:sec.attr("label"),n_subsections:0});
    div.append($("<h2>",{html:div.attr("sec_num")+" &nbsp; "+div.attr("sec_title"),class:"section_title"}));
    div.append(sec.children());
    return div;
  });

  // one per section - this is bad
  $("subsection").replaceWith(function () {
    var sec = $(this);
    parent = sec.parent("div.section_box");
    sec_num = parent.attr("sec_num");
    subsec_num = Number(parent.attr("n_subsections"))+1;
    parent.attr("n_subsections",subsec_num);
    num_text = sec_num+"."+subsec_num;
    var div = $("<div>",{class:"subsection_box",sec_title:sec.attr("title"),label:sec.attr("label"),sec_num:sec_num,subsec_num:subsec_num});
    div.append($("<h3>",{html:sec_num+"."+subsec_num+" &nbsp; "+sec.attr("title"),class:"subsection_title"}));
    div.append(sec.children());
    return div;
  });

  $("text").replaceWith(function () {
    var text = $(this).html();
    var p = $("<p>",{class:"paragraph_box",html:text});
    return p;
  });

  $("footnote").replaceWith(function () {
    var foot = $(this);
    var sup = $("<sup>",{class:"footnote_mark"});
    sup.foot_num = n_footnotes++;
    sup.html(sup.foot_num);
    if (foot.attr("label")) {
      footnotes[foot.attr("label")] = sup;
    }
    var popup = $("<div>",{class:"footnote_popup",html:foot.html()});
    attach_popup(sup,popup);
    return sup;
  });

  $("equation").replaceWith(function () {
    var eqn = $(this);
    var div_box = $("<div>",{class:"equation_box"});
    var div = $("<div>",{class:"equation_inner",html:"$$"+$(this).html()+"$$"});
    div_box.append(div);
    if (eqn.attr("label")) {
      div.eqn_num = n_equations++;
      equations[eqn.attr("label")] = div;
      var num_div = $("<div>",{class:"equation_number",html:"("+div.eqn_num+")"});
      div_box.append(num_div);
    }
    return div_box;
  });

  // image is taken for whatever reason
  $("imager").replaceWith(function () {
    return $("<img>",{src:$(this).attr("source"),class:"centered slim"});
  });

  $("figure").replaceWith(function () {
    var fig = $(this);
    var div = $("<div>",{class:"figure_box"});
    div.fig_num = n_figures++;
    if (fig.attr("title")) {
      div.append($("<h3>",{html:"Figure "+div.fig_num+": "+fig.attr("title"),class:"figure_title"}));
    }
    div.append(fig.children());
    if (fig.attr("caption")) {
      div.append($("<p>",{html:fig.attr("caption"),class:"figure_caption"}));
    }
    if (fig.attr("label")) {
      figures[fig.attr("label")] = div;
    }
    return div;
  });

  $("enumerate").replaceWith(function () {
    var enumer = $(this);
    var div = $("<div>",{class:"enumerate_box",n_items:0});
    div.append(enumer.children());
    return div;
  });

  $("div.enumerate_box>item").replaceWith(function () {
    var item = $(this);
    parent = item.parent("div.enumerate_box");
    item_num = Number(parent.attr("n_items"))+1;
    parent.attr("n_items",item_num);
    var div = $("<div>",{class:"item_box",html:item_num+". "+item.html()});
    return div;
  });

  // simple replacements - these go first so table environments will work
  for (rep in replacements) {
    $(rep).replaceWith(function () {
      elem = $(this);
      tag = replacements[rep];
      div = $("<"+tag+">",{html:elem.html()});
      return div;
    })
  }

  // do replacements for custom environments
  n_environs = {};
  for (env in environs) {
    n_environs = 0;
    $(env).replaceWith(function () {
      elem = $(this);
      content = environs[env][0];
      orig_html = elem.html();
      elem.attr("number",++n_environs);
      elem.attr("content",orig_html);
      div = $("<div>",{class:env+"_box",html:content.format_dict(get_attributes(elem)),number:n_environs,label:elem.attr("label"),content:orig_html});
      return div;
    })
  }

  // dereference refs
  $("ref").replaceWith(function () {
    var ref = $(this);
    var span = $("<span>",{class:"ref_text"});
    if (ref.attr("label")) {
      var label = ref.attr("label");
      if (figures.hasOwnProperty(label)) {
        fig = figures[label];
        span.html("Figure "+fig.fig_num);
        var popup = $("<div>",{class:"fig_popup",html:fig.html()});
        attach_popup(span,popup,0.5);
      } else if (equations.hasOwnProperty(label)) {
        eqn = equations[label];
        span.html("Equation "+eqn.eqn_num);
        var popup = $("<div>",{class:"eqn_popup",html:eqn.html()});
        attach_popup(span,popup);
      } else if ((sec=$("div.section_box[label="+label+"]")).length) {
        span.html("Section "+sec.attr("sec_num"));
        var popup = $("<div>",{class:"sec_popup",html:sec.attr("sec_title")});
        attach_popup(span,popup);
      } else if ((sec=$("div.subsection_box[label="+label+"]")).length) {
        span.html("Section "+sec.attr("sec_num")+'.'+sec.attr("subsec_num"));
        var popup = $("<div>",{class:"sec_popup",html:sec.attr("sec_title")});
        attach_popup(span,popup);
      } else {
        found = false;
        for (env in environs) {
          rule = environs[env];
          if (rule.length > 1) {
            reference = rule[1];
            if (rule.length > 2) {
              tip = rule[2];
            } else {
              tip = '';
            }
            if ((div=$("div."+env+"_box[label="+label+"]")).length) {
              attrib = get_attributes(div);
              attrib['html'] = div.html();
              span.html(reference.format_dict(attrib));
              if (tip.length) {
                var popup = $("<div>",{class:"popup "+env+"_popup",html:tip.format_dict(attrib)});
                attach_popup(span,popup);
              }
              found = true;
              break;
            }
          }
        }
        if (!found) {
          span.html("label:"+label);
        }
      }
    }
    return span;
  });

  // MathJax configure
  $.getScript(MathJaxURL, function() {
    MathJax.Hub.Config({
      config: ["MMLorHTML.js"],
      jax: ["input/TeX","input/MathML","output/HTML-CSS","output/NativeMML"],
      "HTML-CSS": {
        scale: mathjax_scale
      },
      tex2jax: {
        inlineMath: [ ['$','$'], ["\\(","\\)"] ],
        displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
      },
      extensions: ["tex2jax.js","mml2jax.js","MathMenu.js","MathZoom.js"],
      TeX: {
        extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js"],
        Macros: macros
      }
    });
  });

  if (biblio) {
    $.getJSON(biblio,function(sources) {
      for (label in sources) {
        source = sources[label];
        auths = source["author"].split(" and ");
        lasts = [];
        for (i in auths) {
          auth = auths[i];
          toks = auth.split(",");
          if (toks.length == 1) {
            lasts.push(auth.split(" ").pop());
          } else{
            lasts.push(toks[0]);
          }
        }
        if (lasts.length == 1) {
          full = lasts[0];
        } else if (lasts.length == 2) {
          full = lasts[0]+" and "+lasts[1];
        } else {
          lasts.push("and "+lasts.pop());
          full = lasts.join(", ");
        }
        source["cite_form"] = full+" ("+source["year"]+")";
      }

      // dereferences citations
      $("cite").replaceWith(function () {
        var cite = $(this);
        var span = $("<span>",{class:"cite_text"});
        if (cite.attr("label")) {
          var label = cite.attr("label");
          if (sources.hasOwnProperty(label)) {
            src = sources[label];
            //link_url = "http://scholar.google.com/scholar?q="+encodeURIComponent(src["title"]);
            //var link = $("<a>",{href:link_url,html:src["cite_form"]})
            span.html(src["cite_form"]);
            pop_txt = src["title"];
            if (src.hasOwnProperty("journal")) {
              pop_txt += " ("+src["journal"]+")";
            }
            popup = $("<div>",{html:pop_txt,class:"cite_popup"});
            attach_popup(span,popup);
          } else {
            span.html("source:"+label);
          }
        }
        return span;
      });
    });
  } else {
    $("cite").replaceWith(function () {
      var cite = $(this);
      var span = $("<span>",{class:"cite_text"});
      if (cite.attr("label")) {
        var label = cite.attr("label");
        span.html("source:"+label);
      }
      return span;
    });
  }

});
