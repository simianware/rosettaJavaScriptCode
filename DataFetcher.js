"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.df = void 0;
const Arweave = require("arweave");
const fs = require('fs').promises;
const path = require("path");
var df;
(function (df) {
    let FetchRequest;
    (function (FetchRequest) {
        FetchRequest[FetchRequest["AUTHORNAMEINDEX"] = 0] = "AUTHORNAMEINDEX";
        FetchRequest[FetchRequest["AUTHORINDEX"] = 1] = "AUTHORINDEX";
        FetchRequest[FetchRequest["PAPERINDEX"] = 2] = "PAPERINDEX";
        FetchRequest[FetchRequest["AUTHORPAPERINDEX"] = 3] = "AUTHORPAPERINDEX";
        FetchRequest[FetchRequest["INSTITUTIONNAMEINDEX"] = 4] = "INSTITUTIONNAMEINDEX";
        FetchRequest[FetchRequest["INSTITUTIONINDEX"] = 5] = "INSTITUTIONINDEX";
        FetchRequest[FetchRequest["INSTITUTIONAUTHORNAMEINDEX"] = 6] = "INSTITUTIONAUTHORNAMEINDEX";
        FetchRequest[FetchRequest["PRBPAPERINDEX"] = 7] = "PRBPAPERINDEX";
    })(FetchRequest = df.FetchRequest || (df.FetchRequest = {}));
    class OnSiteDataFetcher {
        constructor(indexdirectory, outputdirectory) {
            this.indexdirectory = indexdirectory;
            this.outputdirectory = outputdirectory;
        }
        async getDataString(hash) {
            let result;
            result = fs.readFile(path.join(this.indexdirectory, hash), { encoding: 'utf-8' });
            return new Promise((resolve, reject) => {
                resolve(result);
            });
        }
        getIndexFile(fetchType, otherKeys = BigInt(0)) {
            switch (fetchType) {
                case FetchRequest.AUTHORNAMEINDEX:
                    return this.getDataString(path.join('AuthorName', 'AuthorNameindex.txt'));
                case FetchRequest.AUTHORINDEX:
                    return this.getDataString(path.join('authorchunk', 'authorchunkindex.txt'));
                case FetchRequest.PAPERINDEX:
                    return this.getDataString(path.join('paperchunk', 'paperchunkindex.txt'));
                case FetchRequest.AUTHORPAPERINDEX:
                    return this.getDataString(path.join('authorpaperchunk', 'authorpaperchunkindex.txt'));
                case FetchRequest.PRBPAPERINDEX:
                    return this.getDataString(path.join('prbchunks', 'prbchunksindex.txt'));
            }
        }
        getNameIndexFile() {
            return this.getDataString(path.join('indexofindexs.txt'));
        }
        getAuthorIndexFile() {
            return this.getDataString(path.join('authorchunkindex.txt'));
        }
        getAuthorPaperIndexFile() {
            return this.getDataString(path.join('authorpaperchunkindex.txt'));
        }
        getPaperIndexFile() {
            return this.getDataString(path.join('paperchunkindex.txt'));
        }
        appendToFile(id, val, filepath) {
            fs.writeFileSync(path.join(this.outputdirectory, filepath), id + '\t' + val + "\n", {
                flag: 'a'
            });
        }
    }
    df.OnSiteDataFetcher = OnSiteDataFetcher;
    class ArweaveDataFetcher {
        constructor() {
            this.arweave = Arweave.init({
                host: 'amp-gw.online',
                port: 443,
                protocol: 'https',
                timeout: 20000,
                logging: false, // Enable network request logging
            });
            this.textencoder = new TextDecoder;
        }
        appendToFile(id, val, filepath) {
            throw new Error('Method not implemented.');
        }
        getAuthorPaperIndexFile() {
            throw new Error('Method not implemented.');
        }
        getIndexFile(fetchType, otherKeys = BigInt(0)) {
            switch (fetchType) {
                case FetchRequest.AUTHORNAMEINDEX:
                    return this.getDataString(path.join('E:', 'indexs', 'indexofindexs.txt'));
                case FetchRequest.AUTHORINDEX:
                    return this.getDataString(path.join('E:', 'indexs', 'authorchunkindex.txt'));
                case FetchRequest.PAPERINDEX:
                    return this.getDataString(path.join('E:', 'indexs', 'paperchunkindex.txt'));
                case FetchRequest.AUTHORPAPERINDEX:
                    return this.getDataString(path.join('E:', 'indexs', 'authorpaperchunkindex.txt'));
            }
        }
        getDataString(hash) {
            let date = new Date();
            let start_download = date.getTime();
            return new Promise((resolve, reject) => {
                this.arweave.transactions.getData(hash, { decode: true, string: true }).then(data => {
                    let retrievedTime = new Date();
                    console.log(retrievedTime.getTime() - start_download);
                    resolve(data);
                }).catch(err => reject(err));
            });
        }
        getNameIndexFile() {
            return this.getDataString('g3y3m4q_WlObrSBEql_m1Ee1f5HB9NkZxN4PJmw-MZY');
        }
        getAuthorIndexFile() {
            return this.getDataString('sZEdL-nOVVZw6Wf76Xw8oiJa1JtIhhGQAI8AhopQZQ8');
        }
        getPaperIndexFile() {
            throw new Error('Method not implemented.');
        }
    }
    df.ArweaveDataFetcher = ArweaveDataFetcher;
})(df = exports.df || (exports.df = {}));
//# sourceMappingURL=DataFetcher.js.map