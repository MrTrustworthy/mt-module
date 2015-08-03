

console.log("#MAIN_ENTRY: Entry JS Test file initializing!");
console.log("#MAIN_ENTRY: Request defined?", typeof request === 'function', "/ also with requestFunc?", !!requestFunc);
console.log("#MAIN_ENTRY: module defined?", !!module);
console.log("#MAIN_ENTRY: modulename defined?", !!module.name, "/ also with fileUrl?", !!fileUrl);

console.log("#MAIN_ENTRY: Loading external file now!");
var file1Exports = request("/jsfile1.js");
console.log("#MAIN_ENTRY: exports of first test file is:", file1Exports);

console.log("#MAIN_ENTRY: -------------------------------------");

console.log("#MAIN_ENTRY: Loading second external file now, this should already be there!");
var file2Exports = request("/jsfile2.js");
console.log("#MAIN_ENTRY: exports of second test file is:", file2Exports);

console.log("MAIN_ENTRY: those two objects should be the same:", file1Exports.otherExport, "and", file2Exports);
file2Exports.info += " ADDED SOME MORE!";
console.log("MAIN_ENTRY: those two objects should STILL be the same:", file1Exports.otherExport, "and", file2Exports);

console.log("#MAIN_ENTRY: Printing some exports to the document");
document.write(JSON.stringify(file1Exports) + "<br>"+ JSON.stringify(file2Exports));

module.exports = {"didiload?": true};