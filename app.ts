const express = require('express')
const app = express()
const port = 3000
const openpgp = require('openpgp')
const nacl = require('tweetnacl')


import { df } from "./DataFetcher"
// import * as df from './DataFetcher'
import { indexing } from "./Indexing"
import { encryption } from './encryption'

import sha256 = require("crypto-js/sha256");

let serverkeys = nacl.box.keyPair()

// const datafetcher:df.df.DataFetcher = new df.df.ArweaveDataFetcher()
const datafetcher:df.DataFetcher = new df.TestDataFetcher()
const indexer = new indexing.IndexHandler(datafetcher)
indexer.initialize()

// function 

app.get('/api/getauthors/:name/', async (req, res) => {
    let namestring = req.params.name
    console.log(namestring)
    let result
    await indexer.findAuthorRowsNonNormalized(namestring, 100).then(data => {
        result = data
    })
    console.log(result)
    res.send(JSON.stringify(result))
})

app.get('/api/getauthorsencrypted/:message/:publickey', async (req, res) => {
    let publickey:Uint8Array = encryption.constructUint8ArrayFrom(req.params.publickey)
    let message: encryption.Message = encryption.constructMessageFromString(req.params.message)
    let namestring = encryption.decryptText(message, publickey, serverkeys.secretKey)
    console.log(namestring)
    let result
    await indexer.findAuthorRowsNonNormalized(namestring, 100).then(data => {
        result = data
    })
    console.log(result)
    const encryptedMessage = encryption.encryptText(JSON.stringify(result), publickey, serverkeys.secretKey)
    res.send(encryptedMessage.asString())
})

app.get('/api/getpublickey/', (req, res) => {
    res.send(
        encryption.U8IntArrayToArray(serverkeys.publicKey)
        )
})

app.post('/api/sendemail/:emailaddress/:id/', (req, res) => {
    let emailstring = req.params.emailaddress
    let id = Number(req.params.id)
    datafetcher.appendToFile(id, String(sha256(emailstring)), 'emailshashed.txt')
    res.send('ack')
})

app.post('/api/sendemailencrypted/:emailaddress/:id/:publickey', (req, res) => {
    let publickey:Uint8Array = encryption.constructUint8ArrayFrom(req.params.publickey)
    let emailmessage: encryption.Message = encryption.constructMessageFromString(req.params.emailaddress)
    let emailstring = encryption.decryptText(emailmessage, publickey, serverkeys.secretKey)
    let idmessage: encryption.Message = encryption.constructMessageFromString(req.params.id)
    let id = Number(encryption.decryptText(idmessage, publickey, serverkeys.secretKey))
    datafetcher.appendToFile(id, String(sha256(emailstring)), 'emailshashed.txt')
    res.send('ack')
})

app.listen(port, () => {
    console.log('Example app listening at http://localhost:${port}')
})
