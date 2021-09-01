import { assert } from 'console'
import { exit } from 'process'
import * as df from './DataFetcher'
import * as path from 'path'

enum Comparison {
    LESSTHAN,
    WITHIN,
    MORETHAN
}

interface Indexer<K, V> {
    compare(index: K): Comparison 

    getValue(): V

    sortValue(): K
}

class AffiliationRow {
    id: number
    rank: number
    displayName: string
    gridId: string
    officialPage: string
    wikiPage: string
    paperCount: number
    paperFamilyCount: number
    citationCount: number
    iso3166Code: string
    latitude: number|null
    longitude: number|null
    createdDate: Date

    constructor(line: String) {
        let splitline = line.split("\t")
        this.id = Number(splitline[0])
        this.rank = Number(splitline[1])
        this.displayName = splitline[2]
        this.gridId = splitline[3]
        this.officialPage = splitline[4]
        this.wikiPage = splitline[5]
        this.paperCount = Number(splitline[6])
        this.paperFamilyCount = Number(splitline[7])
        this.citationCount = Number(splitline[8])
        this.iso3166Code = splitline[9]
        this.latitude = splitline[10].length == 0 ? null : Number(splitline[10])
        this.longitude = splitline[11].length == 0 ? null : Number(splitline[11])
        this.createdDate = new Date(splitline[12])
    }
}

class AuthorRow {
    authorId: number
    rank: number
    normalizedName: string
    displayName: string
    lastKnownAffiliationId: number|null
    paperCount: number
    paperFamilyCount: number
    citationCount: number
    createDate: Date
    papers: PaperRow[]
    prbScore: number

    constructor(line: string) {
        let linesplit = line.split('\t')
        this.authorId = Number(linesplit[0])
        this.rank = Number(linesplit[1])
        this.normalizedName = linesplit[2]
        this.displayName = linesplit[3]
        this.lastKnownAffiliationId = linesplit[4].length == 0 ? null : Number(linesplit[4])
        this.paperCount = Number(linesplit[5])
        this.paperFamilyCount = Number(linesplit[6])
        this.citationCount = Number(linesplit[7])
        this.createDate = new Date(linesplit[8])
    }
}

class PaperRow {
    paperId: number
    rank: number
    doi: string
    docType: string
    paperTitle: string
    originalTitle: string
    bookTitle: string
    year: number|null
    date: Date|null
    onlineDate: Date|null
    publisher: string
    journalId: number|null
    conferenceSeriesId: number|null
    conferenceInstanceId: number|null
    volume: string
    issue: string
    firstPage: string
    lastPage: string
    referenceCount: number
    citationCount: number
    estimatedCitation: number
    originalVenue: string
    familyId: number|null
    familyRank: number|null
    createdDate: Date
    prbScore: number

    constructor(line: string) {
        let linesplit = line.split('\t')
        this.paperId = Number(linesplit[0])
        this.rank = Number(linesplit[1])
        this.doi = linesplit[2]
        this.docType = linesplit[3]
        this.paperTitle = linesplit[4]
        this.originalTitle = linesplit[5]
        this.bookTitle = linesplit[6]
        this.year = parseOrNull(linesplit[7], Number)
        this.date = parseOrNull(linesplit[8], (s:string) => new Date(s))
        this.onlineDate = parseOrNull(linesplit[9], (s:string) => new Date(s))
        this.publisher = linesplit[10]
        this.journalId = parseOrNull(linesplit[11], Number)
        this.conferenceSeriesId = parseOrNull(linesplit[12], Number)
        this.conferenceInstanceId = parseOrNull(linesplit[13], Number)
        this.volume = linesplit[14]
        this.issue = linesplit[15]
        this.firstPage = linesplit[16]
        this.lastPage = linesplit[17]
        this.referenceCount = Number(linesplit[18])
        this.citationCount = Number(linesplit[19])
        this.estimatedCitation = Number(linesplit[20])
        this.originalVenue = linesplit[21]
        this.familyId = parseOrNull(linesplit[22], Number)
        this.familyRank = parseOrNull(linesplit[23], Number)
        this.createdDate = new Date(linesplit[24])
    }
}

function parseOrNull<T>(s:string, func: (s:string)=>T):T|null {
    try {
        return func(s)
    } catch {
        return null
    }
}

class ExactIndexer<K, V> implements Indexer<K, V> {
    exactIndex: K
    value: V

    constructor(exactIndex: K, value: V) {
        this.exactIndex = exactIndex
        this.value = value
    }

    compare(index: K): Comparison {
        if (index == this.exactIndex) {
            return Comparison.WITHIN
        } else if (index < this.exactIndex) {
            return Comparison.LESSTHAN
        } else {
            return Comparison.WITHIN
        }
    }

    getValue(): V {
        return this.value
    }

