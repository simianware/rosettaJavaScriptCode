"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexing = void 0;
const console_1 = require("console");
const df = require("./DataFetcher");
var Comparison;
(function (Comparison) {
    Comparison[Comparison["LESSTHAN"] = 0] = "LESSTHAN";
    Comparison[Comparison["WITHIN"] = 1] = "WITHIN";
    Comparison[Comparison["MORETHAN"] = 2] = "MORETHAN";
})(Comparison || (Comparison = {}));
class AffiliationRow {
    constructor(line) {
        let splitline = line.split("\t");
        this.id = Number(splitline[0]);
        this.rank = Number(splitline[1]);
        this.displayName = splitline[2];
        this.gridId = splitline[3];
        this.officialPage = splitline[4];
        this.wikiPage = splitline[5];
        this.paperCount = Number(splitline[6]);
        this.paperFamilyCount = Number(splitline[7]);
        this.citationCount = Number(splitline[8]);
        this.iso3166Code = splitline[9];
        this.latitude = splitline[10].length == 0 ? null : Number(splitline[10]);
        this.longitude = splitline[11].length == 0 ? null : Number(splitline[11]);
        this.createdDate = new Date(splitline[12]);
    }
}
class AuthorRow {
    constructor(line) {
        let linesplit = line.split('\t');
        this.authorId = Number(linesplit[0]);
        this.rank = Number(linesplit[1]);
        this.normalizedName = linesplit[2];
        this.displayName = linesplit[3];
        this.lastKnownAffiliationId = linesplit[4].length == 0 ? null : Number(linesplit[4]);
        this.paperCount = Number(linesplit[5]);
        this.paperFamilyCount = Number(linesplit[6]);
        this.citationCount = Number(linesplit[7]);
        this.createDate = new Date(linesplit[8]);
    }
}
class PaperRow {
    constructor(line) {
        let linesplit = line.split('\t');
        this.paperId = Number(linesplit[0]);
        this.rank = Number(linesplit[1]);
        this.doi = linesplit[2];
        this.docType = linesplit[3];
        this.paperTitle = linesplit[4];
        this.originalTitle = linesplit[5];
        this.bookTitle = linesplit[6];
        this.year = parseOrNull(linesplit[7], Number);
        this.date = parseOrNull(linesplit[8], (s) => new Date(s));
        this.onlineDate = parseOrNull(linesplit[9], (s) => new Date(s));
        this.publisher = linesplit[10];
        this.journalId = parseOrNull(linesplit[11], Number);
        this.conferenceSeriesId = parseOrNull(linesplit[12], Number);
        this.conferenceInstanceId = parseOrNull(linesplit[13], Number);
        this.volume = linesplit[14];
        this.issue = linesplit[15];
        this.firstPage = linesplit[16];
        this.lastPage = linesplit[17];
        this.referenceCount = Number(linesplit[18]);
        this.citationCount = Number(linesplit[19]);
        this.estimatedCitation = Number(linesplit[20]);
        this.originalVenue = linesplit[21];
        this.familyId = parseOrNull(linesplit[22], Number);
        this.familyRank = parseOrNull(linesplit[23], Number);
        this.createdDate = new Date(linesplit[24]);
    }
}
function parseOrNull(s, func) {
    try {
        return func(s);
    }
    catch (_a) {
        return null;
    }
}
class ExactIndexer {
    constructor(exactIndex, value) {
        this.exactIndex = exactIndex;
        this.value = value;
    }
    compare(index) {
        if (index == this.exactIndex) {
            return Comparison.WITHIN;
        }
        else if (index < this.exactIndex) {
            return Comparison.LESSTHAN;
        }
        else {
            return Comparison.WITHIN;
        }
    }
    getValue() {
        return this.value;
    }
    sortValue() {
        return this.exactIndex;
    }
}
class RangeIndexer {
    constructor(leastIndex, mostIndex, value) {
        this.leastIndex = leastIndex;
        this.mostIndex = mostIndex;
        this.value = value;
        (0, console_1.assert)(this.leastIndex <= this.mostIndex);
        if (this.leastIndex > this.mostIndex) {
            console.log(this);
        }
    }
    compare(index) {
        if (index < this.leastIndex) {
            return Comparison.LESSTHAN;
        }
        else if (index > this.mostIndex) {
            return Comparison.MORETHAN;
        }
        else {
            return Comparison.WITHIN;
        }
    }
    getValue() {
        return this.value;
    }
    sortValue() {
        return this.leastIndex;
    }
    toString() {
        return `${this.leastIndex} ${this.mostIndex}`;
    }
}
class IndexSet {
    constructor(indexers) {
        this.indexers = indexers;
        this.indexers.sort((a, b) => {
            if (a.sortValue < b.sortValue) {
                return -1;
            }
            else if (a.sortValue > b.sortValue) {
                return 1;
            }
            else {
                return 0;
            }
        });
    }
    findValueForIndex(index) {
        let minindex = 0;
        let maxindex = this.indexers.length - 1;
        while (minindex <= maxindex) {
            let midindex = Math.floor((maxindex + minindex) / 2);
            switch (this.indexers[midindex].compare(index)) {
                case Comparison.LESSTHAN:
                    maxindex = midindex - 1;
                    break;
                case Comparison.MORETHAN:
                    minindex = midindex + 1;
                    break;
                case Comparison.WITHIN:
                    return this.indexers[midindex].getValue();
            }
        }
        return null;
    }
    getIndexForHashMap(indexs) {
        const dict = new Map();
        indexs.forEach((index) => {
            const res = this.findValueForIndex(index);
            if (res != null) {
                if (!dict.has(res)) {
                    dict.set(res, []);
                }
                dict.get(res).push(index);
            }
        });
        return dict;
    }
}
var indexing;
(function (indexing) {
    class IndexHandler {
        constructor(datafetcher) {
            this.datafetcher = datafetcher;
        }
        async initialize() {
            await Promise.all([
                this.datafetcher.getIndexFile(df.df.FetchRequest.AUTHORNAMEINDEX),
                this.datafetcher.getIndexFile(df.df.FetchRequest.AUTHORINDEX),
                this.datafetcher.getIndexFile(df.df.FetchRequest.AUTHORPAPERINDEX),
                this.datafetcher.getIndexFile(df.df.FetchRequest.PAPERINDEX),
                this.datafetcher.getIndexFile(df.df.FetchRequest.PRBPAPERINDEX)
            ]).then(values => {
                this.authorNameIndex = convertIndexTuples(convertStringIndexs(values[0]));
                this.authorIndex = convertIndexTuples(convertBigintIndexs(values[1]));
                this.authorPaperIndex = convertIndexTuples(convertBigintIndexs(values[2]));
                this.paperIndex = convertIndexTuples(convertBigintIndexs(values[3]));
                this.prbIndex = convertIndexTuples(convertBigintIndexs(values[4]));
            });
        }
        async findPossibleIndexsForKeys(keys, indexSet, stringToIndex) {
            let result = null;
            let indexfiles = indexSet.getIndexForHashMap(keys);
            await this.processIndexDict(indexfiles, (indexfile, keys) => {
                keys.forEach(key => {
                    let indexs = findAuthorIndexsForNameOne(indexfile, String(key), stringToIndex);
                    if (indexs.length != 0) {
                        if (result == null) {
                            result = new Set(indexs);
                        }
                        else {
                            let keep = [];
                            indexs.forEach(index => {
                                if (result.has(index)) {
                                    keep.push(index);
                                }
                            });
                            result = new Set(keep);
                        }
                    }
                });
                return true;
            });
            return new Promise((resolve, reject) => {
                if (result == null) {
                    resolve([]);
                }
                else {
                    resolve(Array.from(result));
                }
            });
        }
        async findIndexMapping(keys, indexSet, stringToIndex) {
            let result = new Map();
            let indexfiles = indexSet.getIndexForHashMap(keys);
            await this.processIndexDict(indexfiles, (indexfile, keys) => {
                keys.forEach(k => {
                    let indexs = findAuthorIndexsForNameOne(indexfile, String(k), stringToIndex);
                    result.set(k, indexs);
                });
                return true;
            });
            return result;
        }
        async findIndexRows(indexs, rowIndexSet, stringToRow, maxResults = 100) {
            let rows = new Map();
            let dict = rowIndexSet.getIndexForHashMap(indexs);
            await this.processIndexDict(dict, (authorlines, bigintforhash) => {
                for (let i = 0; i < bigintforhash.length; i++) {
                    let authorindex = bigintforhash[i];
                    const row = findRowInFileOne(authorlines, authorindex);
                    if (row != null) {
                        rows.set(authorindex, stringToRow(row));
                    }
                    if (rows.size >= maxResults) {
                        return false;
                    }
                }
                return true;
            });
            return new Promise((resolve, reject) => resolve(rows));
        }
        async findNameRows(keys, nameIndexSet, rowIndexSet, stringToIndex, stringToRow, maxResults = 100) {
            let authorindexs;
            await this.findPossibleIndexsForKeys(keys, nameIndexSet, stringToIndex).then(data => {
                authorindexs = data;
            });
            return this.findIndexRows(authorindexs, rowIndexSet, stringToRow, maxResults);
        }
        async findPapersOf(authorIndexes) {
            let map = new Map();
            let authorToPapersMap = await this.findIndexMapping(authorIndexes, this.authorPaperIndex, Number);
            let neededPapers = new Set();
            authorToPapersMap.forEach((paperIds, authorId) => {
                paperIds.forEach(paperId => neededPapers.add(paperId));
            });
            let paperMap = await this.findIndexRows(Array.from(neededPapers), this.paperIndex, (s) => new PaperRow(s), 100000);
            let prbscores = await this.findIndexRows(Array.from(neededPapers), this.prbIndex, (s) => {
                return Number(s.split('\t')[1]);
            });
            neededPapers.forEach(paperId => {
                if (paperMap.has(paperId) && prbscores.has(paperId)) {
                    paperMap.get(paperId).prbScore = prbscores.get(paperId);
                }
            });
            authorToPapersMap.forEach((paperIds, authorId) => {
                let papers = [];
                paperIds.forEach(paperId => {
                    if (paperMap.has(paperId)) {
                        papers.push(paperMap.get(paperId));
                    }
                });
                map.set(authorId, papers);
            });
            return map;
        }
        async findAuthorPapers(id) {
            let authorPapersMap = await this.findPapersOf([id]);
            return authorPapersMap.get(id);
        }
        async findAuthorRowsNonNormalized(name, maxResults = 100) {
            let normname = name.toLocaleLowerCase().normalize("NFKD").split(" ");
            // let normname = name.replace
            let authorRows = await this.findNameRows(normname, this.authorNameIndex, this.authorIndex, Number, (s) => new AuthorRow(s));
            let authorIndexs = [];
            authorRows.forEach(author => authorIndexs.push(author.authorId));
            let authorRowsArr = [];
            authorRows.forEach((authorRow, index) => {
                authorRowsArr.push(authorRow);
            });
            return authorRowsArr;
        }
        async findAuthorRowsNonNormalizedWithPapers(name, maxResults = 100) {
            let normname = name.toLocaleLowerCase().normalize("NFKD").split(" ");
            // let normname = name.replace
            let authorRows = await this.findNameRows(normname, this.authorNameIndex, this.authorIndex, Number, (s) => new AuthorRow(s));
            let authorIndexs = [];
            authorRows.forEach(author => authorIndexs.push(author.authorId));
            let authorPapersMap = await this.findPapersOf(authorIndexs);
            authorRows.forEach(author => author.papers = authorPapersMap.get(author.authorId));
            let authorRowsArr = [];
            authorRows.forEach((authorRow, index) => {
                authorRowsArr.push(authorRow);
                authorRow.prbScore = 0.0;
                if (authorRow.papers != null) {
                    authorRow.papers.forEach(paper => {
                        if (typeof paper.prbScore !== 'undefined') {
                            authorRow.prbScore += paper.prbScore;
                        }
                    });
                }
            });
            return authorRowsArr;
        }
        async processIndexDict(dict, func, batchsize = 50) {
            let iterator = dict.entries();
            let itresult = iterator.next();
            let valueForIndexList = [];
            let promises = [];
            let stop = false;
            while (!itresult.done) {
                let [hash, namesforindex] = itresult.value;
                valueForIndexList.push(namesforindex);
                promises.push(this.datafetcher.getDataString(hash));
                if (promises.length >= batchsize) {
                    await Promise.all(promises).then(values => {
                        for (let i = 0; i < values.length; i++) {
                            const valueforIndex = valueForIndexList[i];
                            const nameindex = values[i];
                            stop = stop || !func(nameindex, valueforIndex);
                            if (stop) {
                                break;
                            }
                        }
                    });
                    promises = [];
                    valueForIndexList = [];
                    if (stop) {
                        break;
                    }
                }
                itresult = iterator.next();
            }
            await Promise.all(promises).then(values => {
                for (let i = 0; i < values.length; i++) {
                    const valueforIndex = valueForIndexList[i];
                    const nameindex = values[i];
                    stop = stop || !func(nameindex, valueforIndex);
                    if (stop) {
                        break;
                    }
                }
            });
        }
    }
    indexing.IndexHandler = IndexHandler;
})(indexing = exports.indexing || (exports.indexing = {}));
function convertIndexTuples(tuplearray) {
    return new IndexSet(tuplearray.map(([i1, i2, v]) => new RangeIndexer(i1, i2, v)));
}
/**
 * The indexfile string should be a text file
 *
 * @param indexfile
 * @returns
 */
