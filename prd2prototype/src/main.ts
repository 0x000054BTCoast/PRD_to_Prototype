import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import { appStore } from './stores/appStore';
import './styles/global.css';

const app = createApp(App);

app.use(ElementPlus);
app.use(router);
app.provide('appStore', appStore);

app.mount('#app');
