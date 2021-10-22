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
            <template slot="title"> 大厅（{{ onLineCount }}） </template>
            <template slot="extra">
                <a-button
                    style="margin-right: 10px"
                    type="default"
                    :disabled="message.length === 0"
                    @click="clearMessage"
                    icon="delete"
                />
                <a-button
                    v-if="userInfo.uuid"
                    type="default"
                    :disabled="!userInfo.uuid"
                    @click="userListVisible = !userListVisible"
                    icon="team"
                />
                <a-button
                    v-else
                    type="default"
                    @click="showLoginModal"
                    icon="login"
                />
            </template>

            <div
                class="chat-list"
                id="chatList"
                :style="{
                    height: innerHeight - 73 - 48 + 'px',
                }"
            >
                <div class="message-box">
                    <div v-for="item in message">
                        <template v-if="item.type === 'message'">
                            <div
                                v-if="item.from.uuid !== userInfo.uuid"
                                class="message-list"
                            >
                                <div class="message-avatar">
                                    <a-badge
                                        v-if="item.from.level === 0"
                                        :offset="[-3, 3]"
                                    >
                                        <a-icon
                                            slot="count"
                                            type="sketch-circle"
                                            theme="filled"
                                            style="
                                                color: #108ee9;
                                                background: #fff;
                                                border-radius: 50%;
                                            "
                                        />
                                        <a-avatar
                                            shape="square"
                                            icon="robot"
                                            :style="{
                                                background: stc(
                                                    item.from.nickname
                                                ),
                                            }"
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
                                </div>
                                <div>
                                    <div class="message-info">
                                        <span
                                            class="message-nickname"
                                            :class="
                                                item.from.level === 0
                                                    ? 'message-nickname-admin'
                                                    : 'message-nickname-user'
                                            "
                                        >
                                            {{ item.from.nickname }}
                                        </span>
                                        <span class="message-time">{{
                                            moment(item.time).fromNow()
                                        }}</span>
                                    </div>
                                    <template>
                                        <div
                                            v-if="item.from.level === 0"
                                            class="
                                                message-content
                                                serve-message
                                            "
                                            v-html="item.msg"
                                        ></div>
                                        <div
                                            v-else-if="
                                                item.from.uuid === userInfo.uuid
                                            "
                                            class="message-content my-message"
                                        >
                                            {{ item.msg }}
                                        </div>
                                        <div
                                            v-else
                                            class="
                                                message-content
                                                other-message
                                            "
                                        >
                                            {{ item.msg }}
                                        </div>
                                    </template>
                                </div>
                            </div>
                            <div v-else class="message-list-self">
                                <template>
                                    <div
                                        v-if="item.from.level === 0"
                                        class="message-content serve-message"
                                        v-html="item.msg"
                                    ></div>
                                    <div
                                        v-else-if="
                                            item.from.uuid === userInfo.uuid
                                        "
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
                                </template>
                                <div class="message-avatar-self">
                                    <a-badge
                                        v-if="item.from.level === 0"
                                        :offset="[-3, 3]"
                                    >
                                        <a-icon
                                            slot="count"
                                            type="sketch-circle"
                                            theme="filled"
                                            style="
                                                color: #108ee9;
                                                background: #fff;
                                                border-radius: 50%;
                                            "
                                        />
                                        <a-avatar
                                            shape="square"
                                            :style="{
                                                background: stc(
                                                    item.from.nickname
                                                ),
                                            }"
                                        >
                                            {{
                                                item.from.nickname.substring(
                                                    0,
                                                    2
                                                )
                                            }}
                                        </a-avatar>
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
                                </div>
                            </div>
                        </template>
                        <template v-if="item.type === 'notice'">
                            <div class="notice" v-html="item.msg"></div>
                        </template>
                    </div>
                </div>
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
                        style="float: right"
                        size="small"
                        type="danger"
                    >
                        退出
                    </a-button>
                </template>
                <div class="user-list-box">
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
                                    style="
                                        color: #108ee9;
                                        background: #fff;
                                        border-radius: 50%;
                                    "
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
                </div>
                <div class="user-list-option">
                    保存聊天记录
                    <a-switch v-model="saveChat" />
                </div>
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
                <span slot="addonBefore">
                    <a-popover trigger="click" placement="topLeft">
                        <template slot="content">
                            <Picker
                                set="apple"
                                :i18n="i18n"
                                :data="emojiIndex"
                                :height="200"
                                :showCategories="true"
                                :showSkinTones="false"
                                :showSearch="false"
                                :showPreview="false"
                                @select="addEmoji"
                            />
                        </template>
                        <a-icon
                            type="smile"
                            style="font-size: 16px; opacity: 0.4"
                        ></a-icon>
                    </a-popover>
                </span>
                <a-button slot="enterButton" type="primary" :disabled="!send">
                    发送
                </a-button>
            </a-input-search>
        </div>
        <LoginModal ref="loginModalRef" @login="submitLogin"></LoginModal>
    </a-spin>
