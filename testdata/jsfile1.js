


console.log("#TEST1: Starting jsfile1.js now!");


var test2Exports = require("jsfile2");

console.log("#TEST1: Loaded jsfile2, contents are:", test2Exports);






module.exports = {
    info: "Hello i am jsfile1!!!",
    otherExport: test2Exports
};