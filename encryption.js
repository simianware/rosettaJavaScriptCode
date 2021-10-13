"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryption = void 0;
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
var encryption;
(function (encryption) {
    function constructMessageFromString(stringrep) {
        let jsonrep = JSON.parse(stringrep);
        return new Message(Uint8Array.from(jsonrep.cipher_text), Uint8Array.from(jsonrep.nonce));
    }
    encryption.constructMessageFromString = constructMessageFromString;
    function constructMessageFromObject(jsonrep) {
        return new Message(Uint8Array.from(jsonrep.cipher_text), Uint8Array.from(jsonrep.nonce));
    }
    encryption.constructMessageFromObject = constructMessageFromObject;
    function constructUint8ArrayFrom(stringrep) {
        return Uint8Array.from(JSON.parse(stringrep));
    }
    encryption.constructUint8ArrayFrom = constructUint8ArrayFrom;
    class Message {
        constructor(cipher_text, nonce) {
            this.cipher_text = cipher_text;
            this.nonce = nonce;
        }
        asString() {
            return JSON.stringify({
                cipher_text: U8IntArrayToArray(this.cipher_text),
                nonce: U8IntArrayToArray(this.nonce)
            });
        }
    }
    encryption.Message = Message;
    function U8IntArrayToArray(arr) {
        let res = [];
        arr.forEach(v => res.push(v));
        return res;
    }
    encryption.U8IntArrayToArray = U8IntArrayToArray;
    function encryptData(data, publickey, privatekey) {
        let onetimecode = nacl.randomBytes(24);
        return new Message(nacl.box(data, onetimecode, publickey, privatekey), onetimecode);
    }
    encryption.encryptData = encryptData;
    function decryptData(message, publickey, privatekey) {
        let decodedMessage = nacl.box.open(Uint8Array.from(message.cipher_text), Uint8Array.from(message.nonce), publickey, privatekey);
        return decodedMessage;
    }
    encryption.decryptData = decryptData;
    function encryptText(text, publickey, privatekey) {
        return encryptData(nacl.util.decodeUTF8(text), publickey, privatekey);
    }
    encryption.encryptText = encryptText;
    function decryptText(message, publickey, privatekey) {
        let decodedMessage = decryptData(message, publickey, privatekey);
        let plain_text = nacl.util.encodeUTF8(decodedMessage);
        return plain_text;
    }
    encryption.decryptText = decryptText;
})(encryption = exports.encryption || (exports.encryption = {}));
//# sourceMappingURL=encryption.js.map