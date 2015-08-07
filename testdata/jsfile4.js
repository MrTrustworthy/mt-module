console.log("#TEST4: Starting jsfile4.js now!");

var jsfile3 = require("./more/jsfile3");

console.log("#TEST4: CYCLIC dependency module 3 loaded, returned with:", jsfile3);

setTimeout(function(){
    console.log("#TEST4: CYCLIC dependency module 3 loaded, got later:", jsfile3);
}, 100);