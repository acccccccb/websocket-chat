import Vue from 'vue';
import 'ant-design-vue/dist/antd.css';
import '../client/lazy_use.js';
import App from './App.vue';
import router from './router';
import store from './store';
import socket from '@/client/api/websocket';

Vue.prototype.socket = socket;

Vue.config.productionTip = false;
new Vue({
    router,
    store,
    render: (h) => h(App),
}).$mount('#app');
