(function () {
    'use strict';

    /**
     * This variable contains all "module"-objects from all the files that have been loaded so far.
     * If a module has loaded, it is saved here in the format FileURL -> "module"-object
     *
     * loadedModules["/js/utils/helper.js"] = {
     *      name: "/js/utils/helper.js",
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
     * @param fileUrl - URL to the file to be loaded, something like '/utils/helper.js'
     * @returns {String} Content of the response as text
     */
    var fetchFile = function fetchFile(fileUrl) {

        // get the file via synchronous requests
        var request = new XMLHttpRequest();
        request.open("GET", fileUrl, false);
        request.send(null);

        // TODO maybe add some sort of retrying here? hmmmm....
        if (request.status !== 200) {
            console.error("#MT-Module: could not fetch", fileUrl, ", result was:", request.responseText);
            return "";
        }
        return request.response.toString();
    };


    /**
     * Loads a module that has not already been cached.
     * This loads the files content and evaluates it with a function constructor, passing in request and module
     *
     * @param fileUrl - Url to the file to be loaded
     * @returns {{name: *, exports: {}}}
     */
    var loadNewModule = function loadNewModule(fileUrl) {

        // Fetch the file we need
        var fileContent = fetchFile(fileUrl);

        // Creating the "Module" Object we pass into the loaded module to declare exports off
        var module = {
            name: fileUrl,
            exports: {}
        };

        // Add sourcemapping
        fileContent += ("\r\n//# sourceURL=" + fileUrl);

        // We eval the loaded file via a Function constructor and pass require, module and module.exports (as exports)
        // into the scope of the execution.
        // The eval'd file will modify the given module-object, which we return as the modules "result"/export
        // This (should/does ?) make it compatible with commonjs/node-modules.
        (new Function("require", "module", "exports", fileContent))(loadModule, module, module.exports);

        return module;
    };

    /**
     * Takes a fileURL to a module, loads the module, caches it and returns it to the caller.
     * This function gets used to load the entry-file, but it also gets passed into the modules
     * as the "require()"-function to load the dependencies of that file.
     * If a required module is already cached, it will return the cached module instead of loading it again.
     *
     * @param fileUrl: URL to the file, something like "/js/utils/helper.js"
     * @returns {Object} the given Modules "exports" object.
     */
    var loadModule = function loadModule(fileUrl) {

        if (!!loadedModules[fileUrl]) { // If the file is already loaded and cached, return the cached version
            console.mt_module_debug("#MT-Module: we already have the module", fileUrl, "loaded, serving it now");
            return loadedModules[fileUrl].exports;

        } else { // If the module has not yet been loaded, load and cache it before returning the result
            console.mt_module_debug("#MT-Module: loading new module", fileUrl, "now");
            var module = loadNewModule(fileUrl);
            loadedModules[fileUrl] = module;
            return module.exports;
        }
    };

    // ---------------------------------------
    // This is where the actual loading starts
    // ---------------------------------------

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

    // handle the entry file url, mandatory parameter
    var entryScriptAttribute = attributes.getNamedItem("entry");
    var entryScript = (!!entryScriptAttribute && entryScriptAttribute.value);
    if (!entryScript) {
        console.error("#MT-Module: No entry script! Please set the 'entry'-attribute in the script tag!");
        return;
    }

    // handle whether to wait for dom ready, defaults to yes
    var waitAttribute = attributes.getNamedItem("waitForDom");
    var wait = !(!!waitAttribute && waitAttribute.value === "false");
    console.mt_module_debug("#MT-Module: Waiting for dom:", wait);

    // start the entry file
    var startFunc = function(){
        console.mt_module_debug("#MT-Module starting to load modules, entry point is", entryScript);
        loadModule(entryScript);
        console.mt_module_debug("#MT-Module: Initial call loaded the following modules:", loadedModules);
    };

    // start the execution either right away or only after window.onload occurs
    if (wait) window.onload = startFunc;
    else startFunc();




})();
