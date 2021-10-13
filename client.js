"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios = require("axios");
const nacl = require('tweetnacl');
const encryption_1 = require("./encryption");
// import { HttpClientModule } from '@angular/common/http';
// openpgp.config.aead_protect = true 
let passphrase = "passphrase";
class Client {
    constructor() {
        this.serverString = 'http://rosetta.eastus.cloudapp.azure.com/';
        this.clientKeyPair = nacl.box.keyPair();
        console.log(this.clientKeyPair);
        this.clientPublicKeyString = JSON.stringify(encryption_1.encryption.U8IntArrayToArray(this.clientKeyPair.publicKey));
        console.log(this.clientPublicKeyString);
    }
    async initialize() {
        await axios.default.get(this.serverString + "api/getpublickey/").then(data => {
            console.log(data);
            console.log(data.data);
            this.serverPublicKey = Uint8Array.from(data.data);
        });
        console.log(this.serverPublicKey);
    }
    async requestAuthorsWithName(name) {
        let result;
        console.log(name);
        await axios.default.get(this.serverString + "api/getauthors/" + name + "/").then(data => {
            console.log(data.data);
            result = data.data;
        });
        return result;
    }
    async sendAuthorEmail(id, email) {
        let result;
        await axios.default.post(this.serverString + "api/sendemail/" + email + "/" + id + "/");
        return;
    }
    async requestAuthorsWithNameEncrypted(name) {
        let result;
        console.log(name);
        let message = encryption_1.encryption.encryptText(name, this.serverPublicKey, this.clientKeyPair.secretKey);
        await axios.default.get(this.serverString + "api/getauthors/" + message.asString() + "/" + this.clientPublicKeyString).then(data => {
            console.log(data.data);
            let message = encryption_1.encryption.constructMessageFromObject(data.data);
            result = JSON.parse(encryption_1.encryption.decryptText(message, this.serverPublicKey, this.clientKeyPair.secretKey));
            console.log(result);
        });
        return result;
    }
    async sendAuthorEmailEncrypted(id, email) {
        let result;
        let emailmessage = encryption_1.encryption.encryptText(email, this.serverPublicKey, this.clientKeyPair.secretKey);
        let idmessage = encryption_1.encryption.encryptText(String(id), this.serverPublicKey, this.clientKeyPair.secretKey);
        await axios.default.post(this.serverString + "api/sendemail/" + emailmessage.asString() + "/" + idmessage.asString() + "/" + this.clientPublicKeyString);
        return;
    }
}
const fetch = require('node-fetch');
let name = 'ryan';
// async function main() {
//     await fetch(`http://rosetta.eastus.cloudapp.azure.com/api/getauthors/${name}`)
//         .then((response) => response.json()
//         .then((data) => console.log(data))
//     // let client = new Client()
//     // // await client.initialize()
//     // let rows = await client.requestAuthorsWithName('simon ware')
//     // // await client.sendAuthorEmail(2009723854, 'sware@gmail.com')
//     // console.log(rows)
//     //     console.log(rows[0].papers)
// }
// main()
//# sourceMappingURL=client.js.map