(function () {
    'use strict';

    /**
     * This variable contains all "module"-objects from all the files that have been loaded so far.
     * If a module has loaded, it is saved here in the format FileURL -> "module"-object
     *
     * loadedModules["helper"] = {
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
     * @param nodeURI String describing the modules location relative to the caller, like "../test/mymodule"
     * @param callingModule "module"-object of the calling module that provides the context info needed to create a URI
     * @returns {{name: string, path: Array, URI: string}}
     */
    var getURIInfo = function getURIInfo(nodeURI, callingModule){

        var uriParts = nodeURI.split("/");

        // Last part of the uri is the module name
        var moduleName = uriParts.pop();

        // Path is an array containing strings
        // to get the absolute path, we combine the path of the caller with the path of the called module
        var path = callingModule.path.concat(uriParts);
        var URI = path.join("/") + "/" + moduleName + ".js";

        return {
            name: moduleName,
            path: path,
            URI: URI
        };
    };


    /**
     * Loads a module that has not already been cached.
     * This loads the files content and evaluates it with a function constructor, passing in request and module
     *
     * @param uriInfo - An info object containing the module name, path and URI of the module to load
     * @returns {{name: string, path: (Array.<string>), URI: (string), exports: {}}}
     */
    var loadNewModule = function loadNewModule(uriInfo) {


        // Creating the "Module" Object we pass into the loaded module to declare exports off
        var module = {
            name: uriInfo.name,
            path: uriInfo.path.slice(0), // FIXME do we even need to copy?
            URI: uriInfo.URI,
            exports: {}
        };

        // Fetch the file we need
        var fileContent = fetchFile(module.URI);
        // Add sourcemapping so we can debug the loaded files
        fileContent += ("\r\n//# sourceURL=" + module.URI);

        // so this is a neat little trick we are going to use... by binding the "require"-function that we pass into
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
     * Takes a nodeURI to a module, loads the module, caches it and returns it to the caller.
     * This function gets used to load the entry-file, but it also gets passed into the modules
     * as the "require()"-function to load the dependencies of that file.
     * If a required module is already cached, it will return the cached module instead of loading it again.
     *
     * @NOTE The "this" context of this function is the "module"-object of the module that calls "require()" or,
     *          if the module is the entry-module, a stub context with empty values
     *
     * @param nodeURI: node-style identifier of the module, like "utils/helper" for "utils/helper.js"
     * @returns {Object} the given Modules "exports" object.
     */
    var loadModule = function loadModule(nodeURI) {

        console.mt_module_debug("#MT-Module: calling 'require()' from this module:", this);

        // first we need to get all the module URI information we need to properly describe the module
        // based on the string that gets supplied to "require()" (nodeURI) and the context of the calling module (this).
        var uriInfo = getURIInfo(nodeURI, this);
        var moduleName = uriInfo.name;

        // TODO Detect & warn about cyclic dependencies here!

        if (!!loadedModules[moduleName]) { // If the module is already loaded and cached, return the cached version
            console.mt_module_debug("#MT-Module: we already have the module", moduleName, "loaded, serving it now");

        } else { // If the module has not yet been loaded, load and cache it before returning the result
            console.mt_module_debug("#MT-Module: loading new module", uriInfo, "now");

            var module = loadNewModule(uriInfo);
            loadedModules[moduleName] = module;
        }

        console.mt_module_debug("#MT-Module: successfully loaded module", loadedModules[moduleName]);
        return loadedModules[moduleName].exports;
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
        var initialRequestContext = {
            name: null,
            path: [],
            URI: null
        };
        loadModule.call(initialRequestContext, entryScriptURI);

        console.mt_module_debug("#MT-Module: Initial call loaded the following modules:", loadedModules);
    };

    // Call the function depending on whether we have to "waitForDom"
    if (wait) window.onload = startFunc;
    else startFunc();

})();
