var requirejs = require('requirejs'),
    path      = require('path'),
    document = global.document = require("jsdom").jsdom("<html><head></head><body></body></html>"),
    window = global.window = document.createWindow();

$ = require(path.normalize(__dirname + "/../../../vendor/jquery/dist/jquery.min.js"));

// Use Lab RequireJS configuration.
requirejs.config({
  // Set baseUrl to lab/src/lab using relative path of this file.
  baseUrl: path.normalize(__dirname + '/../../lab'),
  nodeRequire: require,
});

// Used by E2D -> JSON conversion script.
exports.validator = requirejs('common/validator');
exports.metadata  = requirejs('models/energy2d/metadata');
