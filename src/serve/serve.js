const app = require('http').createServer();
const io = require('socket.io')(app);
const moment = require('moment');
const uuidv4 = require('uuid').v4;
const fs = require('fs-extra');
const JSEncrypt = require('node-jsencrypt');
const path = require('path');
const userList = fs.readJsonSync(
    path.resolve(__dirname, 'dataBase/userList.json')
);
const robot = userList[0];
const privateKey =
    '-----BEGIN RSA PRIVATE KEY-----\n' +
    'MIICXQIBAAKBgQC4gFOiRiCkUSXOI0ZltyQNqmLKq81HmsMLZ4OXQ6+nDe3FB0Eg\n' +
    'EB9oHPRwDgc39aB7T8cvhp3/kH0qmhVz304EULAVFui4Ox1FUY7cNGwugrNGu6xe\n' +
    '5o+qJIBKz24ibTgudkh/yiF86EYsks+vkkt/Kz3f+cxKHYSh1CCFyouKRQIDAQAB\n' +
    'AoGBALR0r1h0htCwne11CxHJgvXqxR2909ZJRKQO5uI4TcFzGjAv3D7kBhPq3hoL\n' +
    'XnwZPpHdgdC2NisUw5e7hWgD7WUYLfLFYGtgAmxe6Tirc3xfqERIp47YAigAsJT2\n' +
    'ny25736Nn2dvfDyWyaYSip+TL2Mn99WiQyY4XunQB3DSWHkBAkEA7hl/icGPiXRt\n' +
    'kjFfYCgtdhs2OqxKx1oAd1SsSPoxrRJJuZ1GblPN5MzRetts6ajQKAaXYHnhb7Mv\n' +
    'FTKE2cjcUQJBAMZfRE4WNNlqCxoY2DQlryYKKI8C1Aw6LwZTIoe239xKic13fh6e\n' +
    '0AWbE2GAHQfBSE/FugNotUf9HYHaJK97NbUCQHoZiVXTdRBALJBz0T02XVnbyot8\n' +
    'Hzzr4qFPQqqJ4z+lyTjudlfNkiBrCGHAdLG+aECeYLKQzhLCCLsOFSK55oECQQCA\n' +
    'jSAQkmdxNT04jj0dngYg2phqBOUxf0sWCC3qUOJFObCPjA4Y/cXEvDgVCRbG/cRE\n' +
    'ndfreaFwo2DJ03nOlkO5AkBc7tvF7JMAudwbo2Pzmjm7oaFOTZQzD4cnMlAqDFVv\n' +
    'QA6cKB2dzIQaOSGehceMUmciefyGLUY5bTdCNHYydvWM\n' +
    '-----END RSA PRIVATE KEY-----';
const encrypt = new JSEncrypt();
encrypt.setPrivateKey(privateKey);
const PORT = 3000;

//客户端计数
let clientCount = 0;

//存储客户端socket
let socketMap = {};

app.listen(PORT);
// 发送消息
const sendMessage = (socket, msg, from, data = {}, type = 'message') => {
    delete from.password;
    delete from.username;
    socket.emit(type, {
        msg,
        data,
        from,
        // encrypt: msg.encrypt,
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
};
// 获取用户
const getUserByUuid = (uuid) => {
    return userList.filter((item) => {
        return item.uuid === uuid;
    });
};
// 更新在线用户列表
const updateOnlineList = (socket) => {
    const userList = [];
    Object.keys(socketMap).forEach((item) => {
        userList.push({
            uuid: socketMap[item].uuid,
            username: socketMap[item].username,
            nickname: socketMap[item].nickname,
            avatar: socketMap[item].avatar,
        });
    });
    socket.emit('onlineList', {
        userList,
        count: Object.keys(socketMap).length,
    });
};
io.on('connection', (socket) => {
    clientCount += 1;
    if (!socket.uuid) {
        sendMessage(socket, '你还未登录', robot);
    }
    socket.on('message', (encryptData) => {
        let data = encrypt.decrypt(encryptData.encrypt);
        console.log('encryptData', data);
        if (!data) {
            sendMessage(socket, '无效的密钥', robot);
        } else {
            data = JSON.parse(data);
            if (!socket.uuid) {
                const arr = data.msg.split('@');
                if (arr.length !== 2) {
                    sendMessage(socket, '登录命令不正确', robot);
                } else {
                    const username = arr[0];
                    const password = arr[1];
                    const filter2 = userList.filter((item) => {
                        return (
                            username === item.username &&
                            password === item.password
                        );
                    });
                    if (filter2.length === 0) {
                        sendMessage(socket, '用户名或密码错误', robot);
                    } else {
                        socket.uuid = filter2[0].uuid;
                        socket.nickname = filter2[0].nickname;
                        socket.username = filter2[0].username;
                        socket.avatar = filter2[0].avatar;
                        socketMap[socket.uuid] = socket;
                        sendMessage(
                            socket,
                            `${socket.nickname}, welcome.`,
                            robot,
                            {
                                uuid: filter2[0].uuid,
                                nickname: filter2[0].nickname,
                                username: filter2[0].username,
                                avatar: filter2[0].avatar,
                            },
                            'loginIn'
                        );
                        const users = Object.keys(socketMap);
                        users.forEach((item) => {
                            updateOnlineList(socketMap[item]);
                            if (item !== socket.uuid) {
                                sendMessage(
                                    socketMap[item],
                                    `${socket.nickname}, is comming.`,
                                    robot
                                );
                            }
                        });
                    }
                }
            } else {
                const form = getUserByUuid(socket.uuid);
                const users = Object.keys(socketMap);
                users.forEach((item) => {
                    sendMessage(socketMap[item], data.msg, form[0]);
                });
                socket.encrypt = socket.handshake.query.encrypt || uuidv4();
                socket.clientNum = clientCount;
            }
        }
    });

    socket.on('disconnect', (reason) => {
        const form = getUserByUuid(socket.uuid);
        const users = Object.keys(socketMap);
        if (form.length > 0) {
            delete socketMap[socket.uuid];
            users.forEach((item) => {
                if (socketMap[item]) {
                    sendMessage(
                        socketMap[item],
                        `${form[0].nickname} was leave`,
                        robot
                    );
                    updateOnlineList(socketMap[item]);
                }
            });
        }
        clientCount -= 1;
    });
});
console.log('websocket listening on port ' + PORT);
