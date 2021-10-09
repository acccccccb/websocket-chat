const fs = require('fs-extra');
const JSEncrypt = require('node-jsencrypt');
const path = require('path');
const privateKey = fs
    .readFileSync(path.resolve(__dirname, '../cert/rsa_private_key.pem'))
    .toString();

const pubKey = fs
    .readFileSync(path.resolve(__dirname, '../cert/rsa_1024_pub.pem'))
    .toString();
const encrypt = new JSEncrypt();
const decrypt = new JSEncrypt();
encrypt.setPublicKey(pubKey); // 设置公钥
decrypt.setPrivateKey(privateKey); // 设置私钥

exports.encryptData = (JSONobj, len = 64) => {
    const str = JSON.stringify(JSONobj);
    const result = [];
    const splitCount = Math.ceil(str.length / len);
    for (let i = 0; i < splitCount; i++) {
        const start = i * len;
        const end = (i + 1) * len < str.length ? (i + 1) * len : str.length;
        const substr = str.substring(start, end);
        result.push(substr);
    }
    return result.map((item) => {
        return encrypt.encrypt(item);
    });
};

exports.decryptData = (encryptArr) => {
    let data = encryptArr.map((item) => {
        const decyptStr = decrypt.decrypt(item);
        return decyptStr ? decyptStr : '';
    });
    return data.join('');
};
