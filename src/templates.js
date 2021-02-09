/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var fs = require('fs');
var log = require('winston');
var path = require('path');
var handlebars = require('handlebars');
var marked = require('marked');

var doxyparser = require('./parser');
var helpers = require('./helpers');
var markdown = require('./markdown');

const REFREGEX = /(\{\#ref[^\}]+\})/g;

module.exports = {

  // Loaded templates
  templates : {},

  // Load templates from the given directory
  load : function(templateDirectory) {
    fs.readdirSync(templateDirectory).forEach(function(filename) {
      var fullname = path.join(templateDirectory, filename);
      var template = handlebars.compile(fs.readFileSync(fullname, 'utf8'),
                                        {noEscape : true, strict : true});
      this.templates[filename.match(/(.*)\.md$/)[1]] = template;
    }.bind(this));
  },

  render : function(compound) {
    var template;

    log.verbose('Rendering ' + compound.kind + ' ' + compound.fullname);

    switch (compound.kind) {
    case 'index':
      template = 'index';
      break;
    case 'page':
      template = 'page'
      break;
    case 'group':
    case 'namespace':
      if (Object.keys(compound.compounds).length === 1 &&
          compound.compounds[Object.keys(compound.compounds)[0]].kind ==
              'namespace') {
        return undefined;
      }
      template = 'namespace';
      break;
    case 'class':
    case 'struct':
      template = 'class';
      break;
    default:
      log.warn('Cannot render ' + compound.kind + ' ' + compound.fullname);
      console.log('Skipping ', compound);
      return undefined;
    }

    return this.templates[template](compound).replace(/(\r\n|\r|\n){3,}/g,
                                                      '$1\n');
  },

  renderArray : function(compounds) {
    return compounds.map(
        function(compound) { return this.render(compound); }.bind(this));
  },

  // Register handlebars helpers
  registerHelpers : function(options) {
    // Escape the code for a table cell.
    handlebars.registerHelper('cell', function(code) {
      return code.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
    });

    // Escape the code for a titles.
    handlebars.registerHelper(
        'title', function(code) { return code.replace(/\n/g, '<br/>'); });

    // to HTML
    handlebars.registerHelper('html', function(text) {
      var refs = text.match(REFREGEX), token = "#XXX", i = 0;
      return ("" + marked(text.replace(REFREGEX, token))).replace(token, () => refs[i++])
    });

    // Generate an anchor for internal links
    handlebars.registerHelper(
        'anchor', function(name) { return helpers.getAnchor(name, options); });
    handlebars.registerHelper({
      eq : function(v1, v2) { return v1 === v2; },
      ne : function(v1, v2) { return v1 !== v2; },
      lt : function(v1, v2) { return v1 < v2; },
      gt : function(v1, v2) { return v1 > v2; },
      lte : function(v1, v2) { return v1 <= v2; },
      gte : function(v1, v2) { return v1 >= v2; },
      isprodand : function(v) {
        return (v != '' && process.env.PROD == 1) || process.env.PROD != 1;
      },
      and : function() {
        return Array.prototype.slice.call(arguments, 0, -1)
            .map((x) => x && x.length)
            .every(Boolean);
      },
      or : function() {
        return Array.prototype.slice.call(arguments, 0, -1)
            .map((x) => x.length)
            .some(Boolean);
      }
    });
    /*
    handlebars.registerHelper(
        'trim_fn', function(name) {
        if (options.language == "python")


        });
        */
  }
};
