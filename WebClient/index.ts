
import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import { MdButton, MdContent, MdApp, MdCard, MdToolbar, MdField, MdProgress, MdDrawer, MdList, MdMenu } from 'vue-material/dist/components';
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'

import App from './App/App';
import Welcome from './Welcome/Welcome';
import { polyfill } from 'es6-promise';
import { appManager } from './AppManager';
import { fileManager } from './FileManager';

const Home = () => import('./Home/Home');

// Setup the Promise shim for browsers that don't support promises.
polyfill();

Vue.use(VueRouter);
Vue.use(MdButton);
Vue.use(MdContent);
Vue.use(MdApp);
Vue.use(MdCard);
Vue.use(MdToolbar);
Vue.use(MdField);
Vue.use(MdProgress);
Vue.use(MdDrawer);
Vue.use(MdList);
Vue.use(MdMenu);

const routes: RouteConfig[] = [
    {
        path: '/',
        component: Welcome,
        beforeEnter: (to, from, next) => {
            if (appManager.user !== null) {
                next({ path: '/home' });
            }
            else {
                next();
            }
        }
    },
    {
        path: '/home',
        component: Home
    },
]

const router = new VueRouter({
    routes
});

router.beforeEach((to, from, next) => {
    if (to.path !== '/') {
        if (appManager.user === null) {
            next({ path: '/' });
            return;
        }
    }
    next();
});

const app = new Vue({
    router,
    render: createEle => createEle(App)
}).$mount('#app');

fileManager.init();