ellsworth
=========

Ellsworth is a web framework for displaying academic articles. The aim is to retain the typesetting functionality of LaTex, by using the incredible MathJaX library, while replacing the formatting functions with web technology. The end result is increased ease of use for the both the producer and consumer of content, in addition to a greater ability to integrate with other elements of the web. The documents themselves are simple XML-like documents that are converted at view-time into valid HTML documents using Javascript. See `test.html` for a simple example document and `sequential.html` for a longer, more advanced one.

The core of the library is in `ellsworth.js`. Styling in the form of CSS is in `core.css` and `mobile.css`. These two are intended to add some element of responsiveness to the UI, though using a more robust framework like `Bootstrap.js` may be a good idea in the future. The user is of course free to extend the document arbitrarily using addition Javascript and CSS. Additionally, there is an internal configuration system. Here's an example of what I use:

```
EllsworthConfig({
  macros: {
    fr: ['\\frac{#1}{#2}',2],
    pr: ['\\left(#1\\right)',1],
    br: ['\\left[#1\\right]',1],
    cb: ['\\left\\{#1\\right\\}',1],
    pder: ['\\frac{\\partial #1}{\\partial #2}',2],
  },
  environs: {
    fact: ['<b>Fact {number}.</b> &nbsp; {content}','Fact {number}','{content}'],
    proposition: ['<b>Proposition {number}.</b> &nbsp; {content}','Proposition {number}','{content}'],
    proof: ['<b>Proof.</b> &nbsp; {content}','Proof {number}','{content}']
  },
  biblio: "sequential_biblio.json"
});
```

Elements of `macros` are simple substitution rules. The first part is a string defining the rule, where as in latex, we use `#n` for the nth argument. The second part is simply the number of arguments. These are passed directly to MathJax.

Elements of `environs` are akin to LaTeX environments. Here the first element is displayed at declaration, the second argument is displayed for in-document references, and the third is displayed when hovering over a reference (this is optional). There are two special variables defined: `number` which is the number assigned to that instance (think theorem number), and `content`, which is what was put inside that instance in the document (think theorem text). In addition, you may give arbitrary HTML attributes to environments and reference them by name in these declarations.

The `biblio` option is simply for including a JSON formatted bibliography file.
