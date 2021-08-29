import Arweave = require('arweave');

import * as fs from 'fs';
import * as path from 'path'

export module df {
    export enum FetchRequest {
        AUTHORNAMEINDEX, // INDEX FROM NAME COMPONENT TO AUTHOR ID
        AUTHORINDEX, // INDEX FROM ID TO AUTHOR DATABASE FILE
        PAPERINDEX, // INDEX FROM PAPER ID TO PAPER DATABASE FILE
        AUTHORPAPERINDEX, // INDEX FROM AUTHOR ID TO ALL PAPERS PUBLISHED BY THAT AUTHOR
        INSTITUTIONNAMEINDEX, // INDEX FROM INSTITUTION NAME TO INSTITUTION ID
        INSTITUTIONINDEX, // INDEX FROM 
        INSTITUTIONAUTHORNAMEINDEX, //
        PRBPAPERINDEX 
    }

    export interface DataFetcher {
        getDataString(hash:string): Promise<string>

        getIndexFile(fetchType: FetchRequest, otherKeys?: bigint)

        getNameIndexFile(): Promise<string>

        getAuthorIndexFile(): Promise<string>

        getAuthorPaperIndexFile(): Promise<string>

        getPaperIndexFile(): Promise<string>

        appendToFile(id, val, filepath)
    }

    export class OnSiteDataFetcher implements DataFetcher {
        indexdirectory:string
        outputdirectory:string

        constructor(indexdirectory:string, outputdirectory:string) {
            this.indexdirectory = indexdirectory
            this.outputdirectory = outputdirectory
        }

        async getDataString(hash: string): Promise<string> {
            let result: string
            result = fs.readFileSync(path.join(this.indexdirectory, hash), {encoding:'utf-8'})
            return new Promise((resolve, reject) => {
                resolve(result)
            })
        }

        getIndexFile(fetchType: FetchRequest, otherKeys: BigInt = BigInt(0)) {
            switch (fetchType) {
                case FetchRequest.AUTHORNAMEINDEX:
                    return this.getDataString(
                        path.join('indexofindexs.txt'))
                case FetchRequest.AUTHORINDEX:
                    return this.getDataString(
                        path.join('authorchunkindex.txt'))
                case FetchRequest.PAPERINDEX:
                    return this.getDataString(
                        path.join('paperchunkindex.txt'))
                case FetchRequest.AUTHORPAPERINDEX:
                    return this.getDataString(
                        path.join('authorpaperschunkindex.txt'))
                case FetchRequest.PRBPAPERINDEX:
                    return this.getDataString(
                        path.join('prbchunk', 'prbchunkindex.txt'))
            }
        }
    
        getNameIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('indexofindexs.txt'))
        }
    
        getAuthorIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('authorchunkindex.txt'))
        }

        getAuthorPaperIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('authorpaperchunkindex.txt'))
        }
    
        getPaperIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('paperchunkindex.txt'))
        }

        appendToFile(id, val, filepath): void {
            fs.writeFileSync(path.join(this.outputdirectory, filepath), id + '\t' + val + "\n", {
                flag: 'a'
            })
        }
    }    

    export class ArweaveDataFetcher implements DataFetcher {
        arweave: Arweave
        textencoder: TextDecoder

        constructor() {
            this.arweave = Arweave.init({
                host: 'amp-gw.online',// Hostname or IP address for a Arweave host
                port: 443,          // Port
                protocol: 'https',  // Network protocol http or https
                timeout: 20000,     // Network request timeouts in milliseconds
                logging: false,     // Enable network request logging
            });
            this.textencoder = new TextDecoder
        }
        appendToFile(id: any, val: any, filepath: any) {
            throw new Error('Method not implemented.');
        }

        getAuthorPaperIndexFile(): Promise<string> {
            throw new Error('Method not implemented.');
        }

        getIndexFile(fetchType: FetchRequest, otherKeys: BigInt = BigInt(0)) {
            switch (fetchType) {
                case FetchRequest.AUTHORNAMEINDEX:
                    return this.getDataString(
                        path.join('E:', 'indexs', 'indexofindexs.txt'))
                case FetchRequest.AUTHORINDEX:
                    return this.getDataString(
                        path.join('E:', 'indexs', 'authorchunkindex.txt'))
                case FetchRequest.PAPERINDEX:
                    return this.getDataString(
                        path.join('E:', 'indexs', 'paperchunkindex.txt'))
                case FetchRequest.AUTHORPAPERINDEX:
                    return this.getDataString(
                        path.join('E:', 'indexs', 'authorpaperchunkindex.txt'))
            }
        }

        getDataString(hash: string): Promise<string> {
            let date = new Date()
            let start_download = date.getTime();
            return new Promise((resolve, reject) => {
                this.arweave.transactions.getData(hash, {decode: true, string: true}).then(
                    data => {
                        let retrievedTime = new Date()
                        console.log(retrievedTime.getTime() - start_download)
                        resolve(data as string)
                    }).catch(err => reject(err))
            })
        }
        getNameIndexFile(): Promise<string> {
            return this.getDataString('g3y3m4q_WlObrSBEql_m1Ee1f5HB9NkZxN4PJmw-MZY')
        }
        getAuthorIndexFile(): Promise<string> {
            return this.getDataString('sZEdL-nOVVZw6Wf76Xw8oiJa1JtIhhGQAI8AhopQZQ8')
        }
        getPaperIndexFile(): Promise<string> {
            throw new Error('Method not implemented.');
        }
    }
}