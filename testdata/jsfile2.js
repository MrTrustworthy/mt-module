

console.log("#TEST2: Starting jsfile2.js now!");

var file3 = require("more/jsfile3");

console.log("#TEST2: Loaded the 3rd testfile:", file3);


module.exports = {
    info: "I am the second JS file!"
};