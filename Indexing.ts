import * as df from './DataFetcher'

class IndexHandler {
    datafetcher: df.df.DataFetcher
    nameIndex: Array<[string, string, string]>
    authorIndex: Array<[bigint, bigint, string]>

    constructor(datafetcher: df.df.DataFetcher) {
        this.datafetcher = datafetcher
    }

    async initialize() {
        await datafetcher.getNameIndexFile().then(data => {
            this.nameIndex = convertStringIndexs(data)
        })
        await datafetcher.getAuthorIndexFile().then(data => {
            this.authorIndex = convertBigintIndexs(data)
        })
    }

    /**
     * This function searches through all the tuples in indexs. Each tuple in indexs is a pair of (prefix, index). This function will
     * return the longest prefix such that prefix is a prefix of word. If no prefix is a prefix of word it will return null. I 
     * 
     * @param indexs 
     * @param word 
     * @returns 
     */
    findPrefixFor(indexs:Array<[string,string]>, word:string): [string,string]|null {
        // For speed of development I am using a linear search here, A binary search will be more efficient
        // But I suspect Download Times 
        let bestprefix: string|null = null
        let bestaddress: string|null = null
        for (let i = 0; i < indexs.length; i++) {
            let prefix = indexs[i][0]
            if (bestprefix == null || bestprefix.length < prefix.length) {
                if (word.startsWith(prefix)) {
                    [bestprefix, bestaddress] = indexs[i]
                }
            }
        }
        return [bestprefix, bestaddress]
    }

    /**
     * This function searches through all the tuples in indexs. Each tuple in indexs is a triple of (smallest, largest, index).
     * This function will select the first triple for which index is between smallest and largest. It will return null if there is
     * no such tuple.
     * 
     * @param index 
     * @returns 
     */
    findIndexForString(index:string): [string, string, string]|null {
        for (let i = 0; i < this.nameIndex.length; i++) {
            let tuple = this.nameIndex[i]
            if (tuple[0] <= index && index <= tuple[1]) {
                return tuple
            }
        }
        return null
    }

    /**
     * This function searches through all the tuples in indexs. Each tuple in indexs is a triple of (smallest, largest, index).
     * This function will select the first triple for which index is between smallest and largest. It will return null if there is
     * no such tuple.
     * 
     * @param indexs 
     * @param index 
     * @returns 
     */
    findIndexFor(indexs:Array<[bigint, bigint, string]>, index:bigint): [bigint, bigint, string]|null {
        for (let i = 0; i < indexs.length; i++) {
            let tuple = indexs[i]
            if (tuple[0] <= index && index <= tuple[1]) {
                return tuple
            }
        }
        return null
    }

    findIndexsForName(names: string[]): Map<string, string[]> {
        const dict = new Map<string, string[]>();
        names.forEach((name) => {
            const res = this.findIndexForString(name)
            if (res != null) {
                const [_1, _2, indexfile] = res
                if (!dict.has(indexfile)) {
                    dict.set(indexfile, [])
                }
                dict.get(indexfile).push(name)
            }
        })
        return dict
    }

    findIndexsForAuthor(authorindex: bigint[]): Map<string, bigint[]> {
        const dict = new Map<string, bigint[]>();
        authorindex.forEach((authorindex) => {
            const res = this.findIndexFor(this.authorIndex, authorindex)
            if (res != null) {
                const [_1, _2, indexfile] = res
                if (!dict.has(indexfile)) {
                    dict.set(indexfile, [])
                }
                dict.get(indexfile).push(authorindex)
            }
        })
        return dict
    }
    
    async findPossibleAuthorIndexsForName(names: string[]): Promise<bigint[]> {
        let result:Set<bigint>|null = null
        let indexfiles = this.findIndexsForName(names)
        let iterator = indexfiles.entries()
        let itresult = iterator.next()
        while (!itresult.done) {
            let [hash, namesforindex] = itresult.value
            let nameindex:string[]
            await this.datafetcher.getDataString(hash).then(data =>
                nameindex = data.split("\n")
            )
            namesforindex.forEach(name => {
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
            itresult = iterator.next()
        }
        if (result == null) {
            return []
        } else {
            return Array.from(result)   
        }
        return new Promise((resolve, reject) => {
            if (result == null) {  
                resolve([])
            } else {
                resolve(Array.from(result))
            }
        })
    }

    async findAuthorRows(names: string[]): Promise<Map<string,string>[]> {
        let authorindexs:bigint[]
        await this.findPossibleAuthorIndexsForName(names).then(data => {
            authorindexs = data
        })
        let rows:Map<string,string>[] = []
        let dict = this.findIndexsForAuthor(authorindexs)
        let iterator = dict.entries()
        let itresult = iterator.next()
        while (!itresult.done) {
            const [hash, bigintforhash] = itresult.value
            let authorlines: string[]
            await datafetcher.getDataString(hash).then(data => authorlines = data.split("\n"))
            bigintforhash.forEach(authorindex =>  {
                const row = findAuthorInFile(authorlines, authorindex)
                if (row != null) {
                    const rowelements = row.trim().split('\t')
                    const newobj = new Map<string,string>()
                    newobj.set("id", rowelements[0])
                    newobj.set("rank", rowelements[1])
                    newobj.set("NormalizedName", rowelements[2])
                    newobj.set("DisplayName", rowelements[3])
                    newobj.set("LastKnownAffiliation", rowelements[4])
                    newobj.set("PaperCount", rowelements[5])
                    newobj.set("PaperFamilyCount", rowelements[6])
                    newobj.set("CitationCount", rowelements[7])
                    newobj.set("CreatedDate", rowelements[8])
                    rows.push(newobj)
                }
            })
            itresult = iterator.next()
        }
        return new Promise((resolve, reject) => resolve(rows)) 
    }

    async findAuthorRowsNonNormalized(name: string) {
        let normname = name.toLocaleLowerCase().normalize("NFKD").split(" ")
        return this.findAuthorRows(normname)
    }
}

function convertStringToPrefixIndexs(indexfile:string): Array<[string, string]> {
    let result:Array<[string,string]> = []
    let lines:string[] = indexfile.split("\n")
    for (let i = 0; i < lines.length; i++) {
        let splitline:string[] = lines[i].split("\t")
        result.push([splitline[0], splitline[1]])
    }
    return result
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