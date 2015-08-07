(function () {
    'use strict';

    /**
     * This variable contains all "module"-objects from all the files that have been loaded so far.
     * If a module has loaded, it is saved here in the format FileURL -> "module"-object
     *
     * loadedModules["/js/utils/helper.js"] = {
     *      name: "helper",
     *      path: "/js/utils/",
     *      URI: "/js/utils/helper.js",
     *      exports: {
     *          myExportThing: "hello",
     *          ....
     *      }
     * }
     *
     * @type {Object}
     */
    var loadedModules = {};

    /**
     * This function will enable/disable the console.mt_module_debug logger for this module
     * @param debug
     */
    var setDebug = function setDebug(debug) {
        if (debug) {
            console.mt_module_debug = console.info;
        } else {
            console.mt_module_debug = function () {
            };
        }
    };


    /**
     * Fetches a file with the given URI and returns it
     * TODO FIXME: Make Async in the next version!
     *
     * @param fileURI - URL to the file to be loaded, something like '/utils/helper.js'
     * @returns {String} Content of the response as text
     */
    var fetchFile = function fetchFile(fileURI) {

        // get the file via synchronous requests
        var request = new XMLHttpRequest();
        request.open("GET", fileURI, false);
        request.send(null);

        // TODO maybe add some sort of retrying here? hmmmm....
        if (request.status !== 200) {
            console.error("#MT-Module: could not fetch", fileURI, ", result was:", request.responseText);
            return "";
        }
        return request.response.toString();
    };

    /**
     * Generates a URI-Info object based on the supplied nodeURL-string and the calling modules "module"-object
     *
     * @param moduleIdentifier String describing the modules location relative to the caller, like "../test/mymodule"
     * @param callingModule "module"-object of the calling module that provides the context info needed to create a URI
     * @returns {{name: string, path: Array, URI: string}}
     */
    var getModuleInformation = function getModuleInformation(moduleIdentifier, callingModule){

        // we operate from the base path of the calling module
        var basePath = callingModule.path.slice(0);

        var uriParts = moduleIdentifier.split("/");

        // Last part of the uri is the module name
        var moduleName = uriParts.pop();

        // Path is an array containing strings
        // to get the absolute path, we combine the path of the caller with the path of the called module
        var path = null;

        // rules for the first "term" of the uri are:
        // #1: "somestring" -> this means absolute path (relative to the loaders location)
        // #2: "." -> Basically ignore it, this means relative to the calling modules location
        // #3: ".." -> this means relative to the calling module minus one folder

        // treat uri's starting with "/" the same as uri's starting with "some/path/name"
        if(uriParts[0] === "") uriParts.shift();

        // #1: ignore callers path when resolving absolute uri
        if(uriParts[0] !== "." && uriParts[0] !== "..") path = uriParts;
        else path = callingModule.path.concat(uriParts);


        // #2: filter out the "."-terms
        var i = path.indexOf(".");
        while(i !== -1){
            path.splice(i, 1);
            i = path.indexOf(".");
        }

        // #3: if possible, filter out the ".."-terms that are not at the first position and the path segment before
        // to get always the same URI for a module regardless of the callers basepath.
        // info: we use lastIndex to avoid errors in paths like "../some/path/../file"
        i = path.lastIndexOf("..");
        while(i > 0){
            path.splice(i-1, 2);
            i = path.lastIndexOf("..");
        }

        var uri = path.join("/") + "/" + moduleName + ".js";

        return {
            id: moduleName,
            path: path,
            uri: uri,
            exports: {}
        };
    };



    (function(){
        //#1

        var a = getModuleInformation("./a/b/c", {path: []});
        console.log("###A", a, "::", a.uri === "a/b/c.js");

        var a2 = getModuleInformation("./a/b/c", {path: ["x"]});
        console.log("###A", a2, "::", a2.uri === "x/a/b/c.js");

        var b = getModuleInformation("../a/b/c", {path: ["x", "y", "z"]});
        console.log("###A", b, "::", b.uri === "x/y/a/b/c.js");

        var c = getModuleInformation("some/a/b/c", {path: ["x", "y", "z"]});
        console.log("###A", c, "::", c.uri === "some/a/b/c.js");

        var d = getModuleInformation("../a/b/../c", {path: ["x", "y", "z"]});
        console.log("###A", d, "::", d.uri === "x/y/a/c.js");
    })();





    /**
     * Loads a module that has not already been cached.
     * This loads the files content and evaluates it with a function constructor, passing in request and module
     *
     * @param uriInfo - An info object containing the module name, path and uri of the module to load
     * @returns {{name: string, path: (Array.<string>), uri: (string), exports: {}}}
     */
    var loadNewModule = function loadNewModule(module) {

        // Fetch the file we need
        var fileContent = fetchFile(module.uri);
        // Add sourcemapping so we can debug the loaded files
        fileContent += ("\r\n//# sourceURL=" + module.uri);

        // so this is a neat little effect we are going to use... by binding the "require"-function that we pass into
        // the module we load to the module-objects context, we can access that modules path when "require()" is called
        // and resolve dependencies relative to the modules location
        var requireFunc = loadModule.bind(module);

        // We eval the loaded file via a Function constructor and pass require, module and module.exports (as exports)
        // into the scope of the execution.
        // The eval'd file will modify the given module-object, which we return as the modules "result"/export
        // This (should/does ?) make it compatible with commonjs/node-modules.
        (new Function("require", "module", "exports", fileContent))(requireFunc, module, module.exports);

        return module;
    };

    /**
     * Takes a moduleIdentifier to a module, loads the module, caches it and returns it to the caller.
     * This function gets used to load the entry-file, but it also gets passed into the modules
     * as the "require()"-function to load the dependencies of that file.
     * If a required module is already cached, it will return the cached module instead of loading it again.
     *
     * @NOTE The "this" context of this function is the "module"-object of the module that calls "require()" or,
     *          if the module is the entry-module, a stub context with empty values
     *
     * @param moduleIdentifier: node-style identifier of the module, like "utils/helper" for "utils/helper.js"
     * @returns {Object} the given Modules "exports" object.
     */
    var loadModule = function loadModule(moduleIdentifier) {

        console.mt_module_debug("#MT-Module: calling 'require()' from this module:", this);

        // first we need to get all the module uri information we need to properly describe the module
        // based on the string that gets supplied to "require()" (moduleIdentifier) and the context of the calling module (this).
        var moduleObject = getModuleInformation(moduleIdentifier, this);

        var moduleURI = moduleObject.uri;

        if (!!loadedModules[moduleURI]) { // If the module is already loaded and cached, return the cached version
            console.mt_module_debug("#MT-Module: we already have the module", moduleObject.id, "loaded, serving it now");

        } else { // If the module has not yet been loaded, load and cache it before returning the result
            console.mt_module_debug("#MT-Module: loading new module", moduleObject.id, "now");

            // put the module-object without the loaded "exports" into the cache to resolve cyclic dependencies with it
            // in case it is needed (see http://wiki.commonjs.org/wiki/Modules/1.1.1)
            loadedModules[moduleURI] = moduleObject;

            loadNewModule(moduleObject);

        }

        console.mt_module_debug("#MT-Module: successfully loaded module", loadedModules[moduleURI]);
        return loadedModules[moduleURI].exports;
    };

    // -----------------------------------------
    // This is where the actual execution starts
    // -----------------------------------------

    /**
     * Current available attributes for the <script> tag are:
     * @param [entry] path to the initial JS file. needs to start with a "/" in most cases.
     * @param [debug] entering "true" (string) will enable debug logs in console, defaults to false
     * @param {waitForDom} entering "false" (string) will skip waiting for window.onload, defaults to true
     */
    var attributes = document.currentScript.attributes;


    // handle debug tag, default is false
    var debugAttribute = attributes.getNamedItem("debug");
    var debug = !!(!!debugAttribute && debugAttribute.value === "true");
    setDebug(debug);
    console.mt_module_debug("#MT-Module: Set to Debug");

    // handle the entry file uRI, mandatory parameter
    var entryScriptAttribute = attributes.getNamedItem("entry");
    var entryScriptURI = (!!entryScriptAttribute && entryScriptAttribute.value);
    if (!entryScriptURI) {
        console.error("#MT-Module: No entry script! Please set the 'entry'-attribute in the script tag!");
        return;
    }

    // handle whether to wait for dom ready, defaults to yes
    var waitAttribute = attributes.getNamedItem("waitForDom");
    var wait = !(!!waitAttribute && waitAttribute.value === "false");
    console.mt_module_debug("#MT-Module: Waiting for dom:", wait);


    /**
     * This is the function that starts the entry javascript module
     */
    var startFunc = function(){
        console.mt_module_debug("#MT-Module starting to load modules, entry point is", entryScriptURI);

        // loadModule (aka "require") gets normally bound to the calling modules "module"-object to access its path.
        // For the initial loadModule/require-call, we call it with a "stub"-context to remain consistent.
        loadModule.call({path: []}, entryScriptURI);

        console.mt_module_debug("#MT-Module: Initial call loaded the following modules:", loadedModules);
    };

    // Call the function depending on whether we have to "waitForDom"
    if (wait) window.onload = startFunc;
    else startFunc();

})();
