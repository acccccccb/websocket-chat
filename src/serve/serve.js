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

const roomList = {
    hall: 'hall',
};

const userDataFile = 'dataBase/users.json';
// 获取用户表
const getUserList = () => {
    return fs.readJsonSync(path.resolve(__dirname, userDataFile));
};
// 获取用户
const findUserByUuid = (uuid) => {
    return getUserList().find((item) => {
        return item.uuid === uuid;
    });
};
const robot = findUserByUuid('serve');

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
        type: 'message',
        from,
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
    socket.emit(type, {
        encrypt: encryptData(obj),
    });
};
// 群发
const sendMessageAll = (room, msg, from, data = {}, type = 'message') => {
    delete from.password;
    delete from.username;
    const obj = {
        msg,
        data,
        type: 'message',
        from,
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
    io.to(room).emit(type, {
        encrypt: encryptData(obj),
    });
};
// 群发系统消息
const sendNoticeAll = (room, msg, from, data = {}, type = 'message') => {
    delete from.password;
    delete from.username;
    const obj = {
        msg,
        data,
        type: 'notice',
        from,
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
    io.to(room).emit(type, {
        encrypt: encryptData(obj),
    });
};
// 更新在线用户列表
const updateOnlineList = (room) => {
    const list = [];
    Object.keys(socketMap).forEach((item) => {
        list.push({
            room,
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
    io.to(room).emit('onlineList', {
        encrypt: encryptData(obj),
    });
};
// 登出
const logout = (socket) => {
    if (socket) {
        socket.emit('logout', {
            msg: '已在其它地方登录',
        });
        socket.leave(roomList.hall);
        socket.disconnect(true);
    }
};

io.on('connection', (socket) => {
    const uuid = decryptToken(socket.handshake.auth.token);

    if (!uuid) {
        sendMessage(
            socket,
            '' +
                '你还未登录<br />' +
                '输入 用户名@密码 登录<br />' +
                '项目地址：<br />' +
                '<a href="https://github.com/acccccccb/websocket-chat" target="_blank">https://github.com/acccccccb/websocket-chat</a>' +
                '',
            robot
        );
    } else {
        const filter = findUserByUuid(uuid);
        if (filter) {
            if (socketMap[uuid]) {
                logout(socketMap[uuid]);
            }
            socket.uuid = filter.uuid;
            socket.nickname = filter.nickname;
            socket.username = filter.username;
            socket.avatar = filter.avatar;
            socket.level = filter.level;
            socketMap[socket.uuid] = socket;
            socketMap[socket.uuid].join(roomList.hall);
            sendMessage(
                socket,
                `${socket.nickname} 欢迎回来`,
                robot,
                {
                    uuid: filter.uuid,
                    nickname: filter.nickname,
                    username: filter.username,
                    avatar: filter.avatar,
                    level: filter.level,
                    token: encryptToken(filter.uuid),
                },
                'loginIn'
            );
            sendNoticeAll(roomList.hall, `${socket.nickname} 来了`, robot);
            updateOnlineList(roomList.hall);
        } else {
            sendMessage(socket, '用户不存在', robot);
            socket.emit('logout', { msg: '用户不存在，请刷新后重新登录' });
        }
    }
    socket.on('message', (encryptData) => {
        if (!encryptData.encrypt || typeof encryptData.encrypt !== 'object') {
            sendMessage(socket, '密钥格式不正确', robot);
            return;
        }
        if (encryptData.encrypt.length > 30) {
            sendMessage(socket, '内容过多，超出500字', robot);
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
                        const filter = getUserList().find((item) => {
                            return (
                                username === item.username &&
                                password === item.password
                            );
                        });
                        if (!filter) {
                            sendMessage(
                                socket,
                                `用户名或密码错误：${username}@${password}`,
                                robot
                            );
                        } else {
                            logout(socketMap[socket.uuid]);
                            socket.uuid = filter.uuid;
                            socket.nickname = filter.nickname;
                            socket.username = filter.username;
                            socket.avatar = filter.avatar;
                            socket.level = filter.level;
                            socketMap[socket.uuid] = socket;
                            socketMap[socket.uuid].join(roomList.hall);
                            sendMessage(
                                socket,
                                `${socket.nickname} 登陆成功`,
                                robot,
                                {
                                    uuid: filter.uuid,
                                    nickname: filter.nickname,
                                    username: filter.username,
                                    avatar: filter.avatar,
                                    level: filter.level,
                                    token: encryptToken(filter.uuid),
                                },
                                'loginIn'
                            );
                            sendNoticeAll(
                                roomList.hall,
                                `${socket.nickname} 来了`,
                                robot
                            );
                            updateOnlineList(roomList.hall);
                        }
                    }
                } else {
                    const from = findUserByUuid(socket.uuid);
                    sendMessageAll(roomList.hall, data.msg, from);
                }
            }
        } catch (e) {
            console.log(e);
            sendMessage(socket, e.toString(), robot);
            return;
        }
    });
    socket.on('disconnect', () => {
        const from = findUserByUuid(socket.uuid);
        if (from && socketMap[socket.uuid]) {
            socketMap[socket.uuid].emit('logout');
            socketMap[socket.uuid].leave(roomList.hall);
            socketMap[socket.uuid].disconnect(true);
            delete socketMap[socket.uuid];
            sendNoticeAll(roomList.hall, `${from.nickname} 走了`, robot);
            updateOnlineList(roomList.hall);
        }
    });
});
console.log('websocket listening on port ' + PORT);
