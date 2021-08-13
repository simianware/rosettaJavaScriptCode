import Arweave = require('arweave');

import * as fs from 'fs';
import * as path from 'path'

export module df {
    export interface DataFetcher {
        getDataString(hash:string): Promise<string>

        getNameIndexFile(): Promise<string>

        getAuthorIndexFile(): Promise<string>

        getAuthorPaperIndexFile(): Promise<string>

        getPaperIndexFile(): Promise<string>
    }

    export class TestDataFetcher implements DataFetcher {
        async getDataString(hash: string): Promise<string> {
            let result: string
            result = fs.readFileSync(hash, {encoding:'utf-8'})
            return new Promise((resolve, reject) => {
                resolve(result)
            })
        }
    
        getNameIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('E:', 'indexs', 'indexofindexs.txt'))
        }
    
        getAuthorIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('E:', 'indexs', 'authorchunkindex.txt'))
        }

        getAuthorPaperIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('E:', 'indexs', 'authorpaperchunkindex.txt'))
        }
    
        getPaperIndexFile(): Promise<string> {
            return this.getDataString(
                path.join('E:', 'indexs', 'paperchunkindex.txt'))
        }
    }    

    export class ArweaveDataFetcher implements DataFetcher {
        arweave: Arweave
        textencoder: TextDecoder

        constructor() {
            this.arweave = Arweave.init({
                host: 'arweave.net',// Hostname or IP address for a Arweave host
                port: 443,          // Port
                protocol: 'https',  // Network protocol http or https
                timeout: 20000,     // Network request timeouts in milliseconds
                logging: false,     // Enable network request logging
            });
            this.textencoder = new TextDecoder
        }

        getDataString(hash: string): Promise<string> {
            return new Promise((resolve, reject) => {
                this.arweave.transactions.getData(hash, {decode: true, string: true}).then(
                    data => {
                        resolve(data as string)
                    }).catch(err => reject(err))
            })
            return 
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