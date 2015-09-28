// Things that should rightfully already exist
extend = function(obj1,obj2) {
  for (k in obj2) {
    obj1[k] = obj2[k];
  }
};

// Library configuration
var ec = {
  environs: {},
};

var config = false;
function ElltwoConfig(c) {
  for (v in c) {
    if (v=="environs") {
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

function ElltwoSearch(term) {
  var len = term.length;
  $(".latex").each(function () {
    var eqn = $(this);
    if (latex=eqn.attr("latex")) {
      var idx = latex.search(term);
      if (idx != -1) {
        console.log(latex);
        eqn.css("border","1px solid red");
      }
    }
  });
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
  var get_offset = function(parent,popup,event) {
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;

    var rects = parent[0].getClientRects();
    var mouseX = event.clientX;
    var mouseY = event.clientY;
    var rect;
    for (var i in rects) {
      rect = rects[i];
      if ((mouseX >= rect.left) && (mouseX <= rect.right) && (mouseY >= rect.top) && (mouseY <= rect.bottom)) {
        break;
      }
    }

    var elem_width = rect.width;
    var elem_height = rect.height;
    var offset_x = scrollLeft + rect.left;
    var offset_y = scrollTop + rect.top;

    var pop_width = popup.outerWidth();
    var pop_height = popup.outerHeight();

    var shift_x = 0.5*(elem_width-pop_width);
    var shift_y = -pop_height;

    var pos_x = offset_x + shift_x;
    var pos_y = offset_y + shift_y;

    return {x:pos_x,y:pos_y};
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
    var pop_out = $("<div>",{class:"popup_outer"});
    pop_out.append(popup);
    parent.append(pop_out);
    pop_out.attr("shown","false");
    parent.hover(function(event) {
      if (pop_out.attr("shown")=="false") {
        pop_out.attr("shown","true");
        var offset = get_offset(parent,pop_out,event);
        pop_out.css("left",offset.x).css("top",offset.y);
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

  // typeset inline - goes very last due to math in popups
  function inline_marker(match, p, offset, string) {
      return '<span class=\"tex\">' + p + '</span>';
  }
  var inline_re = /\$([^\$]*)\$/g;

  // find outer box
  elltwo_box = $(".elltwo");
  outer_box = $(".elltwo div.content");

  // optional marquee box
  if (marquee=$(".elltwo div.marquee")) {
    var span = $("<span>",{class:"tex",html:"\\ell^2"});
    marquee.append(span);
  }

  // recursively number sections
  handle_section = function(parent,prefix) {
    var n_sections = 0;
    parent.children("section:not(.nonumber)").each(function () {
      var sec = $(this);
      var sec_text;
      if (pr=sec.attr("prefix")) {
        sec_text = pr; // overload prefix
      } else {
        var sec_num = ++n_sections;
        sec_text = prefix + sec_num;
      }
      sec.attr("sec-num",sec_text);
      sec.children(".title").attr("sec-num",sec_text);
      handle_section(sec,sec_text+".");
    });
  }

  // top section prefix
  var top_prefix = "";
  if (pr=outer_box.attr("prefix")) {
    top_prefix = pr;
  }
  handle_section(outer_box,top_prefix);

  // number figures
  handle_numbers = function(fclass) {
    var n = 0;
    outer_box.find("figure."+fclass).each(function () {
      var obj = $(this);
      var num = ++n;
      obj.attr(fclass+"-num",num);
      obj.children(".title").attr(fclass+"-num",num);
    });
  }
  handle_numbers("image");
  handle_numbers("table");

  // replace dollars with tex spans
  outer_box.html(outer_box.html().replace(inline_re,inline_marker));

  // tabulars are really figure-tables
  outer_box.find("figure").addClass("figure");
  outer_box.find("tabular").replaceWith(function () {
    var tab = $(this);
    var div = $("<figure>",{class:"table",id:tab.attr("id"),html:tab.html()});
    div.attr("tab-num",tab.attr("tab-num"));
    return div;
  });

  // implement custom environments
  var n_environs;
  for (env in ec["environs"]) {
    n_environs = 0;
    rule = ec["environs"][env];
    content = rule[0];
    $(env).replaceWith(function () {
      elem = $(this);
      id = elem.attr("id");
      orig_html = elem.html();
      elem.attr("number",++n_environs);
      elem.attr("content",orig_html);
      div = $("<div>",{class:env+"_box",id:id,html:content.format_dict(get_attributes(elem)),number:n_environs,content:orig_html});
      return div;
    })
  }

  // generate equations
  var n_equations = 0;
  $("equation").replaceWith(function () {
    var eqn = $(this);
    var div_box = $("<div>",{class:"equation_box"});
    var div_inner = $("<div>",{class:"equation_inner"});
    var eqn_list = eqn.html().split('\\\\');
    $.each(eqn_list, function (i,txt) {
      var row = $("<div>",{class:"equation_row latex",latex:txt});
      katex.render(txt,row[0],{displayMode: true, throwOnError: false});
      div_inner.append(row);
    });
    if (id=eqn.attr("id")) {
      div_box.attr("id",id);
      var eqn_num = ++n_equations;
      div_box.attr("eqn-num",eqn_num);
      var eqn_txt = eqn_num + "&nbsp;&#x279c;";
    } else {
      var eqn_num = "";
      var eqn_txt = "";
    }
    var num_div = $("<div>",{class:"equation_number",html:eqn_txt});
    div_box.append(num_div);
    div_box.append(div_inner);
    return div_box;
  });

  // auto align equations
  $("div.equation_box").each(function () {
    var div_inner = $(this).children(".equation_inner");
    var eqn_boxes = div_inner.children(".equation_row");
    if (eqn_boxes.length > 1) {
      var leftlist = [];
      var rightlist = [];
      var offlist = [];
      console.log('Row offsets:')
      eqn_boxes.each(function () {
        var eqn = $(this);
        var ktx = eqn.find(".katex");
        var kwidth = ktx.width();
        var anchor = ktx.find(".align");
        var leftpos;
        var rightpos;
        console.log(ktx);
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
        console.log(bigoff+offlist[i]);
        $(this).find(".katex").css({"margin-left":bigoff+offlist[i]});
      });
    }
  });

  // create footnotes and attach hover popups
  var n_footnotes = 0;
  $("footnote").replaceWith(function () {
    var foot = $(this);
    var foot_num = ++n_footnotes;
    var foot_text = foot.html();
    var span = $("<span>",{class:"footnote_box",html:"&#xfeff;",foot_text:foot_text}); // ZWNBSPFTW!!!
    var sup = $("<sup>",{class:"footnote_mark",html:foot_num});
    var popup = $("<div>",{class:"popup footnote_popup",html:foot_text});
    attach_popup(span,popup);
    span.append(sup);
    return span;
  });

  // dereference refs - attach appropriate hover popups
  $("ref").replaceWith(function () {
    var ref = $(this);
    var span = $("<span>");
    if (target=ref.attr("target")) {
      if ((fig=$("figure.image[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link fig_link",href:"#"+target,html:"Figure "+fig.attr("image-num")});
        span.append(link);
        if (title=fig.find(".title")) {
          var popup = $("<div>",{class:"popup fig_popup",html:title.html()});
          attach_popup(span,popup);
        }
      } else if ((tab=$("figure.table[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link tab_link",href:"#"+target,html:"Table "+tab.attr("table-num")});
        span.append(link);
        if (title=tab.find(".title")) {
          var popup = $("<div>",{class:"popup tab_popup",html:title.html()});
          attach_popup(span,popup);
        }
      } else if ((eqn=$("div.equation_box[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link eqn_link",href:"#"+target,html:"Equation "+eqn.attr("eqn-num")});
        span.append(link);
        var popup = $("<div>",{class:"popup eqn_popup",html:eqn.children(".equation_inner").html()});
        attach_popup(span,popup);
      } else if ((sec=$("section[id="+target+"]")).length) {
        var link = $("<a>",{class:"ref_link sec_link",href:"#"+target,html:"Section "+sec.attr("sec-num")});
        span.append(link);
        if (title=sec.find(".title")) {
          var popup = $("<div>",{class:"popup sec_popup",html:title.html()});
          attach_popup(span,popup);
        }
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
            if ((div=$("div."+env+"_box[id="+target+"]")).length) {
              attrib = get_attributes(div);
              attrib["html"] = div.html();
              link = $("<a>",{class:"ref_link "+env+"_link",href:"#"+target,html:reference.format_dict(attrib)});
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

  // render with KaTeX
  $("span.tex").replaceWith(function() {
      var elem = $(this);
      var latex = elem.html();
      var span = $("<span>",{class:"latex",latex:latex});
      katex.render(latex,span[0],{throwOnError: false});
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
        if (target=cite.attr("target")) {
          if (target in sources) {
            src = sources[target];
            src["used"] = true;
            link = $("<a>",{class:"cite_link"});
            if (has_biblio) { link.attr("href","#biblio_"+target); }
            link.html(src["cite_form"]);
            span.append(link);
            pop_txt = src["title"];
            if ("journal" in src) {
              pop_txt += " ("+src["journal"]+")";
            }
            popup = $("<div>",{html:pop_txt,class:"popup cite_popup"});
            attach_popup(link,popup);
          } else {
            span.html("source:"+target).css({"color":"red"});
          }
        }
        return span;
      });

      // write bibliography if needed
      $("bibliography").replaceWith(function () {
        var bib = $("<div>",{class:"bibliography_box"});
        var ref_list = [];
        for (target in sources) {
          var source = sources[target];
          if (source["used"]) {
            ref_list.push({"biblio_html":source["biblio_form"],"biblio_label":target});
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
      if (target=cite.attr("target")) {
        span.html("source:"+target).css({"color":"red"});
      }
      return span;
    });
  }
};
