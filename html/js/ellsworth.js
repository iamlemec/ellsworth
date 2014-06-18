// include proper css file, desktop or mobile
var uagent = navigator.userAgent.toLowerCase();
var deviceMobile = "(android|iphone|ipod|ipad)";
if (uagent.search(deviceMobile) > -1) {
  mathjax_scale = 100;
  mobile = true;
  cssFile = "css/mobile.css";
} else {
  mathjax_scale = 86;
  mobile = false;
  cssFile = "css/core.css";
}
var cssLine = "<link href=\"" + cssFile + "\" type=\"text/css\" rel=\"stylesheet\"/>";
document.write(cssLine);

// Things that should rightfully already exist
String.prototype.format_dict = function(dict) {
  return this.replace(/{(.+?)}/g, function(match,key) {
    return (typeof(dict[key])!='undefined') ? dict[key] : key;
  });
};

extend = function(obj1,obj2) {
  for (k in obj2) {
    obj1[k] = obj2[k];
  }
};

// Library configuration
var ec = {
  macros: {},
  replacements: {},
  environs: {},
  biblio: ""
};

function EllsworthConfig(c) {
  for (v in c) {
    if (v=="macros") {
      extend(ec["macros"],c["macros"]);
    } else if (v=="replacements") {
      extend(ec["replacements"],c["replacements"]);
    } else if (v=="environs") {
      extend(ec["environs"],c["environs"]);
    } else {
      ec[v] = c[v];
    }
  }
}

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

  // create outer box
  $("body").append($("<div>",{class:"outer_box"}).append($("body>")));
  outer_box = $("div.outer_box");

  // make title
  $("header").replaceWith(function () {
    header = $(this);
    div = $("<div>",{class:"header_box"}).append(header.children());
    return div;
  });

  $("body title").replaceWith(function () {
    title = $(this);
    h1text = $("<h1>",{html:title.html(),class:"title_name"});
    return h1text;
  });

  $("author").replaceWith(function () {
    author = $(this);
    auth_text = author.html();
    if (author.attr("affiliation")) {
      auth_text += " ("+author.attr("affiliation")+")";
    }
    h3text = $("<h3>",{html:auth_text,class:"author_name"});
    return h3text;
  });

  $("abstract").replaceWith(function () {
    abstract = $(this);
    div = $("<div>",{class:"abstract_box"});
    abstract_head = $("<h4>",{html:"Abstract",class:"abstract_head"});
    abstract_body = $("<p>",{html:abstract.html(),class:"abstract_body"});
    div.append(abstract_head);
    div.append(abstract_body);
    return div;
  });

  // do replacements
  var n_sections = 0;
  $("section").replaceWith(function () {
    var sec = $(this);
    var div = $("<div>",{class:"section_box",sec_num:++n_sections,sec_title:sec.attr("title"),label:sec.attr("label"),n_subsections:0});
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

  var n_footnotes = 0;
  $("footnote").replaceWith(function () {
    var foot = $(this);
    var foot_num = ++n_footnotes;
    var foot_text = foot.html();
    var sup = $("<sup>",{class:"footnote_mark",foot_num:foot_num,html:foot_num,label:foot.attr("label"),foot_text:foot_text});
    var popup = $("<div>",{class:"footnote_popup",html:foot_text});
    attach_popup(sup,popup);
    return sup;
  });

  var n_equations = 0;
  $("equation").replaceWith(function () {
    var eqn = $(this);
    var div_box = $("<div>",{class:"equation_box"});
    var div = $("<div>",{class:"equation_inner",html:"$$"+$(this).html()+"$$"});
    div_box.append(div);
    if (eqn.attr("label")) {
      var eqn_num = ++n_equations;
      div.attr("label",eqn.attr("label"));
      div.attr("eqn_num",eqn_num);
      var opp_div = $("<div>",{class:"equation_number"});
      div.before(opp_div);
      var num_div = $("<div>",{class:"equation_number",html:eqn_num});
      div.after(num_div);
    }
    return div_box;
  });

  // image is taken for whatever reason
  $("media").replaceWith(function () {
    return $("<img>",{src:$(this).attr("source"),class:"media"});
  });

  var n_figures = 0;
  $("figure").replaceWith(function () {
    var fig = $(this);
    var fig_num = ++n_figures;
    var div = $("<div>",{class:"figure_box",fig_num:fig_num,label:fig.attr("label")});
    if (fig.attr("title")) {
      div.append($("<h3>",{html:"Figure "+fig_num+": "+fig.attr("title"),class:"figure_title"}));
    }
    div.append(fig.children());
    if (fig.attr("caption")) {
      div.append($("<p>",{html:fig.attr("caption"),class:"figure_caption"}));
    }
    return div;
  });

  var n_tables = 0;
  $("table").replaceWith(function () {
    var tab = $(this);
    var tab_num = ++n_tables;
    var div = $("<div>",{class:"table_box",fig_num:tab_num,label:tab.attr("label")});
    if (tab.attr("title")) {
      div.append($("<h3>",{html:"Table "+tab_num+": "+tab.attr("title"),class:"table_title"}));
    }
    var datf = $("<table>",{class:"dataframe"});
    datf.append(tab.children());
    div.append(datf);
    if (mobile) {
      var viewport_width = Math.max(document.documentElement.clientWidth,window.innerWidth||0);
      var div_width = div.width();
      div.css("-webkit-transform-origin","top left");
      div.css("-webkit-transform","scale("+viewport_width/div_width+")");
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
  for (rep in ec["replacements"]) {
    $(rep).replaceWith(function () {
      elem = $(this);
      tag = ec["replacements"][rep];
      div = $("<"+tag+">",{html:elem.html()});
      return div;
    })
  }

  // implement custom environments
  var n_environs;
  for (env in ec["environs"]) {
    n_environs = 0;
    $(env).replaceWith(function () {
      elem = $(this);
      rule = ec["environs"][env];
      content = rule[0];
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
      if ((fig=$("div.figure_box[label="+label+"]")).length) {
        span.html("Figure "+fig.attr("fig_num"));
        var popup = $("<div>",{class:"fig_popup",html:fig.html()});
        attach_popup(span,popup,0.5);
      } else if ((eqn=$("div.equation_inner[label="+label+"]")).length) {
        span.html("Equation "+eqn.attr("eqn_num"));
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
        for (env in ec["environs"]) {
          rule = ec["environs"][env];
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

  $.getScript(MathJaxURL, function() {
    MathJax.Hub.Config({
      jax: ["input/TeX","output/HTML-CSS"],
      "HTML-CSS": {
        scale: mathjax_scale,
        linebreaks: { automatic: true, width: "100%" }
      },
      SVG: {
        scale: mathjax_scale,
        linebreaks: { automatic: true, width: "100%" }
      },
      tex2jax: {
        inlineMath: [ ['$','$'], ["\\(","\\)"] ],
        displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
      },
      extensions: ["tex2jax.js"],
      TeX: {
        extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js"],
        Macros: ec["macros"]
      }
    });
  });

  if (ec["biblio"]) {
    $.getJSON(ec["biblio"],function(sources) {
      for (label in sources) {
        // collect author names
        var source = sources[label];
        var names = source["author"].split(" and ");
        var authors = [];
        for (i in names) {
          var name = names[i];
          var toks = name.split(",",2);
          if (toks.length == 1) {
            authors.push(name.split(" ",2).reverse());
          } else{
            authors.push(toks);
          }
        }
        source["authors"] = authors;

        // for in text citations
        var cite_form;
        cite_form = "";
        for (i in authors) {
          auth = authors[i];
          if (i==0) {
            cite_form += auth[0];
          } else if (i==authors.length-1) {
            if (authors.length>2) { // && YOURE_NOT_A_HUGE_DBAG
              cite_form += ",";
            }
            cite_form += " and "+auth[0];
          } else {
            cite_form += ", "+auth[0];
          }
        }
        cite_form += " ("+source["year"]+")";
        source["cite_form"] = cite_form;

        // for references in bibliography
        bib_form = "";
        for (i in authors) {
          auth = authors[i];
          if (i==0) {
            bib_form += auth[0]+", "+auth[1];
          } else if (i==authors.length-1) {
            if (authors.length>2) { // && YOURE_NOT_A_HUGE_DBAG
              bib_form += ",";
            }
            bib_form += " and "+auth[1]+" "+auth[0];
          } else {
            bib_form += ", "+auth[1]+" "+auth[0];
          }
        }
        bib_form += ". ";
        bib_form += source["year"]+". ";
        bib_form += "\""+source["title"]+".\" ";
        if ("journal" in source) {
          bib_form += "<i>"+source["journal"]+"</i>. ";
        }
        if (("volume" in source)&&("number" in source)&&("pages" in source)) {
          bib_form += source["volume"]+" ("+source["number"]+"): "+source["pages"]+".";
        }
        source["bib_form"] = bib_form;

        // track if we should put it in bibliography
        source["used"] = false;
      }

      // dereferences citations
      $("cite").replaceWith(function () {
        var cite = $(this);
        var span = $("<span>",{class:"cite_text"});
        if (cite.attr("label")) {
          var label = cite.attr("label");
          if (sources.hasOwnProperty(label)) {
            src = sources[label];
            src["used"] = true;
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

      // write bibliography if needed
      $("bibliography").replaceWith(function () {
        var bib = $("<div>",{class:"bibliography_box"});
        var bib_head = $("<h2>",{class:"bibliography_head",html:"Bibliography"});
        bib.append(bib_head);
        var ref_list = [];
        for (label in sources) {
          var source = sources[label];
          if (source["used"]) {
            ref_list.push(source["bib_form"]);
          }
        }
        ref_list.sort();
        for (i in ref_list) {
          var ref = ref_list[i];
          bib.append($("<div>",{html:ref,class:"bibliography_item"}));
        }
        return bib;
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
