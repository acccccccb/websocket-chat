import JSEncrypt from 'jsencrypt';
const encrypt = new JSEncrypt(); // 创建加密对象实例
const decrypt = new JSEncrypt(); // 创建加密对象实例
// rsa_public_key
const pubKey = process.env.VUE_APP_PUB_KEY;
// rsa_1024_priv
const privateKey = process.env.VUE_APP_PRV_KEY.replace(/\\n/g, '\n');
encrypt.setPublicKey(pubKey); //设置公钥
decrypt.setPrivateKey(privateKey); // 设置私钥

export function encryptData(data, len = 32) {
    const str = JSON.stringify(data);
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
}
export function decryptData(encryptArr) {
    try {
        let data = encryptArr.map((item) => {
            const decyptStr = decrypt.decrypt(item);
            return decyptStr ? decyptStr : '';
        });
        return JSON.parse(data.join(''));
    } catch (e) {
        return {};
    }
}