function convertStringIndexs(indexfile) {
    let result = [];
    let lines = indexfile.split("\n");
    for (let i = 0; i < lines.length; i++) {
        let splitline = lines[i].trim().split("\t");
        if (splitline.length < 3) {
            continue;
        }
        result.push([splitline[0], splitline[1], splitline[2]]);
    }
    return result;
}
function convertBigintIndexs(indexfile) {
    let result = [];
    let lines = indexfile.split("\n");
    for (let i = 0; i < lines.length; i++) {
        let splitline = lines[i].trim().split("\t");
        if (splitline.length < 3) {
            continue;
        }
        result.push([Number(splitline[0]), Number(splitline[1]), splitline[2]]);
    }
    return result;
}
function findAuthorIndexsForName(nameIndexs, name, stringtoindex) {
    let result = [];
    let modname = name + "\t";
    nameIndexs.forEach(line => {
        if (line.startsWith(modname)) {
            let splitline = line.split("\t");
            for (let i = 1; i < splitline.length; i++) {
                result.push(stringtoindex(splitline[i]));
            }
        }
    });
    return result;
}
function findRowInFile(authorlines, index) {
    let stringindex = index + "\t";
    let result = null;
    authorlines.forEach(line => {
        if (line.startsWith(stringindex)) {
            result = line;
        }
    });
    return result;
}
function getslicefrom(stringfile, startindex) {
    for (let i = startindex + 1; i < stringfile.length; i++) {
        if (stringfile[i] == '\n') {
            return stringfile.slice(startindex, i - 1);
        }
    }
    return stringfile.slice(startindex);
}
function findAuthorIndexsForNameOne(nameIndexs, name, stringtoindex) {
    let result = [];
    let modname = name + "\t";
    let line = "";
    if (nameIndexs.startsWith(modname)) {
        line = getslicefrom(nameIndexs, 0);
    }
    else {
        let startindex = nameIndexs.search("\n" + modname);
        if (startindex != -1) {
            line = getslicefrom(nameIndexs, startindex);
        }
    }
    let splitline = line.split('\t');
    for (let i = 1; i < splitline.length; i++) {
        result.push(stringtoindex(splitline[i]));
    }
    return result;
}
function findRowInFileOne(authorlines, index) {
    let modname = index + "\t";
    let line = "";
    if (authorlines.startsWith(modname)) {
        line = getslicefrom(authorlines, 0);
    }
    else {
        let startindex = authorlines.search("\n" + modname);
        if (startindex != -1) {
            line = getslicefrom(authorlines, startindex);
        }
    }
    return line;
}
//# sourceMappingURL=Indexing.js.map