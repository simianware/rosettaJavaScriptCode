import axios = require('axios');
const nacl = require('tweetnacl');

import { encryption } from './encryption'

// import { HttpClientModule } from '@angular/common/http';

// openpgp.config.aead_protect = true 




let passphrase = "passphrase"

class Client{
    clientKeyPair
    clientPublicKeyString: string
    serverPublicKey: Uint8Array
    serverString:string = 'http://rosetta.eastus.cloudapp.azure.com/'

    constructor() {
        this.clientKeyPair = nacl.box.keyPair()
        console.log(this.clientKeyPair)
        this.clientPublicKeyString = JSON.stringify(encryption.U8IntArrayToArray(this.clientKeyPair.publicKey))
        console.log(this.clientPublicKeyString)
    }

    async initialize() {
        await axios.default.get(this.serverString + "api/getpublickey/").then(data => {
            console.log(data)
            console.log(data.data)
            this.serverPublicKey = Uint8Array.from(data.data)
        })
        console.log(this.serverPublicKey)
    }

    async requestAuthorsWithName(name: string) {
        let result
        console.log(name)
        await axios.default.get(this.serverString + "api/getauthors/" + name + "/").then(data => {
            console.log(data.data)
            result = data.data
        })
        return result
    }

    async sendAuthorEmail(id: number, email: string) {
        let result
        await axios.default.post(this.serverString + "api/sendemail/" + email + "/" + id + "/")
        return
    }

    async requestAuthorsWithNameEncrypted(name: string) {
        let result
        console.log(name)
        let message = encryption.encryptText(name, this.serverPublicKey, this.clientKeyPair.secretKey)
        await axios.default.get(this.serverString + "api/getauthors/" + message.asString() + "/" + this.clientPublicKeyString).then(data => {
            console.log(data.data)
            let message = encryption.constructMessageFromObject(data.data)
            result = JSON.parse(encryption.decryptText(message, this.serverPublicKey, this.clientKeyPair.secretKey))
            console.log(result)
        })
        return result
    }

    async sendAuthorEmailEncrypted(id: number, email: string) {
        let result
        let emailmessage = encryption.encryptText(email, this.serverPublicKey, this.clientKeyPair.secretKey)
        let idmessage = encryption.encryptText(String(id), this.serverPublicKey, this.clientKeyPair.secretKey)
        await axios.default.post(this.serverString + "api/sendemail/" + emailmessage.asString() + "/" + idmessage.asString() + "/" + this.clientPublicKeyString)
        return
    }
}

async function main() {
    let client = new Client()
    // await client.initialize()
    let rows = await client.requestAuthorsWithName('simon ware')
    // await client.sendAuthorEmail(2009723854, 'sware@gmail.com')
    console.log(rows)
    // console.log(rows[0].papers)
}

main()