    sortValue(): K {
        return this.exactIndex
    }
}

class RangeIndexer<K,V> implements Indexer<K,V> {
    leastIndex: K
    mostIndex: K
    value: V

    constructor(leastIndex: K, mostIndex: K, value: V) {
        this.leastIndex = leastIndex
        this.mostIndex = mostIndex
        this.value = value
        assert(this.leastIndex <= this.mostIndex)
        if (this.leastIndex > this.mostIndex) {
            console.log(this)
        }
    }

    compare(index: K): Comparison {
        if (index < this.leastIndex) {
            return Comparison.LESSTHAN
        } else if (index > this.mostIndex) {
            return Comparison.MORETHAN
        } else {
            return Comparison.WITHIN
        }
    }

    getValue(): V {
        return this.value
    }
    
    sortValue(): K {
        return this.leastIndex
    }
}

class IndexSet<K, V> {
    indexers: Array<Indexer<K, V>>

    constructor(indexers: Array<Indexer<K, V>>) {
        this.indexers = indexers
        this.indexers.sort((a, b) => {
            if (a.sortValue < b.sortValue) {
                return -1
            } else if (a.sortValue > b.sortValue) {
                return 1
            } else {
                return 0
            }
        })
    }

    findValueForIndex(index: K): V|null {
        let minindex = 0
        let maxindex = this.indexers.length - 1
        while (minindex <= maxindex) {
            let midindex = Math.floor((maxindex + minindex) / 2)
            switch (this.indexers[midindex].compare(index)) {
                case Comparison.LESSTHAN:
                    maxindex = midindex - 1
                    break
                case Comparison.MORETHAN:
                    minindex = midindex + 1
                    break
                case Comparison.WITHIN:
                    return this.indexers[midindex].getValue()
            }
        }
        return null
    }

    getIndexForHashMap(indexs: K[]): Map<V, K[]> {
        const dict = new Map<V, K[]>();
        indexs.forEach((index) => {
            const res = this.findValueForIndex(index)
            if (res != null) {
                if (!dict.has(res)) {
                    dict.set(res, [])
                }
                dict.get(res).push(index)
            }
        })
        return dict
    }
}

export module indexing {
    export class IndexHandler {
        datafetcher: df.df.DataFetcher
        authorNameIndex: IndexSet<string, string>
        authorIndex: IndexSet<number, string>
        affiliationNameIndex: IndexSet<string, string>
        affiliationIndex: IndexSet<number, string>
        authorPaperIndex: IndexSet<number, string>
        paperIndex: IndexSet<number, string>
        prbIndex: IndexSet<number, string>

        constructor(datafetcher: df.df.DataFetcher) {
            this.datafetcher = datafetcher
        }

        async initialize() {
            await Promise.all([                
                 this.datafetcher.getIndexFile(df.df.FetchRequest.AUTHORNAMEINDEX),
                 this.datafetcher.getIndexFile(df.df.FetchRequest.AUTHORINDEX),
                 this.datafetcher.getIndexFile(df.df.FetchRequest.AUTHORPAPERINDEX),
                 this.datafetcher.getIndexFile(df.df.FetchRequest.PAPERINDEX)]).then(values => {
                this.authorNameIndex = convertIndexTuples(convertStringIndexs(values[0]))
                this.authorIndex = convertIndexTuples(convertBigintIndexs(values[1]))
                this.authorPaperIndex = convertIndexTuples(convertBigintIndexs(""))
                this.paperIndex = convertIndexTuples(convertBigintIndexs(""))
                this.prbIndex = convertIndexTuples(convertBigintIndexs(""))
            })
        }

        async findPossibleIndexsForKeys<K, V>(keys: K[],
            indexSet:IndexSet<K, string>, stringToIndex: (s: string) => V): Promise<V[]> {
            let result:Set<V>|null = null
            let indexfiles = indexSet.getIndexForHashMap(keys)
            await this.processIndexDict(indexfiles, (indexfile, keys) => {
                keys.forEach(key => {
                    let indexs = findAuthorIndexsForName(indexfile, String(key), stringToIndex)
                    if (indexs.length != 0) {
                        if (result == null) {
                            result = new Set(indexs)
                        } else {
                            let keep:V[] = []
                            indexs.forEach(index => {
                                if (result.has(index)) {
                                    keep.push(index)
                                }
                            })
                            result = new Set(keep)
                        }
                    }
                })
                return true
            })
            return new Promise((resolve, reject) => {
                if (result == null) {  
                    resolve([])
                } else {
                    resolve(Array.from(result))
                }
            })
        }

