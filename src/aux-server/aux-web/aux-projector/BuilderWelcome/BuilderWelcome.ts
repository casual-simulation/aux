import Vue, { ComponentOptions } from 'vue';
import Component from 'vue-class-component';
import Axios from 'axios';
import { appManager } from '../../shared/AppManager';
import uuid from 'uuid/v4';
import { QrcodeStream } from 'vue-qrcode-reader';
import { AuxUser } from '@casual-simulation/aux-vm';
import { LoginErrorReason } from '@casual-simulation/causal-trees';
import { BrowserSimulation } from '@casual-simulation/aux-vm-browser';

@Component({
    components: {
        'qrcode-stream': QrcodeStream,
    },
})
export default class BuilderWelcome extends Vue {
    private _sim: BrowserSimulation;

    users: AuxUser[] = [];

    email: string = '';
    grant: string = '';

    showList: boolean = true;
    showProgress: boolean = false;

    showCreateAccount: boolean = false;
    showQRCode: boolean = false;

    get loginReason(): LoginErrorReason {
        return <LoginErrorReason>this.$route.query.reason || null;
    }

    get channelId(): string {
        return <string>(this.$route.query.id || '');
    }

    async created() {
        this._sim = appManager.simulationManager.simulations.get(
            this.channelId
        );
        this.users = (await appManager.getUsers()).filter(u => !u.isGuest);

        if (this.users.length === 0) {
            this.showList = false;
            this.showCreateAccount = true;
        }

        this._sim.login.loginStateChanged.subscribe(state => {
            if (state.authenticated && state.authorized) {
                this.$router.push({
                    name: 'home',
                    params: { id: this.channelId || null },
                });
            }
        });
    }

    createUser() {
        console.log('[BuilderWelcome] Email submitted: ' + this.email);
        this._login(this.email);
    }

    continueAsGuest() {
        this._login(`guest_${uuid()}`);
    }

    createAccount() {
        this.showCreateAccount = true;
        this.showList = false;
    }

    addAccount() {
        this.showCreateAccount = false;
        this.showList = false;
    }

    signIn(user: AuxUser) {
        this._login(user.username);
    }

    onQrCodeScannerClosed() {}

    onQRCodeScanned(code: string) {
        this._login(this.email, code);
    }

    private async _grant(grant: string) {
        const sim = appManager.simulationManager.simulations.get(
            this.channelId
        );
        await sim.login.setGrant(grant);
    }

    private async _login(username: string, grant?: string) {
        this.showProgress = true;

        const user = await appManager.getUser(username);
        await appManager.setCurrentUser(user);
        await this._sim.login.setUser(user);
    }
}
