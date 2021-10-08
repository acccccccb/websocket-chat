<template>
    <a-spin :spinning="!onLine" tip="Connect...">
        <a-icon slot="indicator" type="loading" style="font-size: 24px" spin />
        <a-card
            id="chatListBody"
            class="home"
            :bordered="false"
            :body-style="{ padding: '0' }"
        >
            <template slot="title"> Chat（{{ onLineCount }}） </template>
            <template slot="extra">
                <a-button
                    type="default"
                    :disabled="!userInfo.uuid"
                    @click="userListVisible = !userListVisible"
                    icon="team"
                />
            </template>

            <div class="chat-list" id="chatList">
                <a-list item-layout="horizontal" :data-source="message">
                    <a-list-item slot="renderItem" slot-scope="item, index">
                        <a-comment
                            :author="item.from.nickname"
                            :avatar="item.from.avatar"
                            :datetime="moment(item.time).fromNow()"
                        >
                            <div
                                :class="
                                    item.from.uuid === 'serve'
                                        ? 'serve-message'
                                        : ''
                                "
                                slot="content"
                            >
                                {{ item.msg }}
                            </div>
                        </a-comment>
                    </a-list-item>
                </a-list>
            </div>
            <div class="message">
                <a-input-search
                    size="large"
                    v-model="send"
                    placeholder="发送消息"
                    @search="sendMessage"
                >
                    <a-button slot="enterButton" type="primary">
                        发送
                    </a-button>
                </a-input-search>
            </div>
            <a-drawer
                placement="right"
                :closable="false"
                :visible="userListVisible"
                @close="userListVisible = false"
            >
                <template slot="title">
                    当前在线 {{ onLineCount }} 人
                </template>
                <a-empty
                    v-if="onLineList.length === 0"
                    description="无人在线"
                ></a-empty>
                <template v-else>
                    <p v-for="item in onLineList">
                        <a-badge dot>
                            <a-avatar :src="item.avatar" :size="32"></a-avatar>
                        </a-badge>
                        {{ item.nickname }}
                    </p>
                </template>
            </a-drawer>
        </a-card>
    </a-spin>
</template>

<script>
    import PerfectScrollbar from 'perfect-scrollbar';
    import { v4 as uuidv4 } from 'uuid';
    import { io } from 'socket.io-client';
    import moment from 'moment';
    import JSEncrypt from 'jsencrypt';
    const encryptor = new JSEncrypt(); // 创建加密对象实例
    const pubKey =
        '-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4gFOiRiCkUSXOI0ZltyQNqmLKq81HmsMLZ4OXQ6+nDe3FB0EgEB9oHPRwDgc39aB7T8cvhp3/kH0qmhVz304EULAVFui4Ox1FUY7cNGwugrNGu6xe5o+qJIBKz24ibTgudkh/yiF86EYsks+vkkt/Kz3f+cxKHYSh1CCFyouKRQIDAQAB-----END PUBLIC KEY-----';

    encryptor.setPublicKey(pubKey); //设置公钥
    export default {
        name: 'Home',
        data() {
            return {
                onLine: true,
                ps: null,
                socket: null,
                userListVisible: false,
                message: [],
                onLineList: [],
                onLineCount: 0,
                send: 'admin@123',
                nicknameEditDisabled: false,
                userInfo: {
                    username: '',
                    nickname: '',
                    uuid: '',
                    avatar: '',
                },
            };
        },
        created() {
            this.connect();
        },
        mounted() {
            this.initScrollBar();
        },
        methods: {
            moment,
            initScrollBar() {
                this.ps = new PerfectScrollbar('#chatList', {
                    wheelSpeed: 2,
                    wheelPropagation: false,
                    minScrollbarLength: 20,
                });
            },
            connect() {
                this.socket = io(process.env.VUE_APP_BASE_URL, {
                    transports: ['websocket'],
                    autoConnect: false,
                    rememberUpgrade: true,
                    auth: {
                        token: this.userInfo.uuid,
                    },
                    query: {
                        uuid: this.userInfo.uuid,
                    },
                });
                this.socket.connect();
                this.socket.on('loginIn', (res) => {
                    this.userInfo = res.data;
                    this.message.push(res);
                    this.ps.update();
                });
                this.socket.on('message', (res) => {
                    this.message.push(res);
                    this.$nextTick(() => {
                        this.setChatList();
                        this.ps.update();
                    });
                });
                this.socket.on('onlineList', (res) => {
                    this.onLineList = res.userList;
                    this.onLineCount = res.count;
                });
            },
            encryptData(data) {
                const str = JSON.stringify(data);
                const size = 20;
                const result = [];
                if (str.length > size) {
                    const splitCount = Math.ceil(str.length / size);
                    console.log('需要分段加密', splitCount);
                    for (let i in splitCount) {
                        console.log(i);
                    }
                }
                console.log('result', result);
                return encryptor.encrypt(JSON.stringify(data));
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
                    // from: this.userInfo,
                };
                this.socket.emit('message', {
                    encrypt: this.encryptData(obj),
                });
                this.send = '';
            },
        },
    };
</script>
<style lang="scss" scoped>
    @import '~perfect-scrollbar/css/perfect-scrollbar.css';
    .home {
        width: 100%;
        max-width: 1000px;
        margin: auto auto;
    }
    .chat-list {
        width: 100%;
        height: calc(100vh - 138px);
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
        bottom: 0;
        width: 100%;
        max-width: 1000px;
        margin: auto;
        background: #f9f9f9;
    }
    .chat-time {
        opacity: 0.45;
        font-size: 12px;
        margin-left: 10px;
    }
    .serve-message {
        color: red;
    }
    ::v-deep .ant-list-item {
        padding: 8px 0;
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
