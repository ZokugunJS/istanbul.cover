[@zokugun/istanbul.cover](https://github.com/ZokugunJS/istanbul.cover)
======================================================================

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

*@zokugun/istanbul.cover* allows you to configure how Istanbul covers your code generates the reports.

Configuration
-------------

It will look for the config file *istanbul.json*

```json
{
	"reporting": {
		"print": "summary",
		"reports": [
			"minimap:@zokugun/istanbul.reporter.minimap"
		],
		"watermarks": {
			"statements":	[80, 90],
			"lines":		[80, 90],
			"functions":	[80, 90],
			"branches":		[70, 80]
		}
	}, 
	"cover": {
		"cmd": "@zokugun/istanbul.cover.cmd.mocha",
		"args": ["-R", "spec"]
	}
}
```

Execute
-------

To launch Istanbul, use the command `node node_modules/zokugun.istanbul.cover/src/cli.js`.


License
-------

Copyright &copy; 2016 Baptiste Augrain

Licensed under the [MIT license](http://www.opensource.org/licenses/mit-license.php).