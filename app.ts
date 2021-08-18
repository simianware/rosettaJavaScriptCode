const express = require('express')
const app = express()
const port = 3000
const openpgp = require('openpgp')

import { df } from "./DataFetcher"
// import * as df from './DataFetcher'
import { indexing } from "./Indexing"

let privateKeyg: Uint8Array
let publicKeyg: Uint8Array

(async () => {
    const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'rsa', // Type of the key
        rsaBits: 4096, // RSA key size (defaults to 4096 bits)
        userIDs: [{ name: 'Jon Smith', email: 'jon@example.com' }], // you can pass multiple user IDs
        passphrase: 'super long and hard to guess secret',
        format: 'binary' // protects the private key
    });
    privateKeyg = privateKey
    publicKeyg = publicKey
    console.log(privateKeyg);     // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
    console.log(publicKeyg);      // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
})();


// const datafetcher:df.df.DataFetcher = new df.df.ArweaveDataFetcher()
const datafetcher:df.DataFetcher = new df.TestDataFetcher()
const indexer = new indexing.IndexHandler(datafetcher)
indexer.initialize()

// function 

app.get('/api/getauthors/:namestring/:publickey', async (req, res) => {
    let namestring:string = req.params.namestring
    let privatekey:Uint8Array = req.params.publickey
    console.log(namestring)
    let result
    await indexer.findAuthorRowsNonNormalized(namestring).then(data => {
        result = data
    })
    console.log(result)
    const encrypt = 
    res.send(result)
})

app.get('/api/getpublickey/', (req, res) => {
    res.send(publicKeyg)
})

app.listen(port, () => {
    console.log('Example app listening at http://localhost:${port}')
})