        async findIndexMapping<K, V>(keys: K[],
            indexSet:IndexSet<K, string>, stringToIndex: (s: string) => V): Promise<Map<K, V[]>> {
            let result:Map<K, V[]> = new Map()
            let indexfiles: Map<string, K[]> = indexSet.getIndexForHashMap(keys)
            await this.processIndexDict(indexfiles, (indexfile, keys) => {
                for (let i = 0; i < indexfile.length; i++) {
                    indexfile[i] = indexfile[i].split(' ').join('\t')
                }
                keys.forEach(k => {
                    let indexs = findAuthorIndexsForName(indexfile, String(k), stringToIndex)
                    result.set(k, indexs)
                })
                return true
            })
            return result
        }

        async findIndexRows<V, R>(indexs: V[], rowIndexSet: IndexSet<V,string>, stringToRow: (s: string) => R,
            maxResults:Number = 1000): Promise<Map<V, R>> {
            let rows:Map<V, R> = new Map()
            let dict = rowIndexSet.getIndexForHashMap(indexs)
            await this.processIndexDict(dict, (authorlines, bigintforhash) => {
                for (let i = 0; i < bigintforhash.length; i++) {
                    let authorindex = bigintforhash[i]
                    const row = findRowInFile(authorlines, authorindex)
                    if (row != null) {
                        rows.set(authorindex, stringToRow(row))
                    }
                    if (rows.size >= maxResults) {
                        return false
                    }
                }
                return true
            })
            return new Promise((resolve, reject) => resolve(rows)) 
        }

        async findNameRows<K, V, R>(keys: K[],
            nameIndexSet:IndexSet<K, string>, rowIndexSet: IndexSet<V, string>, stringToIndex: (s: string) => V,
            stringToRow: (s: string) => R, maxResults: number = 1000): Promise<Map<V, R>> {
            let authorindexs:V[]
            await this.findPossibleIndexsForKeys(keys, nameIndexSet, stringToIndex).then(data => {
                authorindexs = data
            })
            console.log('authorindex', authorindexs.length)
            return this.findIndexRows(authorindexs, rowIndexSet, stringToRow, maxResults)
        }

        async findPapersOf(authorIndexes: number[]): Promise<Map<number, PaperRow[]>> {
            let map: Map<number, PaperRow[]> = new Map()
            let authorToPapersMap: Map<number, number[]> = await this.findIndexMapping(authorIndexes, this.authorPaperIndex, Number)
            console.log('author papers', authorToPapersMap)
            let neededPapers: Set<number> = new Set()
            authorToPapersMap.forEach((paperIds, authorId) => {
                paperIds.forEach(paperId => neededPapers.add(paperId))
            })
            let paperMap: Map<number, PaperRow> = await this.findIndexRows(Array.from(neededPapers), this.paperIndex, (s: string) => new PaperRow(s), 100000)
            let prbscores: Map<number, number> = await this.findIndexRows(Array.from(neededPapers), this.prbIndex, (s: string) => {
                return Number(s.split('\t')[1])
            })
            console.log(prbscores)
            console.log(neededPapers)
            neededPapers.forEach(paperId => {
                if (paperMap.has(paperId) && prbscores.has(paperId)) {
                    paperMap.get(paperId).prbScore = prbscores.get(paperId)
                }
            })
            authorToPapersMap.forEach((paperIds, authorId) => {
                let papers = []
                paperIds.forEach(paperId => {
                    if (paperMap.has(paperId)) {
                        papers.push(paperMap.get(paperId))
                    }
                })
                map.set(authorId, papers)
            })
            return map
        }

        async findAuthorRowsNonNormalized(name: string, maxResults: number = 1000): Promise<AuthorRow[]> {
            let normname = name.toLocaleLowerCase().normalize("NFKD").split(" ")
            // let normname = name.replace
            let authorRows = await this.findNameRows(normname, this.authorNameIndex, this.authorIndex, Number, (s:string) => new AuthorRow(s))
            let authorIndexs = []
            authorRows.forEach(author => authorIndexs.push(author.authorId))
            let authorPapersMap = await this.findPapersOf(authorIndexs)
            authorRows.forEach(author => author.papers = authorPapersMap.get(author.authorId))
            let authorRowsArr: AuthorRow[] = []
            authorRows.forEach((authorRow, index) => {
                authorRowsArr.push(authorRow)
                authorRow.prbScore = 0.0
                if (authorRow.papers != null){
                    authorRow.papers.forEach(paper => {
                        if (typeof paper.prbScore !== 'undefined') {
                            authorRow.prbScore += paper.prbScore - 0.15
                        }
                    })
                }
            })
            return authorRowsArr
        }

