import { createApp } from 'vue';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import { createPinia } from 'pinia';
import router from './router';
import '../f-you-in-the-blue/theme.css';	//theme
import 'primevue/resources/primevue.min.css';					//core css
import ToastService from 'primevue/toastservice';				//toast
import ConfirmationService from 'primevue/confirmationservice';	//confirm
import 'primeicons/primeicons.css';								//icons
import '../f-you-in-the-blue/icons.css';						//icons
import Tooltip from 'primevue/tooltip';


createApp(App)
	.use(router)
	.use(createPinia())
	.use(PrimeVue)
	.use(ToastService)
	.use(ConfirmationService)
	.directive('tooltip', Tooltip)
	.mount('#app');