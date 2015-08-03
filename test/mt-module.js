(function () {

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


    var loadNewModule = function loadNewModule(fileUrl, requestFunc) {

        // Fetch the file we need
        var fileContent = fetchFile(fileUrl);

        // Setting the context variables we need in the evaluated JS File.
        var request = requestFunc;
        var module = {
            name: fileUrl,
            exports: {}
        };

        // Unset some scope variables that we don't want to expose in the eval-call.
        // Why the FUCK is "let" not yet a thing???
        fileUrl = null;
        requestFunc = null;

        // We 'eval()' the loaded file and pass request, module and module.exports (as exports)
        // into the scope of the execution.
        // The eval'd file will modify the given module-object, which we return as the modules "result"/export
        // This (should/does ?) make it compatible with nodejs-modules.
        (function (request, module, exports) {
            eval(fileContent);
        })(request, module, module.exports);

        return module;
    };

    /**
     * Takes a fileURL to a module, loads the module, caches it and returns it to the caller.
     * This function gets used to load the entry-file, but it also gets passed into the modules
     * as the "request()"-function to load the dependencies of that file.
     * If a required module is already cached, it will return the cached module instead of loading it again.
     *
     * @param fileUrl: URL to the file, something like "/js/utils/helper.js"
     * @returns {Object} the given Modules "exports" object.
     */
    var loadModule = function loadFile(fileUrl) {

        if (!!loadedModules[fileUrl]) { // If the file is already loaded and cached, return the cached version
            console.mt_module_debug("#MT-Module: we already have the module", fileUrl, "loaded, serving it now");
            return loadedModules[fileUrl].exports;

        } else { // If the module has not yet been loaded, load and cache it before returning the result
            console.mt_module_debug("#MT-Module: loading new module", fileUrl, "now");
            var module = loadNewModule(fileUrl, loadModule);
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
     * @param [debug] entering "true" (string) will enable debug logs in console
     */
    var attributes = document.currentScript.attributes;


    // handle debug tag
    var debugAttribute = attributes.getNamedItem("debug");
    var debug = !!(!!debugAttribute && debugAttribute.value === "true");
    setDebug(debug);
    console.mt_module_debug("#MT-Module: Set to Debug");

    // handle the entry file url
    var entryScriptAttribute = attributes.getNamedItem("entry");
    var entryScript = (!!entryScriptAttribute && entryScriptAttribute.value);
    if (!entryScript) {
        console.error("#MT-Module: No entry script! Please set the 'entry'-attribute in the script tag!");
        return;
    }

    // start the entry file
    console.mt_module_debug("#MT-Module starting to load modules, entry point is", entryScript);
    loadModule(entryScript);
    console.mt_module_debug("#MT-Module: Initial call loaded the following modules:", loadedModules);

})();

