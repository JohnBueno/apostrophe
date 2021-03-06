/* jshint undef: true */
var request = require('request');
var async = require('async');
var fs = require('fs');
var _ = require('underscore');
_.str = require('underscore.string');
var async = require('async');
var extend = require('extend');
var argv = require('optimist').argv;
var joinr = require('joinr');

// MongoDB prefix queries are painful without this
RegExp.quote = require("regexp-quote");

/**
 * Construct the main Apostrophe object. You typically have need only one per project, although you may have more.
 * @class
 */
function Apos() {
  var self = this;

  self.tasks = {};

  // Apostrophe is an event emitter/receiver
  require('events').EventEmitter.call(self);

  require('./templates.js')(self);

  require('./pages.js')(self);

  require('./areas.js')(self);

  require('./permissions.js')(self);

  require('./static.js')(self);

  require('./prune.js')(self);

  require('./build.js')(self);

  require('./sanitize.js')(self);

  require('./appy.js')(self);

  require('./mongodb.js')(self);

  require('./utils.js')(self);

  require('./joinr.js')(self);

  require('./migrationTools.js')(self);

  self.fail = function(req, res) {
    res.statusCode = 500;
    res.send('500 error, URL was ' + req.url);
  };

  self.forbid = function(res) {
    res.statusCode = 403;
    res.send('Forbidden');
  };

  self.notfound = function(req, res) {
    res.statusCode = 404;
    res.send('404 not found error, URL was ' + req.url);
  };

  self.generateId = function() {
    // TODO use something better, although this is not meant to be
    // ultra cryptographically secure
    return Math.floor(Math.random() * 1000000000) + '' + Math.floor(Math.random() * 1000000000);
  };

  var assets = require('./assets.js');
  assets.construct(self);

  // Functionality related to the content area editor
  var editor = require('./editor.js');
  editor.construct(self);

  var files = require('./files.js');
  files.construct(self);

  require('./tasks.js')(self);

  // We add the rest during init via editor.init(self)

  self.init = function(options, callback) {

    self.app = options.app;

    self.fileGroups = options.fileGroups || self.fileGroups;

    self.uploadfs = options.uploadfs;

    self.options = options;

    self.db = options.db;

    // TODO this option isn't a great idea since the need for compatibility with
    // other methods in permissions.js is not clear
    if (options.permissions) {
      self.permissions = options.permissions;
    }

    if (options.controls) {
      self.defaultControls = options.controls;
    }

    // An id for this particular process that should be unique
    // even in a multiple server environment
    self._pid = self.generateId();

    assets.init(self);

    files.init(self);

    editor.init(self);

    require('./push.js')(self);

    require('./aposLocals.js')(self);

    require('./videos.js')(self);

    require('./tags.js')(self);

    if (options.locals) {
      _.extend(self._aposLocals, options.locals);
    }

    // In addition to making these available in self.app.locals we also
    // make them available in our own partials later.
    _.extend(self.app.locals, self._aposLocals);

    // All routes must begin with /apos!
    self.app.get('/apos/pager', function(req, res) {
      return res.send(self.partial('pager', req.query));
    });

    if (self.uploadfs) {
      self.pushGlobalData({
        uploadsUrl: self.uploadfs.getUrl()
      });
    }

    // Must be AFTER any other /apos/ routes are registered
    self.app.get('/apos/*', self.static(__dirname + '/../public'));

    return self.initCollections(callback);
  };
}

// Required because EventEmitter is built on prototypal inheritance,
// calling the constructor is not enough
require('util').inherits(Apos, require('events').EventEmitter);

module.exports = function() {
  return new Apos();
};

