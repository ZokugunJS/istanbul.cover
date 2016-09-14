#!/usr/bin/env node
/**
 * cli.js
 * Version 0.4.0
 * March 4th, 2016
 *
 * Copyright (c) 2016 Baptiste Augrain
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 **/
var istanbul = require('istanbul');
var fs = require('fs');
var hook = require('istanbul/lib/hook.js');
var matcherFor = require('istanbul/lib/util/file-matcher').matcherFor;
var mkdirp = require('istanbul/node_modules/mkdirp');
var Module = require('module');
var path = require('path');

var ObjectAppend = function(object) { // {{{
	for(var i = 1, l = arguments.length; i < l; i++) {
		var extended = arguments[i] || {};
		for(var key in extended) {
			object[key] = extended[key];
		}
	}
	return object;
}; // }}}

var jsonConfig = require(path.join(process.cwd(), 'istanbul.json'));
var config = istanbul.config.loadObject(ObjectAppend(istanbul.config.defaultConfig(), jsonConfig));
var verbose = config.verbose;
//console.log(JSON.stringify(config, null, 2));

var Report = require('istanbul/lib/report');

var excludes = config.instrumentation.excludes(true);

var reportingDir = path.resolve(config.reporting.dir());
mkdirp.sync(reportingDir); //ensure we fail early if we cannot do this

var reporter = new istanbul.Reporter(config);
reporter.dir = reportingDir;

var reports = config.reporting.reports();
var index;
for(var i = 0; i < reports.length; i++) {
	if(~(index = reports[i].indexOf(':'))) {
		Report.register(require(reports[i].substr(index + 1)));
		
		reporter.add(reports[i].substr(0, index));
	}
	else {
		reporter.add(reports[i]);
	}
}
//reporter.addAll(config.reporting.reports());

if(config.reporting.print() !== 'none') {
	switch(config.reporting.print()) {
		case 'detail':
			reporter.add('text');
			break;
		case 'both':
			reporter.add('text');
			reporter.add('text-summary');
			break;
		default:
			reporter.add('text-summary');
	}
}

excludes.push(path.relative(process.cwd(), path.join(reportingDir, '**', '*')));

matcherFor({
	root: config.instrumentation.root() || process.cwd(),
	includes: config.instrumentation.extensions().map(function (ext) {
		return '**/*' + ext;
	}),
	excludes: excludes
}, function(error, matchFn) {
	if(error) {
		return console.error(error);
	}
	
	var coverageVar = '$$cov_' + new Date().getTime() + '$$';
	var instrumenter = new istanbul.Instrumenter({
		coverageVariable: coverageVar,
		preserveComments: true
	});
	
	var transformer = instrumenter.instrumentSync.bind(instrumenter);
	
	var hookOpts = {
		verbose: verbose,
		extensions: config.instrumentation.extensions()
	};
	
	hook.hookRequire(matchFn, transformer, hookOpts);
	
	//initialize the global variable to stop mocha from complaining about leaks
	global[coverageVar] = {};
	
	// enable passing --handle-sigint to write reports on SIGINT.
	// This allows a user to manually kill a process while
	// still getting the istanbul report.
	if(config.hooks.handleSigint()) {
		process.once('SIGINT', process.exit);
	}
	
	process.once('exit', function () {
		var file = path.resolve(reportingDir, 'coverage.json');
		
		if(typeof global[coverageVar] === 'undefined' || Object.keys(global[coverageVar]).length === 0) {
			console.error('No coverage information was collected, exit without writing coverage information');
			return;
		}
		else {
			cov = global[coverageVar];
		}
		
		//important: there is no event loop at this point
		//everything that happens in this exit handler MUST be synchronous
		if(config.instrumentation.includeAllSources()) {
			// Files that are not touched by code ran by the test runner is manually instrumented, to
			// illustrate the missing coverage.
			matchFn.files.forEach(function(file) {
				if(!cov[file]) {
					transformer(fs.readFileSync(file, 'utf-8'), file);
					
					// When instrumenting the code, istanbul will give each FunctionDeclaration a value of 1 in coverState.s,
					// presumably to compensate for function hoisting. We need to reset this, as the function was not hoisted,
					// as it was never loaded.
					Object.keys(instrumenter.coverState.s).forEach(function(key) {
						instrumenter.coverState.s[key] = 0;
					});
					
					cov[file] = instrumenter.coverState;
				}
			});
		}
		
		mkdirp.sync(reportingDir);
		//yes, do this again since some test runners could clean the dir initially created
		
		if(config.reporting.print() !== 'none') {
			console.error('=============================================================================');
			console.error('Writing coverage object [' + file + ']');
		}
		
		fs.writeFileSync(file, JSON.stringify(cov), 'utf8');
		
		collector = new istanbul.Collector();
		collector.add(cov);
		
		if(config.reporting.print() !== 'none') {
			console.error('Writing coverage reports at [' + reportingDir + ']');
			console.error('=============================================================================');
		}
		
		reporter.write(collector, true, function() {
		});
	});
	
	var cmd = require(jsonConfig.cover.cmd)(jsonConfig.cover.args);
	
	if(verbose) {
		console.log('Running: ' + process.argv.join(' '));
	}
	process.env.running_under_istanbul=1;
	
	Module.runMain(cmd, null, true);
});