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
        getDataString(hash:string, callback: (err: NodeJS.ErrnoException, s: string) => void): Promise<void>

        getIndexFile(fetchType: FetchRequest, callback: (err: NodeJS.ErrnoException, s: string) => void)

    // getNameIndexFile(): Promise<string>

    // getAuthorIndexFile(): Promise<string>

    // getAuthorPaperIndexFile(): Promise<string>

    // getPaperIndexFile(): Promise<string>

        appendToFile(id, val, filepath)
    }

    export class OnSiteDataFetcher implements DataFetcher {
        indexdirectory:string
        outputdirectory:string

        constructor(indexdirectory:string, outputdirectory:string) {
            this.indexdirectory = indexdirectory
            this.outputdirectory = outputdirectory
        }

        async getDataString(hash: string, callback: (err: NodeJS.ErrnoException, s: string) => void): Promise<void> {
            return fs.readFile(path.join(this.indexdirectory, hash), {encoding:'utf-8'}, callback)
        }

        async getIndexFile(fetchType: FetchRequest,
         callback: (err: NodeJS.ErrnoException, s: string) => void) {
            switch (fetchType) {
                case FetchRequest.AUTHORNAMEINDEX:
                    this.getDataString(
                        path.join('AuthorName', 'AuthorNameindex.txt'), callback)
                    break
                case FetchRequest.AUTHORINDEX:
                    this.getDataString(
                        path.join('authorchunk', 'authorchunkindex.txt'), callback)
                    break
                case FetchRequest.PAPERINDEX:
                    this.getDataString(
                        path.join('paperchunk', 'paperchunkindex.txt'), callback)
                    break
                case FetchRequest.AUTHORPAPERINDEX:
                    this.getDataString(
                        path.join('authorpaperchunk', 'authorpaperchunkindex.txt'), callback)
                    break
                case FetchRequest.PRBPAPERINDEX:
                    this.getDataString(
                        path.join('prbchunks', 'prbchunksindex.txt'), callback)
                    break
            }
        }

        appendToFile(id, val, filepath): void {
            fs.writeFileSync(path.join(this.outputdirectory, filepath), id + '\t' + val + "\n", {
                flag: 'a'
            })
        }
    }

    // export class ArweaveDataFetcher implements DataFetcher {
    //     arweave: Arweave
    //     textencoder: TextDecoder

    //     constructor() {
    //         this.arweave = Arweave.init({
    //             host: 'amp-gw.online',// Hostname or IP address for a Arweave host
    //             port: 443,          // Port
    //             protocol: 'https',  // Network protocol http or https
    //             timeout: 20000,     // Network request timeouts in milliseconds
    //             logging: false,     // Enable network request logging
    //         });
    //         this.textencoder = new TextDecoder
    //     }
    //     appendToFile(id: any, val: any, filepath: any) {
    //         throw new Error('Method not implemented.');
    //     }

    //     getAuthorPaperIndexFile(): Promise<string> {
    //         throw new Error('Method not implemented.');
    //     }

    //     getIndexFile(fetchType: FetchRequest, callback: (err: NodeJS.ErrnoException, s: string) => void) {
    //         switch (fetchType) {
    //         }
    //     }

    //     getDataString(hash: string, callback: (err: NodeJS.ErrnoException, s: string) => void): Promise<void> {
    //         let date = new Date()
    //         let start_download = date.getTime();
    //         return new Promise((resolve, reject) => {
    //             this.arweave.transactions.getData(hash, {decode: true, string: true}).then(
    //                 data => {
    //                     let retrievedTime = new Date()
    //                     console.log(retrievedTime.getTime() - start_download)
    //                     resolve(data as string)
    //                 }).catch(err => reject(err))
    //         })
    //     }
    //     getNameIndexFile(): Promise<string> {
    //         return this.getDataString('g3y3m4q_WlObrSBEql_m1Ee1f5HB9NkZxN4PJmw-MZY')
    //     }
    //     getAuthorIndexFile(): Promise<string> {
    //         return this.getDataString('sZEdL-nOVVZw6Wf76Xw8oiJa1JtIhhGQAI8AhopQZQ8')
    //     }
    //     getPaperIndexFile(): Promise<string> {
    //         throw new Error('Method not implemented.');
    //     }
    // }
}