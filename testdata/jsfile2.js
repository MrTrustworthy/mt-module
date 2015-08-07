

console.log("#TEST2: Starting jsfile2.js now!");

var file3 = require("./more/jsfile3");

console.log("#TEST2: ----Loaded the 3rd testfile:", file3);

var file3_2 = require("testdata/more/jsfile3");

console.log("#TEST2: ----Loaded the 3rd testfile AGAIN:", file3_2);


module.exports = {
    info: "I am the second JS file!"
};