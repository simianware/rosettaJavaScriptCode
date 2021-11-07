var compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const app = express()
// const sha256 = require('js-sha256');
app.use(helmet())
app.use(cors())
app.use(compression())

import * as fs from 'fs'
import * as path from 'path'

const options = {
    key: fs.readFileSync("C:\\Certbot\\live\\rosetta.eastus.cloudapp.azure.com\\privkey.pem"),
    cert: fs.readFileSync("C:\\Certbot\\live\\rosetta.eastus.cloudapp.azure.com\\fullchain.pem")
}
const port = 443
const nacl = require('tweetnacl')

import { df } from "./DataFetcher"
// import * as df from './DataFetcher'
import { indexing } from "./Indexing"
import { encryption } from './encryption'

import sha256 = require("crypto-js/sha256");

let serverkeys = nacl.box.keyPair()

// const datafetcher:df.df.DataFetcher = new df.df.ArweaveDataFetcher()
const datafetcher:df.DataFetcher = new df.OnSiteDataFetcher(path.join("F:", 'indexs'), path.join("F:", 'Downloads'))
const indexer = new indexing.IndexHandler(datafetcher)
indexer.initialize()

const CosmosClient = require('@azure/cosmos').CosmosClient

const cosmokey = JSON.parse(fs.readFileSync('cosmokey.json', 'utf8'))

const databaseId = 'rosettadb'
const containerId = 'userinfo'

const examplemessage = {
    id: "0",
    messages: []
}

const config = {
    endpoint: null,
    key: null,
};

config.endpoint = cosmokey.uri
config.key = process.env.AUTH_KEY || cosmokey.primarykey

const client = new CosmosClient(config);

app.get('/api/getauthorswithname/:name/', async (req, res) => {
    let namestring = req.params.name
    console.log(namestring)
    let result
    await indexer.findAuthorRowsNonNormalized(namestring, 100).then(data => {
        result = data
    })
    console.log(result)
    res.send(JSON.stringify(result))
})

app.get('/api/getauthorpapers/:id/', async (req, res) => {
    let id = Number(req.params.id)
    console.log(id)
    let result
    await indexer.findAuthorPapers(id).then(data => {
        result = data
    })
    console.log(result)
    res.send(JSON.stringify(result))
})

app.get('/api/getauthors/:name/', async (req, res) => {
    let namestring = req.params.name
    console.log(namestring)
    let result
    await indexer.findAuthorRowsNonNormalizedWithPapers(namestring, 100).then(data => {
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
    await indexer.findAuthorRowsNonNormalizedWithPapers(namestring, 100).then(data => {
        result = data
    })
    console.log(result)
    const encryptedMessage = encryption.encryptText(JSON.stringify(result), publickey, serverkeys.secretKey)
    res.send(encryptedMessage.asString())
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

app.get('/api/v1/createuser/:username/:publickey/:authorid', async (req, res) => {
    console.log(req.params)
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    try {
        await container.items.create({
            username: req.params.username,
            publickey: req.params.publickey,
            authorid: req.params.authorid,
            messages: []
        })
        res.send({
            statusCode: 200,
            message: "User created"
        })
    } catch (ex) {
        res.send({
            statusCode: 401,
            message: "Unable to create user, user already present"
        })
    }
})

app.get('/api/v1/getuserdata/:username', async (req, res) => {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    const querySpec = {
        query: "SELECT c.username, c.publickey, c.authorid FROM c WHERE c.username = @username",
        parameters: [
          {
            name: "@username",
            value: req.params.username
          }
        ]
      };
    const response = await container.items.query(querySpec).fetchAll()
    if (response.resources.length == 1) {
        res.send({
            status: 200,
            userdata: response.resources[0]
        })
    } else {
        res.send({
            status: 404
        })
    }
})

app.get('/api/v1/onboarduser/:onboardingjson', async (req, res) => {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    const onboardingjson = JSON.parse(req.params.onboardingjson)
    try {
        // const hashedemail = sha256(onboardingjson.email)
        // console.log(hashedemail)
        const hashedemail = onboardingjson.email
        await container.items.create({
            username: hashedemail,
            publickey: onboardingjson.publickey,
            authorid: onboardingjson.authorid,
            messages: []
        })
        res.send({
            statusCode: 200,
            message: "User created"
        })
    } catch (ex) {
        res.send({
            statusCode: 401,
            message: "Unable to create user, user already present"
        })
    }
})

app.get('/api/v1/getusermessages/:username', async (req, res) => {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    const querySpec = {
        query: "SELECT c.username, c.publickey, c.authorid, c.messages FROM c WHERE c.username = @username",
        parameters: [
          {
            name: "@username",
            value: req.params.username
          }
        ]
      };
    const response = await container.items.query(querySpec).fetchAll()
    if (response.resources.length == 1) {
        res.send({
            status: 200,
            userdata: response.resources[0]
        })
    } else {
        res.send({
            status: 404
        })
    }
})

app.get('/api/v1/sendmessage/:username/:message', async (req, res) => {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    const timestamp = Date.now()
    const querySpec = {
        query: "SELECT c.id FROM c WHERE c.username = @username",
        parameters: [
          {
            name: "@username",
            value: req.params.username
          }
        ]
      };
    const response = await container.items.query(querySpec).fetchAll()
    if (response.resources.length == 1) {
        for (let i = 0; i < 3; i++) {
            try {
                const item = container.item(response.resources[0].id, req.params.username)
                const { resource } = await item.read()
                resource.messages.push({
                    message: req.params.message,
                    timestamp: timestamp
                })
                item.replace(await resource, { accessCondition: { type: "IfMatch", condition: resource._etag } })
                res.send({
                    status: 200,
                })
                return
            } catch (err) {
            }
        }
    }
    res.send({
        status: 404
    })
})

// app.listen(80, () => {
// })

const https = require('https')
const http = require('http')

const server = https.createServer(options, app).listen(port,  () => {
})

// let server = app.listen(8081, function () {
//     var host = server.address().address
//     var port = server.address().port
    
//     console.log("Example app listening at http://%s:%s", host, port)
//  })
 