const openpgp = require('openpgp')
const nnfetch = require("node-fetch");
const jquery = require("jquery")
const https = require('http')
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
    serverString:string = 'http://localhost:3000/'

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
        let message = encryption.encryptText(name, this.serverPublicKey, this.clientKeyPair.secretKey)
        await axios.default.get(this.serverString + "api/getauthors/" + message.asString() + "/" + this.clientPublicKeyString).then(data => {
            console.log(data.data)
            let message = encryption.constructMessageFromObject(data.data)
            result = JSON.parse(encryption.decryptText(message, this.serverPublicKey, this.clientKeyPair.secretKey))
            console.log(result)
        })
        return result
    }
}

async function main() {
    let client = new Client()
    await client.initialize()
    let rows = await client.requestAuthorsWithName('peter a mccullough')
    console.log(rows)
    // console.log(rows[0].papers)
}

main()

// async function sendEncryptedMessage() {
//     axios.default.get(
//         'http://localhost:3000/api/getauthors/' + 'simon ware' + '/' + String(publicKey),{
//         params: {namestring: 'Simon Ware', publickey: "ioio"}
//     }).then(data => {
//         console.log(data)
//     })
//     // axios.default.request({
//     //     url: '/api/getauthors/',
//     //     proxy: {
//     //         protocol: 'http',
//     //         host: 'localhost',
//     //         port: 3000
//     //     },
//     //     method: "GET",
//     //     params: {namestring: 'Simon Ware', publickey: "ioio"}
//     // }).then(data => {
//     //     console.log(data)
//     // })
//     // https.get('http://localhost:3000/api/getauthors/',)
//     // res => {
//     //     // console.log(res)
//     //     res.on('data', d => {
//     //         console.log(d)
//     //     })
//     // })
//     // response.end()
//     // const response = await nnfetch('https://localhost:3000/api/getauthors/' + author + '/' + publicKey)
//     // console.log(response)
//     // const encrypted = await openpgp.encrypt({
//     //     message: await openpgp.createMessage({ text: 'Hello, World!' }), // input as Message object
//     //     encryptionKeys: publicKey,
//     //     // signingKeys: privateKey // optional
//     // });
//     // console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

//     // const message = await openpgp.readMessage({
//     //     armoredMessage: encrypted // parse armored message
//     // });
//     // const { data: decrypted, signatures } = await openpgp.decrypt({
//     //     message,
//     //     // verificationKeys: publicKey, // optional
//     //     decryptionKeys: privateKey
//     // });
//     // console.log(decrypted);
// }

// // sendEncryptedMessage();

// // (async () => {
// //     // put keys in backtick (``) to avoid errors caused by spaces or tabs
// //     let publicKeyArmored
// //     let privateKeyArmored

// //     const passphrase = `yourPassphrase`; // what the private key is encrypted with

// //     await (async () => {
// //         const { privateKey, publicKey } = await openpgp.generateKey({
// //             type: 'rsa', // Type of the key
// //             rsaBits: 4096, // RSA key size (defaults to 4096 bits)
// //             userIDs: [{ name: 'Jon Smith', email: 'jon@example.com' }], // you can pass multiple user IDs
// //             passphrase: passphrase
// //         });
// //         privateKeyArmored = privateKey
// //         publicKeyArmored = publicKey
// //         console.log(privateKey);     // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
// //         console.log(publicKey);      // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
// //     })();

// //     const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

// //     const privateKey = await openpgp.decryptKey({
// //         privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
// //         passphrase
// //     });

// //     const encrypted = await openpgp.encrypt({
// //         message: await openpgp.createMessage({ text: 'Hello, World!' }), // input as Message object
// //         encryptionKeys: publicKey,
// //         signingKeys: privateKey // optional
// //     });
// //     console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

// //     const message = await openpgp.readMessage({
// //         armoredMessage: encrypted // parse armored message
// //     });
// //     const { data: decrypted, signatures } = await openpgp.decrypt({
// //         message,
// //         verificationKeys: publicKey, // optional
// //         decryptionKeys: privateKey
// //     });
// //     console.log(decrypted); // 'Hello, World!'
// //     // check signature validity (signed messages only)
// //     try {
// //         await signatures[0].verified; // throws on invalid signature
// //         console.log('Signature is valid');
// //     } catch (e) {
// //         throw new Error('Signature could not be verified: ' + e.message);
// //     }
// // })();