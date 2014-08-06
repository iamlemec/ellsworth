// Things that should rightfully already exist
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

  MathJax.Hub.Config({
    MMLorHTML: { prefer: { Firefox: "MML" } },
    tex2jax: {
      inlineMath: [ ['$','$'], ["\\(","\\)"] ],
      displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
    },
    TeX: {
      Macros: ec["macros"]
    }
  });
  MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
}

// perform substitutions once document is ready
jQuery(document).ready(function($) {
  // perform string substitutions based on a dictionary, kind of a lame implementation of python format
  String.prototype.format_dict = function(dict) {
    return this.replace(/{(.+?)}/g, function(match,key) {
      return (typeof(dict[key])!='undefined') ? dict[key] : key;
    });
  };

  // for a hover event and scale factor (of the realized object), generate appropriate css
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

  // get a dictionary of attributes for an element, this doesn't exist already?
  get_attributes = function(elem) {
    var attributes = {};
    $(elem[0].attributes).each(function(index,attr) {
      attributes[attr.name] = attr.value;
    });
    return attributes;
  };

  // attach a popup to parent using given scale factor (default 1.0)
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

  // create outer box for everyone to live in
  $("body").append($("<div>",{class:"outer_box container",role:"main"}).append($("body>")));
  outer_box = $("div.outer_box");

  // make header - title, author, abstract
  $("header title").replaceWith(function () {
    title = $(this);
    h1text = $("<h1>",{html:title.html(),class:"title_name"});
    return h1text;
  });

  $("header author").replaceWith(function () {
    author = $(this);
    auth_text = author.html();
    if (author.attr("affiliation")) {
      auth_text += " ("+author.attr("affiliation")+")";
    }
    h3text = $("<h3>",{html:auth_text,class:"author_name"});
    return h3text;
  });

  $("header abstract").replaceWith(function () {
    abstract = $(this);
    div = $("<div>",{class:"abstract_box"});
    abstract_head = $("<h4>",{html:"Abstract",class:"abstract_head"});
    abstract_body = $("<p>",{html:abstract.html(),class:"abstract_body"});
    div.append(abstract_head);
    div.append(abstract_body);
    return div;
  });

  $("header").replaceWith(function () {
    header = $(this);
    div = $("<div>",{class:"header_box"}).append(header.children());
    return div;
  });

  // insert section titles
  var n_sections = 0;
  $("section").replaceWith(function () {
    var sec = $(this);
    var label = sec.attr("label");
    var div = $("<div>",{class:"section_box",sec_num:++n_sections,sec_title:sec.attr("title"),n_subsections:0});
    if (label) { div.attr("id","section_"+label); }
    div.append($("<h2>",{html:div.attr("sec_num")+" &nbsp; "+div.attr("sec_title"),class:"section_title"}));
    div.append(sec.children());
    return div;
  });

  // we only go down to the subsection now - this is bad
  $("subsection").replaceWith(function () {
    var sec = $(this);
    var label = sec.attr("label");
    parent = sec.parent("div.section_box");
    sec_num = parent.attr("sec_num");
    subsec_num = Number(parent.attr("n_subsections"))+1;
    parent.attr("n_subsections",subsec_num);
    num_text = sec_num+"."+subsec_num;
    var div = $("<div>",{class:"subsection_box",sec_title:sec.attr("title"),sec_num:sec_num,subsec_num:subsec_num});
    if (label) { div.attr("id","subsec_"+label); }
    div.append($("<h3>",{html:sec_num+"."+subsec_num+" &nbsp; "+sec.attr("title"),class:"subsection_title"}));
    div.append(sec.children());
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
    rule = ec["environs"][env];
    content = rule[0];
    $(env).replaceWith(function () {
      elem = $(this);
      label = elem.attr("label");
      orig_html = elem.html();
      elem.attr("number",++n_environs);
      elem.attr("content",orig_html);
      div = $("<div>",{class:env+"_box",html:content.format_dict(get_attributes(elem)),number:n_environs,content:orig_html});
      if (label) { div.attr("id",env+"_"+label); }
      return div;
    })
  }

  // basic text environment
  $("text").replaceWith(function () {
    var text = $(this).html();
    var p = $("<p>",{class:"paragraph_box",html:text});
    return p;
  });

  // create footnotes and attach hover popups
  var n_footnotes = 0;
  $("footnote").replaceWith(function () {
    var foot = $(this);
    var foot_num = ++n_footnotes;
    var foot_text = foot.html();
    var span = $("<span>")
    var sup = $("<sup>",{class:"footnote_mark",foot_num:foot_num,html:foot_num,label:foot.attr("label"),foot_text:foot_text});
    span.append(sup);
    var popup = $("<div>",{class:"popup footnote_popup",html:foot_text});
    attach_popup(span,popup);
    return span;
  });

  // generate equations - this wraps everything in an align environment, rather than the MathJax builtin $$, which maps to equation I assume
  var n_equations = 0;
  $("equation").replaceWith(function () {
    var eqn = $(this);
    var label = eqn.attr("label");
    var div_box = $("<div>",{class:"equation_box container-fluid"});
    var div = $("<div>",{class:"equation_inner",html:"\n\\begin{align*}"+$(this).html()+"\n\\end{align*}"});
    div_box.append(div);
    if (label) {
      div_box.attr("id","equation_"+label);
      var eqn_num = ++n_equations;
      div_box.attr("eqn_num",eqn_num);
      var opp_div = $("<div>",{class:"equation_number"});
      div.before(opp_div);
      var num_div = $("<div>",{class:"equation_number",html:eqn_num});
      div.after(num_div);
    }
    return div_box;
  });

  // standard image container - uses bootstrap responsive resizing
  $("media").replaceWith(function () {
    return $("<img>",{src:$(this).attr("source"),class:"media img-responsive"});
  });

  // figures - numbering for whole document only
  var n_figures = 0;
  $("figure").replaceWith(function () {
    var fig = $(this);
    var label = fig.attr("label");
    var fig_num = ++n_figures;
    var div = $("<div>",{class:"figure_box",fig_num:fig_num});
    if (label) { div.attr("id","figure_"+label); }
    if (fig.attr("title")) {
      div.append($("<h3>",{html:"Figure "+fig_num+": "+fig.attr("title"),class:"figure_title"}));
    }
    div.append(fig.children());
    if (fig.attr("caption")) {
      div.append($("<p>",{html:fig.attr("caption"),class:"figure_caption"}));
    }
    return div;
  });

  // tables - whole document numbering
  var n_tables = 0;
  $("table").replaceWith(function () {
    var tab = $(this);
    var label = tab.attr("label")
    var tab_num = ++n_tables;
    var div = $("<div>",{class:"table_box",tab_num:tab_num});
    if (label) { div.attr("id","table_"+label); }
    if (tab.attr("title")) {
      div.append($("<h3>",{html:"Table "+tab_num+": "+tab.attr("title"),class:"table_title"}));
    }
    var datf = $("<table>",{class:"dataframe"});
    datf.append(tab.children());
    div.append(datf);
    return div;
  });

  $("table thead").each(function () {
    var tbody = $(this);
    tbody.addClass("df_thead");
  });

  $("table tbody").each(function () {
    var tbody = $(this);
    tbody.addClass("df_tbody");
  });

  // ordered lists - autonumbering!
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

  // dereference refs - attach appropriate hover popups
  $("ref").replaceWith(function () {
    var ref = $(this);
    var span = $("<span>",{class:"ref_text"});
    if (label=ref.attr("label")) {
      if ((fig=$("div.figure_box[id=figure_"+label+"]")).length) {
        link = $("<a>",{class:"ref_link fig_link",href:"#figure_"+label,html:"Figure "+fig.attr("fig_num")});
        span.append(link);
        var popup = $("<div>",{class:"popup fig_popup",html:fig.html()});
        attach_popup(span,popup,0.5);
      } else if ((tab=$("div.table_box[id=table_"+label+"]")).length) {
        link = $("<a>",{class:"ref_link tab_link",href:"#table_"+label,html:"Table "+tab.attr("tab_num")});
        span.append(link);
        var popup = $("<div>",{class:"popup tab_popup",html:tab.html()});
        attach_popup(span,popup);
      } else if ((eqn=$("div.equation_box[id=equation_"+label+"]")).length) {
        link = $("<a>",{class:"ref_link eqn_link",href:"#equation_"+label,html:"Equation "+eqn.attr("eqn_num")});
        span.append(link);
        var popup = $("<div>",{class:"popup eqn_popup",html:eqn.children(".equation_inner").html()});
        attach_popup(span,popup);
      } else if ((sec=$("div.section_box[id=section_"+label+"]")).length) {
        link = $("<a>",{class:"ref_link sec_link",href:"#section_"+label,html:"Section "+sec.attr("sec_num")});
        span.append(link);
        var popup = $("<div>",{class:"popup sec_popup",html:sec.attr("sec_title")});
        attach_popup(span,popup);
      } else if ((sec=$("div.subsection_box[id=subsec_"+label+"]")).length) {
        link = $("<a>",{class:"ref_link subsec_link",href:"#subsec_"+label,html:"Section "+sec.attr("sec_num")+'.'+sec.attr("subsec_num")});
        span.append(link);
        var popup = $("<div>",{class:"popup sec_popup",html:sec.attr("sec_title")});
        attach_popup(span,popup);
      } else {
        // look for matches in the custom environments
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
            if ((div=$("div."+env+"_box[id="+env+"_"+label+"]")).length) {
              attrib = get_attributes(div);
              attrib["html"] = div.html();
              link = $("<a>",{class:"ref_link "+env+"_link",href:"#"+env+"_"+label,html:reference.format_dict(attrib)});
              span.append(link);
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
          // nothing doing - just output the label in error
          span.html("label: "+label).css({"color":"red"});
        }
      }
    }
    return span;
  });

  // on biblio load - parse, in text cites, end list
  if (ec["biblio"]) {
    $.getJSON(ec["biblio"],function(sources) {
      // parse bibliography into usable structure - a real shit show
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
        source["biblio_form"] = bib_form;

        // track if we should put it in bibliography
        source["used"] = false;
      }

      // check for end list
      has_biblio = $("bibliography").length > 0;

      // dereferences citations
      $("cite").replaceWith(function () {
        var cite = $(this);
        span = $("<span>");
        if (cite.attr("label")) {
          var label = cite.attr("label");
          if (sources.hasOwnProperty(label)) {
            src = sources[label];
            src["used"] = true;
            link = $("<a>",{class:"cite_link"});
            if (has_biblio) { link.attr("href","#biblio_"+label); }
            link.html(src["cite_form"]);
            span.append(link);
            pop_txt = src["title"];
            if (src.hasOwnProperty("journal")) {
              pop_txt += " ("+src["journal"]+")";
            }
            popup = $("<div>",{html:pop_txt,class:"popup cite_popup"});
            attach_popup(span,popup);
          } else {
            span.html("source:"+label).css({"color":"red"});
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
            ref_list.push({"biblio_html":source["biblio_form"],"biblio_label":label});
          }
        }
        ref_list.sort(function (a,b) { return a["biblio_html"] > b["biblio_html"]; });
        for (i in ref_list) {
          var ref = ref_list[i];
          bib.append($("<a>",{name:"biblio_"+ref["biblio_label"]}));
          bib.append($("<div>",{html:ref["biblio_html"],class:"bibliography_item"}));
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
        span.html("source:"+label).css({"color":"red"});
      }
      return span;
    });
  }
});