        async processIndexDict<T>(dict: Map<string, T>, func: (s: string[], t: T) => boolean, batchsize: number = 50) {
            let iterator = dict.entries()
            let itresult = iterator.next()
            let valueForIndexList:Array<T> = []
            let promises: Promise<string>[] = []
            let stop = false
            while (!itresult.done) {
                let [hash, namesforindex] = itresult.value
                valueForIndexList.push(namesforindex)
                promises.push(this.datafetcher.getDataString(hash))
                if (promises.length >= batchsize) {
                    await Promise.all(promises).then(values => { 
                        for (let i = 0; i < values.length; i++) {
                            const valueforIndex = valueForIndexList[i]
                            const nameindex = values[i].split("\n")
                            stop = stop || !func(nameindex, valueforIndex)
                            if (stop) {
                                break
                            }
                        }
                    })
                    promises = []
                    valueForIndexList = []
                    if (stop) {
                        break
                    }
                }
                itresult = iterator.next()
            }
            await Promise.all(promises).then(values => { 
                for (let i = 0; i < values.length; i++) {
                    const valueforIndex = valueForIndexList[i]
                    const nameindex = values[i].split("\n")
                    console.log(valueforIndex)
                    stop = stop || !func(nameindex, valueforIndex)
                    if (stop) {
                        break
                    }
                }
            })
        }
    }
}

function convertIndexTuples<K, V>(tuplearray: Array<[K, K, V]>): IndexSet<K, V> {
    return new IndexSet(tuplearray.map(([i1, i2, v]) => new RangeIndexer(i1, i2, v)))
}

/**
 * The indexfile string should be a text file
 * 
 * @param indexfile 
 * @returns 
 */
function convertStringIndexs(indexfile:string): Array<[string, string, string]> {
    let result:Array<[string,string, string]> = []
    let lines:string[] = indexfile.split("\n")
    for (let i = 0; i < lines.length; i++) {
        let splitline:string[] = lines[i].trim().split("\t")
        if (splitline.length < 3) {
            continue
        }
        result.push([splitline[0], splitline[1], splitline[2]])
    }
    return result
}

function convertBigintIndexs(indexfile:string): Array<[number, number, string]> {
    let result:Array<[number,number,string]> = []
    let lines:string[] = indexfile.split("\n")
    for (let i = 0; i < lines.length; i++) {
        let splitline:string[] = lines[i].trim().split("\t")
        if (splitline.length < 3) {
            continue
        }
        result.push([Number(splitline[0]), Number(splitline[1]), splitline[2]])
    }
    return result
}

function findAuthorIndexsForName<T>(nameIndexs: string[],
     name: string, stringtoindex: (s: string) => T): T[] {
    let result:T[] = []
    let modname = name + "\t"
    nameIndexs.forEach(line => {
        if (line.startsWith(modname)) {
            let splitline = line.split("\t")
            for (let i = 1; i < splitline.length; i++) {
                result.push(stringtoindex(splitline[i]))
            }
        }
    })
    return result
}

function findAuthorInFile(authorlines: string[], index: bigint): string {
    let stringindex = index + "\t"
    let result = ""
    authorlines.forEach(line => {
        if (line.startsWith(stringindex)) {
            result = line
        }
    })
    return result
}

function findRowInFile<V>(authorlines: string[], index: V): string {
    let stringindex = index + "\t"
    let result = null
    authorlines.forEach(line => {
        if (line.startsWith(stringindex)) {
            result = line
        }
    })
    return result
}

// const datafetcher:df.df.DataFetcher = new df.df.ArweaveDataFetcher()
// const datafetcher:df.df.DataFetcher = new df.df.OnSiteDataFetcher(path.join("E:", 'indexs'), path.join("E:", 'Downloads'))
// const indexer = new indexing.IndexHandler(datafetcher)

// async function main() {
//     await indexer.initialize();
//     console.log('initialized')
//     // console.log(indexer.findIndexsForName(["simon", "ware"]))
//     // indexer.findPossibleAuthorIndexsForName(["simon", "ware"]).then(data => console.log(data))
//     // indexer.findPossibleAuthorIndexsForName(["simon", "ian", "ware"]).then(data => console.log(data))
//     // indexer.findPossibleAuthorIndexsForName(["simon", "ware"]).then(data => {
//     //     console.log(indexer.findIndexsForAuthor(data))
//     //     console.log('possible_authors')
//     // })
//     // indexer.findPossibleAuthorIndexsForName(["steve", "reeves"]).then(data => console.log(data))
//     // indexer.findAuthorRows(["steve", "reeves"]).then(data => console.log(data))
//     // indexer.findAuthorRows(["simon", "ware"]).then(data => {
//     //     console.log('rows') 
//     //     console.log(data)
//     // })
//     indexer.findAuthorRowsNonNormalized("Simon Ware").then(data => {
//         console.log('rows') 
//         console.log(data)
//     })
//     // indexer.findAuthorRows(["simon", "ian", "ware"]).then(data => console.log(data))
//     // indexer.findAuthorRows(["robi", "malik"]).then(data => console.log(data))
//     // indexer.findAuthorRows(["steve", "reeves"]).then(data => console.log(data))
// }

// main()