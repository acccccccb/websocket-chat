<template>
    <a-card class="home" title="chat" :body-style="{ padding: '16px' }">
        <div class="chat-list">
            <a-list item-layout="horizontal" :data-source="message">
                <a-list-item slot="renderItem" slot-scope="item, index">
                    <a-list-item-meta :description="item.msg">
                        <span slot="title">
                            {{ item.from.nickname }}
                            <span class="chat-time">{{ item.time }}</span>
                        </span>
                        <a-avatar slot="avatar" :src="item.from.avatar" />
                    </a-list-item-meta>
                </a-list-item>
            </a-list>
        </div>
        <div class="message">
            <a-input-group compact>
                <a-input
                    style="width: 20%"
                    placeholder="昵称"
                    type="text"
                    readOnly
                    :disabled="!userInfo.nickname"
                    v-model="userInfo.nickname"
                    :maxLength="8"
                />
                <a-input
                    :disabled="!userInfo.nickname"
                    style="width: 60%"
                    placeholder="发送消息"
                    type="text"
                    v-model="send"
                />
                <a-button
                    type="primary"
                    style="width: 20%"
                    :disabled="!userInfo.nickname || !send"
                    @click="sendMessage"
                >
                    发送
                </a-button>
            </a-input-group>
        </div>
    </a-card>
</template>

<script>
    import { v4 as uuidv4 } from 'uuid';
    import { io } from 'socket.io-client';
    import JSEncrypt from 'jsencrypt';
    const encryptor = new JSEncrypt(); // 创建加密对象实例
    const pubKey =
        '-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4gFOiRiCkUSXOI0ZltyQNqmLKq81HmsMLZ4OXQ6+nDe3FB0EgEB9oHPRwDgc39aB7T8cvhp3/kH0qmhVz304EULAVFui4Ox1FUY7cNGwugrNGu6xe5o+qJIBKz24ibTgudkh/yiF86EYsks+vkkt/Kz3f+cxKHYSh1CCFyouKRQIDAQAB-----END PUBLIC KEY-----';

    encryptor.setPublicKey(pubKey); //设置公钥
    export default {
        name: 'Home',
        data() {
            return {
                uuid: window.localStorage.getItem('uuid') || uuidv4(),
                socket: null,
                message: [],
                send: '',
                nicknameEditDisabled: false,
                userInfo: {
                    nickname: '',
                    uuid: '',
                    avatar: '',
                },
            };
        },
        created() {
            this.socket = io('http://localhost:3000', {
                transports: ['websocket'],
                rememberUpgrade: true,
                auth: {
                    token: this.getQuery('uuid'),
                },
                query: {
                    uuid: this.getQuery('uuid'),
                    encrypt: this.encryptData(JSON.stringify(this.userInfo)),
                },
            });
            this.socket.on('start', (res) => {
                console.log('start', res);
            });
            this.socket.on('loginIn', (res) => {
                this.userInfo = res;
            });
            this.socket.on('welcome', (res) => {
                this.message.push(res);
            });
            this.socket.on('waiting', (res) => {
                console.log(res);
            });
            this.socket.on('message', (res) => {
                this.message.push(res);
            });
            this.socket.emit('start');
        },
        methods: {
            getQuery(key) {
                let query = {};
                let search = window.location.search.replace(/^\?/, '');
                search = search.split('&');
                search.forEach((item) => {
                    const arr = item.split('=');
                    query[arr[0]] = arr[1];
                });
                return query[key] || null;
            },
            encryptData(data) {
                return encryptor.encrypt(data);
            },
            sendMessage() {
                this.socket.emit('message', {
                    nickname: this.userInfo.nickname,
                    msg: this.send,
                    from: this.userInfo,
                });
                this.send = '';
            },
        },
    };
</script>
<style lang="scss">
    .home {
        width: 100%;
        max-width: 1000px;
        margin: auto auto;
    }
    .chat-list {
        height: calc(100vh - 150px);
        overflow-y: scroll;
    }
    .message {
        margin-top: 16px;
    }
    .chat-time {
        opacity: 0.45;
        font-size: 12px;
        margin-left: 10px;
    }
</style>
