import { io } from 'socket.io-client';

let socket = io(process.env.VUE_APP_BASE_URL, {
    transports: ['websocket'],
    autoConnect: false,
    rememberUpgrade: true,
    auth: {
        token: localStorage.getItem('token') || '',
    },
});
export default socket;
