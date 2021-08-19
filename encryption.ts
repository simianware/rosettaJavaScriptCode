const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

export module encryption {
    export function constructMessageFromString(stringrep: string) {
        let jsonrep = JSON.parse(stringrep)
        return new Message(
            Uint8Array.from(jsonrep.cipher_text), Uint8Array.from(jsonrep.nonce)
        )
    }

    export function constructMessageFromObject(jsonrep) {
        return new Message(
            Uint8Array.from(jsonrep.cipher_text), Uint8Array.from(jsonrep.nonce)
        )
    }

    export function constructUint8ArrayFrom(stringrep: string) {
        return Uint8Array.from(JSON.parse(stringrep))
    }

    export class Message {
        cipher_text:Uint8Array
        nonce:Uint8Array

        constructor(cipher_text:Uint8Array, nonce:Uint8Array) {
            this.cipher_text = cipher_text
            this.nonce = nonce
        }

        asString():string {
            return JSON.stringify({
                cipher_text: U8IntArrayToArray(this.cipher_text),
                nonce: U8IntArrayToArray(this.nonce)
            })
        }
    }

    export function U8IntArrayToArray(arr:Uint8Array): Number[] {
        let res = []
        arr.forEach(v => res.push(v))
        return res
    }

    export function encryptData(data:Uint8Array, publickey: Uint8Array, privatekey: Uint8Array): Message {
        let onetimecode = nacl.randomBytes(24)
        return new Message(
            nacl.box(
                data,
                onetimecode,
                publickey,
                privatekey),
            onetimecode)
    }

    export function decryptData(message: Message, publickey:Uint8Array, privatekey: Uint8Array): Uint8Array {
        let decodedMessage = nacl.box.open(
            Uint8Array.from(message.cipher_text),
            Uint8Array.from(message.nonce), publickey, privatekey
        )
        return decodedMessage
    }

    export function encryptText(text:string, publickey: Uint8Array, privatekey: Uint8Array): Message {
        return encryptData(nacl.util.decodeUTF8(text), publickey, privatekey)
    }

    export function decryptText(message: Message, publickey:Uint8Array, privatekey: Uint8Array): string {
        let decodedMessage = decryptData(message, publickey, privatekey)
        let plain_text = nacl.util.encodeUTF8(decodedMessage)
        return plain_text
    }
}