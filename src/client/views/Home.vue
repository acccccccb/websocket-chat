<template>
    <a-spin :spinning="!onLine" :tip="loadingText">
        <template slot="indicator">
            <a-icon
                v-if="onlineStatus === 'loading'"
                type="loading"
                style="font-size: 24px"
                spin
            />
            <a-icon
                v-if="onlineStatus === 'offline'"
                type="api"
                style="font-size: 24px"
            />
            <a-icon
                v-if="onlineStatus === 'error'"
                type="warning"
                style="font-size: 24px"
            />
        </template>
        <a-card
            id="chatListBody"
            class="home"
            :bordered="false"
            :body-style="{
                padding: '0',
            }"
        >
            <template slot="title"> Chat（{{ onLineCount }}）</template>
            <template slot="extra">
                <a-button
                    style="margin-right: 10px;"
                    type="default"
                    :disabled="message.length === 0"
                    @click="clearMessage"
                    icon="delete"
                />
                <a-button
                    type="default"
                    :disabled="!userInfo.uuid"
                    @click="userListVisible = !userListVisible"
                    icon="team"
                />
            </template>

            <div
                class="chat-list"
                id="chatList"
                :style="{
                    height: innerHeight - 73 - 48 + 'px',
                }"
            >
                <a-list item-layout="horizontal" :data-source="message">
                    <a-list-item slot="renderItem" slot-scope="item, index">
                        <a-comment :datetime="moment(item.time).fromNow()">
                            <template slot="author">
                                <span v-if="item.from.level === 0">
                                    <strong style="color: #ff4d4f;">
                                        {{ item.from.nickname }}
                                    </strong>
                                </span>
                                <span v-else>{{ item.from.nickname }}</span>
                            </template>
                            <template slot="avatar">
                                <a-badge
                                    v-if="item.from.level === 0"
                                    :offset="[-3, 3]"
                                >
                                    <a-icon
                                        slot="count"
                                        type="sketch-circle"
                                        theme="filled"
                                        style="color: #108ee9;background:#fff;border-radius: 50%;"
                                    />
                                    <a-avatar
                                        shape="square"
                                        icon="robot"
                                        style="background: #ff4d4f"
                                    ></a-avatar>
                                </a-badge>
                                <a-avatar
                                    shape="square"
                                    v-else
                                    :style="{
                                        background: stc(item.from.nickname),
                                    }"
                                >
                                    {{ item.from.nickname.substring(0, 2) }}
                                </a-avatar>
                            </template>
                            <div slot="content">
                                <div
                                    v-if="item.from.level === 0"
                                    class="message-content serve-message"
                                >
                                    {{ item.msg }}
                                </div>
                                <div
                                    v-else-if="item.from.uuid === userInfo.uuid"
                                    class="message-content my-message"
                                >
                                    {{ item.msg }}
                                </div>
                                <div
                                    v-else
                                    class="message-content other-message"
                                >
                                    {{ item.msg }}
                                </div>
                            </div>
                        </a-comment>
                    </a-list-item>
                </a-list>
            </div>

            <a-drawer
                placement="right"
                :closable="false"
                :visible="userListVisible"
                @close="userListVisible = false"
            >
                <template slot="title">
                    当前在线 {{ onLineCount }} 人
                    <a-button
                        @click="logOut"
                        style="float:right;"
                        size="small"
                        type="danger"
                    >
                        退出
                    </a-button>
                </template>
                <a-empty
                    v-if="onLineList.length === 0"
                    description="无人在线"
                ></a-empty>
                <template v-else>
                    <p v-for="item in onLineList">
                        <a-badge v-if="item.level === 0" :offset="[-3, 3]">
                            <a-icon
                                slot="count"
                                type="sketch-circle"
                                theme="filled"
                                style="color: #108ee9;background:#fff;border-radius: 50%;"
                            />
                            <a-avatar
                                shape="square"
                                :size="32"
                                :style="{
                                    background: stc(item.nickname),
                                }"
                            >
                                {{ item.nickname.substring(0, 2) }}
                            </a-avatar>
                        </a-badge>
                        <a-badge v-else dot color="green">
                            <a-avatar
                                shape="square"
                                :size="32"
                                :style="{
                                    background: stc(item.nickname),
                                }"
                            >
                                {{ item.nickname.substring(0, 2) }}
                            </a-avatar>
                        </a-badge>

                        {{ item.nickname }}
                    </p>
                </template>
            </a-drawer>
        </a-card>
        <div
            class="message"
            id="message"
            :style="{
                top: innerHeight - 73 + 'px',
            }"
        >
            <a-input-search
                size="large"
                v-model="send"
                placeholder="发送消息"
                @search="sendMessage"
                @focus="listenTypeEvent"
                @blur="listenTypeEvent"
            >
                <a-button slot="enterButton" type="primary">
                    发送
                </a-button>
            </a-input-search>
        </div>
    </a-spin>
