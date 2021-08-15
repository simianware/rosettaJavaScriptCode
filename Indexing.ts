import { assert } from 'console'
import * as df from './DataFetcher'

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
    id: bigint
    rank: bigint
    displayName: string
    gridId: string
    officialPage: string
    wikiPage: string
    paperCount: bigint
    paperFamilyCount: bigint
    citationCount: bigint
    iso3166Code: string
    latitude: number|null
    longitude: number|null
    createdDate: Date

    constructor(line: String) {
        let splitline = line.split("\t")
        this.id = BigInt(splitline[0])
        this.rank = BigInt(splitline[1])
        this.displayName = splitline[2]
        this.gridId = splitline[3]
        this.officialPage = splitline[4]
        this.wikiPage = splitline[5]
        this.paperCount = BigInt(splitline[6])
        this.paperFamilyCount = BigInt(splitline[7])
        this.citationCount = BigInt(splitline[8])
        this.iso3166Code = splitline[9]
        this.latitude = splitline[10].length == 0 ? null : Number(splitline[10])
        this.longitude = splitline[11].length == 0 ? null : Number(splitline[11])
        this.createdDate = new Date(splitline[12])
    }
}

class AuthorRow {
    authorId: bigint
    rank: bigint
    normalizedName: string
    displayName: string
    lastKnownAffiliationId: bigint|null
    paperCount: bigint
    paperFamilyCount: bigint
    citationCount: bigint
    createDate: Date

    constructor(line: string) {
        let linesplit = line.split('\t')
        this.authorId = BigInt(linesplit[0])
        this.rank = BigInt(linesplit[1])
        this.normalizedName = linesplit[2]
        this.displayName = linesplit[3]
        this.lastKnownAffiliationId = linesplit[4].length == 0 ? null : BigInt(linesplit[3])
        this.paperCount = BigInt(linesplit[5])
        this.paperFamilyCount = BigInt(linesplit[6])
        this.citationCount = BigInt(linesplit[7])
        this.createDate = new Date(linesplit[8])
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

class IndexHandler {
    datafetcher: df.df.DataFetcher
    nameIndex: IndexSet<string, string>
    authorIndex: IndexSet<bigint, string>

    constructor(datafetcher: df.df.DataFetcher) {
        this.datafetcher = datafetcher
    }

    async initialize() {
        await Promise.all([datafetcher.getNameIndexFile(), datafetcher.getAuthorIndexFile()]).then(values => {
            this.nameIndex = convertIndexTuples(convertStringIndexs(values[0]))
            this.authorIndex = convertIndexTuples(convertBigintIndexs(values[1]))
        })
    }

    async findPossibleAuthorIndexsForName(names: string[]): Promise<bigint[]> {
        let result:Set<bigint>|null = null
        let indexfiles = this.nameIndex.getIndexForHashMap(names)
        await this.processIndexDict(indexfiles, (nameindex, names) => {
            names.forEach(name => {
                let indexs = findAuthorIndexsForName(nameindex, name)
                if (indexs.length != 0) {
                    if (result == null) {
                        result = new Set(indexs)
                    } else {
                        let keep:bigint[] = []
                        indexs.forEach(index => {
                            if (result.has(index)) {
                                keep.push(index)
                            }
                        })
                        result = new Set(keep)
                    }
                }
            })
        })
        return new Promise((resolve, reject) => {
            if (result == null) {  
                resolve([])
            } else {
                resolve(Array.from(result))
            }
        })
    }

    async findAuthorRows(names: string[]): Promise<AuthorRow[]> {
        let authorindexs:bigint[]
        await this.findPossibleAuthorIndexsForName(names).then(data => {
            authorindexs = data
        })
        let rows:AuthorRow[] = []
        let dict = this.authorIndex.getIndexForHashMap(authorindexs)
        await this.processIndexDict(dict, (authorlines, bigintforhash) => {
            bigintforhash.forEach(authorindex =>  {
                const row = findAuthorInFile(authorlines, authorindex)
                if (row != null) {
                    rows.push(new AuthorRow(row))
                }
            })
        })
        return new Promise((resolve, reject) => resolve(rows)) 
    }

    async findAuthorRowsNonNormalized(name: string) {
        let normname = name.toLocaleLowerCase().normalize("NFKD").split(" ")
        // let normname = name.replace
        return this.findAuthorRows(normname)
    }

    async processIndexDict<T>(dict: Map<string, T>, func: (s: string[], t: T) => void) {
        let iterator = dict.entries()
        let itresult = iterator.next()
        let valueForIndexList:Array<T> = []
        let promises: Promise<string>[] = []
        while (!itresult.done) {
            let [hash, namesforindex] = itresult.value
            valueForIndexList.push(namesforindex)
            promises.push(this.datafetcher.getDataString(hash))
            itresult = iterator.next()
        }
        await Promise.all(promises).then(values => { 
            for (let i = 0; i < values.length; i++) {
                const valueforIndex = valueForIndexList[i]
                const nameindex = values[i].split("\n")
                func(nameindex, valueforIndex)
            }
        })
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

function convertBigintIndexs(indexfile:string): Array<[bigint, bigint, string]> {
    let result:Array<[bigint,bigint,string]> = []
    let lines:string[] = indexfile.split("\n")
    for (let i = 0; i < lines.length; i++) {
        let splitline:string[] = lines[i].trim().split("\t")
        if (splitline.length < 3) {
            continue
        }
        result.push([BigInt(splitline[0]), BigInt(splitline[1]), splitline[2]])
    }
    return result
}

function findAuthorIndexsForName(nameIndexs: string[], name: string): bigint[] {
    let result:bigint[] = []
    let modname = name + "\t"
    nameIndexs.forEach(line => {
        if (line.startsWith(modname)) {
            let splitline = line.split("\t")
            for (let i = 1; i < splitline.length; i++) {
                result.push(BigInt(splitline[i]))
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

const datafetcher:df.df.DataFetcher = new df.df.ArweaveDataFetcher()
// const datafetcher:df.df.DataFetcher = new df.df.TestDataFetcher()
const indexer = new IndexHandler(datafetcher)

async function main() {
    await indexer.initialize();
    console.log('initialized')
    // console.log(indexer.findIndexsForName(["simon", "ware"]))
    // indexer.findPossibleAuthorIndexsForName(["simon", "ware"]).then(data => console.log(data))
    // indexer.findPossibleAuthorIndexsForName(["simon", "ian", "ware"]).then(data => console.log(data))
    // indexer.findPossibleAuthorIndexsForName(["simon", "ware"]).then(data => {
    //     console.log(indexer.findIndexsForAuthor(data))
    //     console.log('possible_authors')
    // })
    // indexer.findPossibleAuthorIndexsForName(["steve", "reeves"]).then(data => console.log(data))
    // indexer.findAuthorRows(["steve", "reeves"]).then(data => console.log(data))
    // indexer.findAuthorRows(["simon", "ware"]).then(data => {
    //     console.log('rows') 
    //     console.log(data)
    // })
    indexer.findAuthorRowsNonNormalized("Simon Ware").then(data => {
        console.log('rows') 
        console.log(data)
    })
    // indexer.findAuthorRows(["simon", "ian", "ware"]).then(data => console.log(data))
    // indexer.findAuthorRows(["robi", "malik"]).then(data => console.log(data))
    // indexer.findAuthorRows(["steve", "reeves"]).then(data => console.log(data))
}

main()