</template>

<script>
    import data from 'emoji-mart-vue-fast/data/apple.json';
    import 'emoji-mart-vue-fast/css/emoji-mart.css';
    import { Picker, EmojiIndex } from 'emoji-mart-vue-fast';
    let emojiIndex = new EmojiIndex(data);
    import stc from 'string-to-color';
    import PerfectScrollbar from 'perfect-scrollbar';
    import { v4 as uuidv4 } from 'uuid';
    import moment from 'moment';

    import { encryptData, decryptData } from '@/client/utils/crypt';
    import LoginModal from '@/client/components/home/LoginModal';

    const socket = window.socket;
    export default {
        name: 'Home',
        components: {
            Picker,
            LoginModal,
        },
        data() {
            return {
                saveChat: false,
                emojiIndex: emojiIndex,
                i18n: {
                    search: '搜索',
                    notfound: '无结果',
                    categories: {
                        search: '搜索结果',
                        recent: '常用',
                        smileys: '表情和手势',
                        people: '人物',
                        nature: '动物和自然',
                        foods: '食物',
                        activity: '活动',
                        places: '旅行和地点',
                        objects: '物品',
                        symbols: '符合',
                        flags: '旗帜',
                        custom: '自定义',
                    },
                },
                resizeTimmer: null,
                innerHeight: 0,
                clientHeight: 0,
                onLine: true,
                loadingText: 'Connect...',
                onlineStatus: '',
                ps: null,
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
            this.saveChat = this.getSaveChat();
            this.userInfo.token = localStorage.getItem('token');

            if (this.saveChat) {
                const messageStr = localStorage.getItem('message');
                this.message = messageStr ? JSON.parse(messageStr) : [];
            } else {
                localStorage.removeItem('message');
            }
        },
        mounted() {
            this.newConnect();
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
            getSaveChat() {
                return localStorage.getItem('saveChat') === 'true';
            },
            newConnect() {
                const socket = this.socket;
                socket.on('connect', () => {
                    this.onLine = true;
                    this.loadingText = '连接成功';
                });
                socket.io.on('reconnect', () => {
                    this.onLine = true;
                    this.loadingText = '连接成功';
                });
                socket.on('logout', (res) => {
                    this.onLine = false;
                    this.onlineStatus = 'error';
                    this.loadingText = res.msg;
                    localStorage.removeItem('token');
                    socket.close();
                });
                socket.io.on('error', () => {
                    this.onLine = false;
                    this.loadingText = '与服务器的连接已断开';
                });
                socket.io.on('reconnect_attempt', () => {
                    this.loadingText = '正在重连';
                });
                socket.io.on('reconnect_error', () => {
                    this.loadingText = '重新连接失败';
                    this.onlineStatus = 'error';
                    socket.close();
                });
                socket.on('loginIn', (res) => {
                    this.userInfo = decryptData(res.encrypt).data;
                    localStorage.setItem('token', this.userInfo.token);
                    this.$message.success(decryptData(res.encrypt).msg);
                    // this.message.push(decryptData(res.encrypt));
                    this.$refs.loginModalRef.close();
                    this.ps.update();
                    this.saveChat = this.getSaveChat();
                });
                socket.on('message', (res) => {
                    this.message.push(decryptData(res.encrypt));
                    this.$nextTick(() => {
                        this.setChatList();
                        this.ps.update();
                    });
                });
                socket.on('onlineList', (res) => {
                    const result = decryptData(res.encrypt);
                    this.onLineList = result.userList;
                    this.onLineCount = result.count;
                });
                socket.connect();
            },
            submitLogin(res) {
                const obj = {
                    nickname: this.userInfo.nickname,
                    msg: `${res.username}@${res.password}`,
                    from: this.userInfo,
                };
                this.socket.emit('message', {
                    encrypt: encryptData(obj),
                });
            },
            setChatList() {
                const $el = document.getElementById('chatList');
                $el.scrollTop = $el.scrollHeight;
            },

            sendMessage() {
                if (!this.send || !this.send.trim()) {
                    this.$message.warning('发送内容不能为空');
                    return false;
                }
                if (this.send.length > 500) {
                    this.$message.warning('内容过多，超出500字');
                    return false;
                }
                const obj = {
                    nickname: this.userInfo.nickname,
                    msg: this.send,
                    from: this.userInfo,
                };
                this.socket.emit('message', {
                    encrypt: encryptData(obj),
                });
                this.send = '';
            },
            clearMessage() {
                this.$confirm({
                    title: '是否清空聊天记录',
                    okText: '清空',
                    cancelText: '取消',
                    icon: 'warning',
                    onOk: () => {
                        this.message = [];
                        this.$message.success('已清空聊天记录');
                        localStorage.removeItem('message');
                    },
                });
            },
            logOut() {
                const socket = this.socket;
                this.$confirm({
                    title: '确定要退出登陆吗',
                    okText: '退出',
                    cancelText: '取消',
                    icon: 'warning',
                    onOk: () => {
                        localStorage.removeItem('token');
                        socket.emit('logout');
                        this.onLine = false;
                        this.onlineStatus = 'offline';
                        this.loadingText = '已退出';
                        this.message = [];
                        this.onLineList = [];
                        this.onLineCount = 0;
                        this.userListVisible = false;
                        socket.close();
                        this.$message.success('已退出登录');
                    },
                });
            },
            addEmoji(e) {
                console.log(e);
                this.send += e.native;
            },
            // 登录
            showLoginModal() {
                this.$refs.loginModalRef.show();
            },
            switchOnChange(val) {
                this.saveChat = val;
            },
        },
        watch: {
            message(val) {
                if (this.saveChat) {
                    localStorage.setItem('message', JSON.stringify(val));
                }
            },
            saveChat(saveChat) {
                localStorage.setItem('saveChat', saveChat);
            },
        },
    };
</script>
<style lang="scss" scoped>
    @import '~perfect-scrollbar/css/perfect-scrollbar.css';
    .home {
        width: 100%;
        height: 100%;
        /*max-width: 1000px;*/
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
        /*max-width: 1000px;*/
        margin: auto;
        background: #f9f9f9;
        left: 50%;
        transform: translateX(-50%);
    }
    .chat-time {
        opacity: 0.45;
        font-size: 12px;
        margin-left: 10px;
    }
    .message-content {
        line-height: 160%;
        padding: 8px 8px;
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
    }
    ::v-deep .ant-card-head {
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        /*max-width: 1000px;*/
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
    .message-box {
        .notice {
            min-height: 22px;
            line-height: 22px;
            margin: 10px auto;
            text-align: center;
            background: aliceblue;
            border-radius: 11px;
            display: block;
            width: 200px;
            color: #949494;
        }
        .message-list-self {
            display: flex;
            justify-content: end;
            padding-top: 12px;
            padding-bottom: 12px;
        }
        .message-list {
            display: flex;
            padding-top: 12px;
            padding-bottom: 12px;
        }
        .message-avatar {
            margin-right: 10px;
        }
        .message-avatar-self {
            margin-left: 10px;
        }
        .message-info {
            margin-bottom: 5px;
        }
        .message-nickname {
            padding-right: 8px;
            font-size: 12px;
            line-height: 18px;
        }
        .message-nickname-admin {
            font-weight: bold;
            color: #ff4d4f;
        }
        .message-nickname-user {
            color: rgba(0, 0, 0, 0.45);
        }
        .message-time {
            padding-right: 8px;
            font-size: 12px;
            line-height: 18px;
            color: #ccc;
            white-space: nowrap;
            cursor: auto;
        }
        .message-content {
            word-break: break-all;
        }
    }
    ::v-deep .emoji-mart-category-label {
        font-size: 12px;
        opacity: 0.45;
    }
    .user-list-box {
        overflow: hidden;
        height: calc(100vh - 148px);
        padding: 5px 0;
        overflow-y: scroll;
    }
    .user-list-option {
        text-align: right;
        padding: 20px 0 0 0;
    }
</style>
