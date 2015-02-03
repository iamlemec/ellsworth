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
};

var config = false;
function ElltwoConfig(c) {
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

  if (!config) {
    config = true;
    $(document).ready(function() {
      EllsworthBoot();
    });
  }
}

// perform substitutions once document is ready
function EllsworthBoot() {
  // perform string substitutions based on a dictionary, kind of a lame implementation of python format
  String.prototype.format_dict = function(dict) {
    return this.replace(/{(.+?)}/g, function(match,key) {
      return (typeof(dict[key])!='undefined') ? dict[key] : key;
    });
  };

  var max = function(arr) {
    return Math.max.apply(null,arr);
  };

  var min = function(arr) {
    return Math.min.apply(null,arr);
  };

  // for a hover event and scale factor (of the realized object), generate appropriate css
  var get_offset = function(parent,popup) {
    elem_width = parent.outerWidth();
    elem_height = parent.outerHeight();
    offset_x = parent.offset().left;
    offset_y = parent.offset().top;

    pop_width = popup.outerWidth();
    pop_height = popup.outerHeight();

    shift_x = 0.5*(elem_width-pop_width);
    shift_y = -2 - pop_height;

    pos_x = offset_x + shift_x;
    pos_y = offset_y + shift_y;

    return {x:pos_x,y:pos_y,width:pop_width,height:pop_height};
  };

  // get a dictionary of attributes for an element, this doesn't exist already?
  var get_attributes = function(elem) {
    var attributes = {};
    $(elem[0].attributes).each(function(index,attr) {
      attributes[attr.name] = attr.value;
    });
    return attributes;
  };

  // attach a popup to parent
  var attach_popup = function(parent,popup) {
    if (parent.hasClass("footnote_mark")) {
      console.log("attaching popup to "+parent.html());
      console.log(popup.html());
    }
    var pop_out = $("<div>",{class:"popup_outer"});
    pop_out.append(popup);
    var arrow = $("<div>",{class:"popup_arrow"});
    pop_out.append(arrow);
    parent.append(pop_out);
    pop_out.attr("shown","false");
    parent.hover(function(event) {
      if (pop_out.attr("shown")=="false") {
        pop_out.attr("shown","true");
        var offset = get_offset(parent,pop_out);
        pop_out.css("left",offset.x).css("top",offset.y);
        arrow.css("left",0.5*offset.width-5);
        pop_out.fadeIn(150);
      }
    }, function() {
      var tid = window.setTimeout(function() {
        pop_out.fadeOut(150);
        pop_out.attr("shown","false");
      },150);
      parent.mouseenter(function(event) {
        window.clearTimeout(tid);
      });
    });
  }

  // find outer box
  outer_box = $(".elltwo div.content");

  // insert section titles
  var n_sections = 0;
  $("section").replaceWith(function () {
    var sec = $(this);
    var id = sec.attr("id");
    var sec_num = ++n_sections;
    var div = $("<div>").addClass("section_box").attr("sec_title",sec.attr("title"));
    if (sec.hasClass("nonumber")) {
      div.addClass("nonumber");
      title_text = div.attr("sec_title");
    } else {
      div.attr("sec_num",sec_num);
      div.attr("n_subsections",0)
      title_text = div.attr("sec_num")+" &nbsp; "+div.attr("sec_title");
    }
    div.append($("<h2>",{html:title_text,class:"section_title"}));
    div.append(sec.children());
    return div;
  });

  // we only go down to the subsection now - this is bad
  $("subsection").replaceWith(function () {
    var sec = $(this);
    var label = sec.attr("label");
    var div = $("<div>").addClass("subsection_box").attr("sec_title",sec.attr("title"));
    var parent = sec.parent("div.section_box");
    var sec_num = parent.attr("sec_num");
    var subsec_num = Number(parent.attr("n_subsections"))+1;
    if (label) {
      div.attr("id","subsec_"+label);
    } else {
      div.attr("id","subsec_"+sec_num+"_"+subsec_num);
    }
    if (sec.hasClass("nonumber") || parent.hasClass("nonumber")) {
      title_text = sec.attr("title");
    } else {
      parent.attr("n_subsections",subsec_num);
      div.attr("sec_num",sec_num).attr("subsec_num",subsec_num);
      title_text = sec_num+"."+subsec_num+" &nbsp; "+sec.attr("title");
    }
    div.append($("<h3>",{html:title_text,class:"subsection_title"}));
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

  // generate equations
  var n_equations = 0;
  $("equation").replaceWith(function () {
    var eqn = $(this);
    var div_box = $("<div>",{class:"equation_box container-fluid"});
    var div_inner = $("<div>",{class:"equation_inner"});
    var eqn_list = eqn.html().split('\\\\');
    $.each(eqn_list, function (i,txt) {
      var row = $("<div>",{class:"equation_row"});
      try {
        katex.render("\\displaystyle{" + txt + "}",row[0]);
      } catch(e) {
        row.html(txt);
        row.css({'color': 'red'});
      }
      div_inner.append(row);
    });
    if (id=eqn.attr("id")) {
      div_box.attr("id",id);
      var eqn_num = ++n_equations;
      div_box.attr("eqn_num",eqn_num);
    } else {
      var eqn_num = "";
    }
    var opp_div = $("<div>",{class:"equation_number"});
    var num_div = $("<div>",{class:"equation_number",html:eqn_num});
    div_box.append(opp_div);
    div_box.append(div_inner);
    div_box.append(num_div);
    return div_box;
  });

  $("div.equation_box").each(function () {
    var div_inner = $(this).children(".equation_inner");
    var eqn_boxes = div_inner.children(".equation_row");
    if (eqn_boxes.length > 1) {
      var leftlist = [];
      var rightlist = [];
      var offlist = [];
      eqn_boxes.each(function () {
        var eqn = $(this);
        var ktx = eqn.children(".katex");
        var kwidth = ktx.width();
        var anchor = ktx.find(".align");
        var leftpos;
        var rightpos;
        if (anchor.length) {
          leftpos = (anchor.offset().left+anchor.width()/2) - ktx.offset().left;
          rightpos = kwidth - leftpos;
        } else {
          leftpos = kwidth/2;
          rightpos = kwidth/2;
        }
        var myoff = rightpos - leftpos;
        leftlist.push(leftpos);
        rightlist.push(rightpos);
        offlist.push(myoff);
      });
      var bigoff = max(leftlist) - max(rightlist);
      eqn_boxes.each(function (i) {
        $(this).children(".katex").css({"margin-left":bigoff+offlist[i]});
      });
    }
  });

  // typeset inline - goes very last due to math in popups
  function inline_marker(match, p, offset, string) {
      return '<span class=\"tex\">' + p + '</span>';
  }
  var inline_re = /\$([^\$]*)\$/g;
  outer_box.html(outer_box.html().replace(inline_re,inline_marker));

  // create footnotes and attach hover popups
  var n_footnotes = 0;
  $("footnote").replaceWith(function () {
    var foot = $(this);
    var foot_num = ++n_footnotes;
    var foot_text = foot.html();
    var span = $("<span>",{class:"footnote_box",html:"&#xfeff;",foot_text:foot_text}); // ZWNBSPFTW!!!
    var sup = $("<sup>",{class:"footnote_mark",html:foot_num});
    span.append(sup);
    return span;
  });

  $("span.footnote_box").each(function () {
    var span = $(this);
    var foot_text = span.attr("foot_text");
    var popup = $("<div>",{class:"popup footnote_popup",html:foot_text});
    attach_popup(span,popup);
  });

  // dereference refs - attach appropriate hover popups
  $("ref").replaceWith(function () {
    var ref = $(this);
    var span = $("<span>",{class:"ref_text"});
    if (target=ref.attr("target")) {
      if ((fig=$("div.figure_box[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link fig_link",href:"#"+target,html:"Figure "+fig.attr("fig_num")});
        var popup = $("<div>",{html:fig.attr("fig_title"),class:"popup fig_popup"});
        attach_popup(link,popup);
        span.append(link);
      } else if ((tab=$("div.table_box[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link tab_link",href:"#"+target,html:"Table "+tab.attr("tab_num")});
        var popup = $("<div>",{html:tab.attr("tab_title"),class:"popup tab_popup"});
        attach_popup(link,popup);
        span.append(link);
      } else if ((eqn=$("div.equation_box[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link eqn_link",href:"#"+target,html:"Equation "+eqn.attr("eqn_num")});
        span.append(link);
        var popup = $("<div>",{class:"popup eqn_popup",html:eqn.children(".equation_inner").html()});
        attach_popup(span,popup);
      } else if ((sec=$("section[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link sec_link",href:"#"+target,html:"Section "+sec.attr("sec_num")});
        var popup = $("<div>",{html:sec.attr("sec_title"),class:"popup sec_popup"});
        attach_popup(link,popup);
        span.append(link);
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
              tip = "";
            }
            if ((div=$("div."+env+"_box[id="+env+"_"+target+"]")).length) {
              attrib = get_attributes(div);
              attrib["html"] = div.html();
              link = $("<a>",{class:"ref_link "+env+"_link",href:"#"+env+"_"+target,html:reference.format_dict(attrib)});
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
          // nothing doing - just output the target in error
          span.html("target: "+target).css({"color":"red"});
        }
      }
    }
    return span;
  });

  $("span.tex").replaceWith(function() {
      var elem = $(this);
      var span = $("<span>");
      try {
        katex.render(elem.html(),span[0]);
      } catch(e) {
        span.html(elem.html());
        span.css({'color': 'red'});
      }
      return span;
  });

  // on biblio load - parse, in text cites, end list
  if ("biblio" in ec) {
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
            attach_popup(link,popup);
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
          bib.append($("<div>",{html:ref["biblio_html"],class:"bibliography_item",id:"biblio_"+ref["biblio_label"]}));
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
};