</template>

<script>
    import stc from 'string-to-color';
    import PerfectScrollbar from 'perfect-scrollbar';
    import { v4 as uuidv4 } from 'uuid';
    import { io } from 'socket.io-client';
    import moment from 'moment';
    import JSEncrypt from 'jsencrypt';
    const encrypt = new JSEncrypt(); // 创建加密对象实例
    const decrypt = new JSEncrypt(); // 创建加密对象实例
    // rsa_public_key
    const pubKey = process.env.VUE_APP_PUB_KEY;
    // rsa_1024_priv
    const privateKey = process.env.VUE_APP_PRV_KEY.replace(/\\n/g, '\n');
    encrypt.setPublicKey(pubKey); //设置公钥
    decrypt.setPrivateKey(privateKey); // 设置私钥
    export default {
        name: 'Home',
        data() {
            return {
                resizeTimmer: null,
                innerHeight: 0,
                clientHeight: 0,
                onLine: true,
                loadingText: 'Connect...',
                onlineStatus: '',
                ps: null,
                socket: null,
                userListVisible: false,
                message: [],
                onLineList: [],
                onLineCount: 0,
                send: '',
                nicknameEditDisabled: false,
                userInfo: {
                    level: '',
                    username: '',
                    nickname: '',
                    uuid: '',
                    avatar: '',
                    token: '',
                },
            };
        },
        created() {
            this.userInfo.token = localStorage.getItem('token');
        },
        mounted() {
            this.connect();
            window.onresize = () => {
                this.listenTypeEvent();
            };
            this.$nextTick(() => {
                this.innerHeight = window.innerHeight;
                this.clientHeight = document.documentElement.clientHeight;
                this.initScrollBar();
            });
        },
        methods: {
            stc,
            moment,
            listenTypeEvent() {
                setTimeout(() => {
                    this.innerHeight = window.innerHeight;
                    this.ps.update();
                    window.scroll(0, 0);
                    this.$nextTick(() => {
                        this.setChatList();
                    });
                }, 100);
            },
            listenBlurEvent() {
                setTimeout(() => {
                    this.innerHeight = window.innerHeight;
                    window.scroll(0, 0);
                    this.ps.update();
                }, 0);
            },
            initScrollBar() {
                this.ps = new PerfectScrollbar('#chatList', {
                    wheelSpeed: 2,
                    wheelPropagation: false,
                    minScrollbarLength: 20,
                });
            },
            connect() {
                const token = this.userInfo.token;
                this.onLine = false;
                this.onlineStatus = 'loading';
                this.loadingText = '正在连接';
                this.socket = io(process.env.VUE_APP_BASE_URL, {
                    transports: ['websocket'],
                    autoConnect: false,
                    rememberUpgrade: true,
                    auth: {
                        token,
                    },
                });
                this.socket.on('connect', () => {
                    this.onLine = true;
                    this.loadingText = '连接成功';
                });
                this.socket.io.on('reconnect', () => {
                    this.onLine = true;
                    this.loadingText = '连接成功';
                });
                this.socket.io.on('error', () => {
                    this.onLine = false;
                    this.loadingText = '与服务器的连接已断开';
                });
                this.socket.io.on('reconnect_attempt', () => {
                    this.loadingText = '正在重连';
                });
                this.socket.io.on('reconnect_error', () => {
                    this.loadingText = '重新连接失败';
                    this.onlineStatus = 'error';
                    this.socket.close();
                });
                this.socket.on('loginIn', (res) => {
                    this.userInfo = this.decryptData(res.encrypt).data;
                    localStorage.setItem('token', this.userInfo.token);
                    this.message.push(this.decryptData(res.encrypt));
                    this.ps.update();
                });
                this.socket.on('message', (res) => {
                    this.message.push(this.decryptData(res.encrypt));
                    this.$nextTick(() => {
                        this.setChatList();
                        this.ps.update();
                    });
                });
                this.socket.on('onlineList', (res) => {
                    const result = this.decryptData(res.encrypt);
                    this.onLineList = result.userList;
                    this.onLineCount = result.count;
                });
                this.socket.connect();
            },
            encryptData(data, len = 64) {
                const str = JSON.stringify(data);
                const result = [];
                const splitCount = Math.ceil(str.length / len);
                for (let i = 0; i < splitCount; i++) {
                    const start = i * len;
                    const end =
                        (i + 1) * len < str.length ? (i + 1) * len : str.length;
                    const substr = str.substring(start, end);
                    result.push(substr);
                }
                return result.map((item) => {
                    return encrypt.encrypt(item);
                });
            },
            decryptData(encryptArr) {
                try {
                    let data = encryptArr.map((item) => {
                        const decyptStr = decrypt.decrypt(item);
                        return decyptStr ? decyptStr : '';
                    });
                    return JSON.parse(data.join(''));
                } catch (e) {
                    return {};
                }
            },
            setChatList() {
                const $el = document.getElementById('chatList');
                $el.scrollTop = $el.scrollHeight;
            },
            sendMessage() {
                if (!this.send) {
                    this.$message.warning('发送内容不能为空');
                    return false;
                }
                const obj = {
                    nickname: this.userInfo.nickname,
                    msg: this.send,
                    from: this.userInfo,
                };
                this.socket.emit('message', {
                    encrypt: this.encryptData(obj),
                });
                this.send = '';
            },
            clearMessage() {
                this.$confirm({
                    title: '是否清空聊天记录',
                    okText: '清空',
                    cancelText: '取消',
                    iconType: 'warning',
                    onOk: () => {
                        this.message = [];
                        this.$message.success('已清空聊天记录');
                    },
                });
            },
            logOut() {
                this.$confirm({
                    title: '确定要退出登陆吗',
                    okText: '退出',
                    cancelText: '取消',
                    iconType: 'warning',
                    onOk: () => {
                        localStorage.removeItem('token');
                        this.onLine = false;
                        this.onlineStatus = 'offline';
                        this.loadingText = '已退出';
                        this.message = [];
                        this.onLineList = [];
                        this.onLineCount = 0;
                        this.userListVisible = false;
                        this.socket.close();
                        this.$message.success('已退出登录');
                    },
                });
            },
        },
    };
