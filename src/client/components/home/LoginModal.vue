<template>
    <a-modal
        title="登录"
        :visible="visible"
        :confirm-loading="confirmLoading"
        cancelText="取消"
        okText="登录"
        @ok="handleOk"
        @cancel="close"
    >
        <a-form-model ref="form" :model="form">
            <a-form-model-item
                :rules="{
                    required: true,
                    message: '请输入用户名',
                    trigger: ['blur', 'change'],
                }"
                prop="username"
            >
                <a-input v-model="form.username" placeholder="请输入用户名">
                    <a-icon slot="prefix" type="user" />
                </a-input>
            </a-form-model-item>
            <a-form-model-item
                style="margin-bottom: 0"
                :rules="{
                    required: true,
                    message: '请输入用密码',
                    trigger: ['blur', 'change'],
                }"
                prop="password"
            >
                <a-input
                    type="password"
                    v-model="form.password"
                    placeholder="请输入密码"
                >
                    <a-icon slot="prefix" type="lock" />
                </a-input>
            </a-form-model-item>
            <a-form-model-item style="margin-bottom: 0" prop="saveChat">
                <div style="text-align: right">
                    保存聊天记录
                    <a-switch
                        @change="onChange"
                        style="margin-left: 20px"
                        v-model="form.saveChat"
                    />
                </div>
            </a-form-model-item>
        </a-form-model>
    </a-modal>
</template>

<script>
    import { encryptData } from '@/client/utils/crypt';

    export default {
        name: 'LoginModal',
        data() {
            const saveChat = localStorage.getItem('saveChat') === 'true';
            return {
                visible: false,
                saveChat,
                confirmLoading: false,
                form: {
                    username: 'admin',
                    password: '123',
                    saveChat,
                },
            };
        },
        methods: {
            onChange(val) {
                this.saveChat = val;
            },
            show() {
                this.visible = true;
            },
            handleOk() {
                this.$refs.form.validate((valid) => {
                    if (valid) {
                        this.confirmLoading = true;
                        const obj = {
                            nickname: '',
                            msg: `${this.form.username}@${this.form.password}`,
                            from: {},
                        };
                        this.socket.emit('message', {
                            encrypt: encryptData(obj),
                        });
                    }
                });
            },
            close() {
                this.visible = false;
                this.confirmLoading = false;
                this.$refs.form ? this.$refs.form.resetFields() : '';
            },
        },
        watch: {
            saveChat(saveChat) {
                localStorage.setItem('saveChat', saveChat);
            },
        },
    };
</script>

<style scoped></style>
