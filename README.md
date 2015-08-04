# MT-Module

This is a (currently very basic) Module loader for Client-Side Javascript.

It allows you to use the Commonjs/NodeJS style "require()" to handle dependencies in your client-side projects without having to compile anything.

Usage is pretty simple: Just include it in your HTML-File and point it towards your Entry-JS-File like this:

    <script src="mt-module.js" entry="/my-init-file.js"></script>
    <script src="mt-module.js" debug="true" entry="/my-init-file.js" waitForDom="true" ></script>

You can also use the script attributes to provide additional information for MT-Module. The currently supported attributes are:
* debug: Will print debug messages in case you run into trouble. Defaults to "false".
* waitForDom: Will defer the execution until window.onload. Defaults to "true".


You can then use the commonly known "require()", "module" and "exports"/"module.exports" in your Project. All "require"'d Module identifiers are URIs relative to the projects root.

    var one = require("/js/myFirstDependency.js");
    module.exports = {thisIs: "great"};

Plans for MT-Module:
* Change the module identifiers to be identical to the [CommonJS Module Specification](http://wiki.commonjs.org/wiki/Modules/1.1.1).
* Allow for asynchronous loading of the dependencies.
* Improve the current (basic) tests.
