const app = require('http').createServer();
const io = require('socket.io')(app);
const moment = require('moment');
const uuidv4 = require('uuid').v4;
const fs = require('fs-extra');
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

const PORT = 3000;

//客户端计数
let clientCount = 0;

//存储客户端socket
let socketMap = {};

app.listen(PORT);

const getUserByUuid = (uuid) => {
    return userList.filter((item) => {
        return item.uuid === uuid;
    });
};

io.on('connection', (socket) => {
    clientCount += 1;
    const filter = getUserByUuid(socket.handshake.query.uuid);
    if (filter.length > 0) {
        socket.uuid = filter[0].uuid;
        socket.nickname = filter[0].nickname;
        socket.avatar = filter[0].avatar;
        socket.emit('loginIn', filter[0]);
        socket.emit('welcome', {
            from: robot,
            msg: `${socket.nickname}, welcome.`,
            time: moment().format('YYYY-MM-DD h:mm:ss'),
            encrypt: socket.encrypt,
        });
        socket.on('message', (data) => {
            const users = Object.keys(socketMap);
            users.forEach((item) => {
                socketMap[item].emit('message', {
                    msg: data.msg,
                    from: filter[0],
                    encrypt: data.encrypt,
                    time: moment().format('YYYY-MM-DD h:mm:ss'),
                });
            });
        });
        socket.encrypt = socket.handshake.query.encrypt || uuidv4();
        socket.clientNum = clientCount;
        socketMap[socket.uuid] = socket;

        socketMap[socket.uuid].emit('start');

        socket.on('disconnect', (data) => {
            console.log(data);
        });
        socket.on('start', () => {
            console.log('start');
            const filter = getUserByUuid(socket.handshake.query.uuid);
            if (filter.length > 0) {
                const users = Object.keys(socketMap);
                users.forEach((item) => {
                    if (socketMap[item].uuid !== socket.uuid) {
                        socketMap[item].emit('message', {
                            msg: `${socket.nickname} is comming.`,
                            from: robot,
                            time: moment().format('YYYY-MM-DD h:mm:ss'),
                            encrypt: socket.encrypt,
                        });
                    }
                });
            }
        });
    } else {
        socket.emit('message', {
            uuid: robot.uuid,
            nickname: robot.nickname,
            from: robot,
            msg: '你还未登录',
            time: moment().format('YYYY-MM-DD h:mm:ss'),
            encrypt: socket.encrypt,
        });
    }
});
console.log('websocket listening on port ' + PORT);
