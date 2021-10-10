const app = require('http').createServer();
const io = require('socket.io')(app);
const moment = require('moment');
const uuidv4 = require('uuid').v4;
const fs = require('fs-extra');
const {
    encryptData,
    decryptData,
    encryptToken,
    decryptToken,
} = require('./utils/util');
const path = require('path');

const PORT = 3000;

const userDataFile = 'dataBase/users.json';
// 获取用户表
const getUserList = () => {
    return fs.readJsonSync(path.resolve(__dirname, userDataFile));
};
// 获取用户
const getUserByUuid = (uuid) => {
    return getUserList().filter((item) => {
        return item.uuid === uuid;
    });
};
const robot = getUserByUuid('serve')[0];

//客户端计数
let clientCount = 0;

//存储客户端socket
let socketMap = {};

app.listen(PORT);
// 发送消息
const sendMessage = (socket, msg, from, data = {}, type = 'message') => {
    if (!socket) {
        return;
    }
    delete from.password;
    delete from.username;
    const obj = {
        msg,
        data,
        from,
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
    socket.emit(type, {
        encrypt: encryptData(obj),
    });
};

// 更新在线用户列表
const updateOnlineList = (socket) => {
    if (!socket) {
        return;
    }
    const list = [];
    Object.keys(socketMap).forEach((item) => {
        list.push({
            uuid: socketMap[item].uuid,
            username: socketMap[item].username,
            nickname: socketMap[item].nickname,
            avatar: socketMap[item].avatar,
            level: socketMap[item].level,
        });
    });
    const obj = {
        userList: list,
        count: Object.keys(socketMap).length,
    };
    socket.emit('onlineList', {
        encrypt: encryptData(obj),
    });
};
io.on('connection', (socket) => {
    clientCount += 1;
    const uuid = decryptToken(socket.handshake.auth.token);
    socket.uuid = uuid;
    if (!socket.uuid) {
        sendMessage(socket, '你还未登录', robot);
    } else {
        const filter = getUserByUuid(uuid);
        if (filter.length > 0) {
            socket.uuid = filter[0].uuid;
            socket.nickname = filter[0].nickname;
            socket.username = filter[0].username;
            socket.avatar = filter[0].avatar;
            socket.level = filter[0].level;
            socketMap[socket.uuid] = socket;
            sendMessage(
                socket,
                `${socket.nickname} 欢迎回来`,
                robot,
                {
                    uuid: filter[0].uuid,
                    nickname: filter[0].nickname,
                    username: filter[0].username,
                    avatar: filter[0].avatar,
                    level: filter[0].level,
                    token: encryptToken(filter[0].uuid),
                },
                'loginIn'
            );
            const users = Object.keys(socketMap);
            users.forEach((item) => {
                updateOnlineList(socketMap[item]);
                if (item !== socket.uuid) {
                    sendMessage(
                        socketMap[item],
                        `${socket.nickname} 来了`,
                        robot
                    );
                }
            });
        } else {
            sendMessage(socket, '无效token', robot);
        }
    }
    socket.on('message', (encryptData) => {
        if (!encryptData.encrypt || typeof encryptData.encrypt !== 'object') {
            sendMessage(socket, '密钥格式不正确', robot);
            return;
        }

        try {
            let data = decryptData(encryptData.encrypt);
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
                        const filter = getUserList().filter((item) => {
                            return (
                                username === item.username &&
                                password === item.password
                            );
                        });
                        if (filter.length === 0) {
                            sendMessage(
                                socket,
                                `用户名或密码错误：${username}@${password}`,
                                robot
                            );
                        } else {
                            socket.uuid = filter[0].uuid;
                            socket.nickname = filter[0].nickname;
                            socket.username = filter[0].username;
                            socket.avatar = filter[0].avatar;
                            socket.level = filter[0].level;
                            socketMap[socket.uuid] = socket;
                            sendMessage(
                                socket,
                                `${socket.nickname} 登陆成功`,
                                robot,
                                {
                                    uuid: filter[0].uuid,
                                    nickname: filter[0].nickname,
                                    username: filter[0].username,
                                    avatar: filter[0].avatar,
                                    level: filter[0].level,
                                    token: encryptToken(filter[0].uuid),
                                },
                                'loginIn'
                            );
                            const users = Object.keys(socketMap);
                            users.forEach((item) => {
                                updateOnlineList(socketMap[item]);
                                if (item !== socket.uuid) {
                                    sendMessage(
                                        socketMap[item],
                                        `${socket.nickname} 来了`,
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
        } catch (e) {
            console.log(e);
            sendMessage(socket, e.toString(), robot);
            return;
        }
    });

    socket.on('disconnect', (reason) => {
        const form = getUserByUuid(socket.uuid);
        const users = Object.keys(socketMap);
        if (form.length > 0) {
            if (socketMap[socket.uuid]) {
                delete socketMap[socket.uuid];
                users.forEach((item) => {
                    if (socketMap[item]) {
                        sendMessage(
                            socketMap[item],
                            `${form[0].nickname} 走了`,
                            robot
                        );
                        updateOnlineList(socketMap[item]);
                    }
                });
            }
        }
        clientCount -= 1;
    });
});
console.log('websocket listening on port ' + PORT);
