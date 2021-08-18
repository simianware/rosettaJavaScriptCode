const openpgp = require('openpgp')
const nnfetch = require("node-fetch");
const jquery = require("jquery")
const https = require('http')
import axios = require('axios');

// import { HttpClientModule } from '@angular/common/http';

// openpgp.config.aead_protect = true 



let privateKeyArmored
let publicKeyArmored

let privateKey
let publicKey

let passphrase = "passphrase"

async function sendEncryptedMessage() {
    await (async () => {
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'rsa', // Type of the key
            rsaBits: 4096, // RSA key size (defaults to 4096 bits)
            userIDs: [{ name: 'Jon Smith', email: 'jon@example.com' }], // you can pass multiple user IDs
            passphrase: passphrase
        });
        privateKeyArmored = privateKey
        publicKeyArmored = publicKey

        // console.log(privateKeyg);     // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
        // console.log(publicKeyg);      // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
    })();
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

    const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
        passphrase
    });
    axios.default.get(
        'http://localhost:3000/api/getauthors/' + 'simon ware' + '/' + String(publicKey),{
        params: {namestring: 'Simon Ware', publickey: "ioio"}
    }).then(data => {
        console.log(data)
    })
    // axios.default.request({
    //     url: '/api/getauthors/',
    //     proxy: {
    //         protocol: 'http',
    //         host: 'localhost',
    //         port: 3000
    //     },
    //     method: "GET",
    //     params: {namestring: 'Simon Ware', publickey: "ioio"}
    // }).then(data => {
    //     console.log(data)
    // })
    // https.get('http://localhost:3000/api/getauthors/',)
    // res => {
    //     // console.log(res)
    //     res.on('data', d => {
    //         console.log(d)
    //     })
    // })
    // response.end()
    // const response = await nnfetch('https://localhost:3000/api/getauthors/' + author + '/' + publicKey)
    // console.log(response)
    // const encrypted = await openpgp.encrypt({
    //     message: await openpgp.createMessage({ text: 'Hello, World!' }), // input as Message object
    //     encryptionKeys: publicKey,
    //     // signingKeys: privateKey // optional
    // });
    // console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

    // const message = await openpgp.readMessage({
    //     armoredMessage: encrypted // parse armored message
    // });
    // const { data: decrypted, signatures } = await openpgp.decrypt({
    //     message,
    //     // verificationKeys: publicKey, // optional
    //     decryptionKeys: privateKey
    // });
    // console.log(decrypted);
}

sendEncryptedMessage();

// (async () => {
//     // put keys in backtick (``) to avoid errors caused by spaces or tabs
//     let publicKeyArmored
//     let privateKeyArmored

//     const passphrase = `yourPassphrase`; // what the private key is encrypted with

//     await (async () => {
//         const { privateKey, publicKey } = await openpgp.generateKey({
//             type: 'rsa', // Type of the key
//             rsaBits: 4096, // RSA key size (defaults to 4096 bits)
//             userIDs: [{ name: 'Jon Smith', email: 'jon@example.com' }], // you can pass multiple user IDs
//             passphrase: passphrase
//         });
//         privateKeyArmored = privateKey
//         publicKeyArmored = publicKey
//         console.log(privateKey);     // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
//         console.log(publicKey);      // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
//     })();

//     const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

//     const privateKey = await openpgp.decryptKey({
//         privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
//         passphrase
//     });

//     const encrypted = await openpgp.encrypt({
//         message: await openpgp.createMessage({ text: 'Hello, World!' }), // input as Message object
//         encryptionKeys: publicKey,
//         signingKeys: privateKey // optional
//     });
//     console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

//     const message = await openpgp.readMessage({
//         armoredMessage: encrypted // parse armored message
//     });
//     const { data: decrypted, signatures } = await openpgp.decrypt({
//         message,
//         verificationKeys: publicKey, // optional
//         decryptionKeys: privateKey
//     });
//     console.log(decrypted); // 'Hello, World!'
//     // check signature validity (signed messages only)
//     try {
//         await signatures[0].verified; // throws on invalid signature
//         console.log('Signature is valid');
//     } catch (e) {
//         throw new Error('Signature could not be verified: ' + e.message);
//     }
// })();