</script>
<style lang="scss" scoped>
    @import '~perfect-scrollbar/css/perfect-scrollbar.css';
    .home {
        width: 100%;
        height: 100%;
        max-width: 1000px;
        margin: auto auto;
        padding-top: 50px;
    }
    .chat-list {
        width: 100%;
        position: relative;
        overflow: hidden;
        padding-left: 16px;
        padding-right: 16px;
    }
    .message {
        border-top: 1px solid #dedede;
        box-shadow: 0 -5px 10px rgba(125, 125, 125, 0.1);
        padding: 16px 8px;
        position: fixed;
        /*bottom: 0;*/
        width: 100%;
        height: 73px;
        max-width: 1000px;
        margin: auto;
        background: #f9f9f9;
    }
    .chat-time {
        opacity: 0.45;
        font-size: 12px;
        margin-left: 10px;
    }
    .message-content {
        line-height: 100%;
        padding: 12px 8px;
        border-radius: 6px;
    }
    .my-message {
        background: #1890ff;
        color: #fff;
    }
    .other-message {
        background: #ededed;
        color: #333;
    }
    .serve-message {
        background: #ffe3db;
        color: #ff4d4f;
        font-style: italic;
    }
    ::v-deep .ant-card-head {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        max-width: 1000px;
        margin: auto;
        z-index: 999;
    }
    ::v-deep .ant-list {
        word-break: break-all;
    }
    ::v-deep .ant-list-item {
        padding: 8px 0;
        border-bottom: none;
    }
    ::v-deep .ant-comment-inner {
        padding: 8px 0;
    }
    ::v-deep .ant-card-head {
        background: #f9f9f9;
        padding: 0 8px;
    }
    ::v-deep .ant-card-head-title,
    ::v-deep .ant-card-extra {
        padding: 8px 0;
    }
</style>
