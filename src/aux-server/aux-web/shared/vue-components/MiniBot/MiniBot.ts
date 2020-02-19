import Vue from 'vue';
import Component from 'vue-class-component';
import { Inject, Watch, Prop } from 'vue-property-decorator';
import { tagsOnBot, botTags, Bot } from '@casual-simulation/aux-common';
import { BotRenderer } from '../../scene/BotRenderer';
import { appManager } from '../../AppManager';
import TagColor from '../TagColor/TagColor';
import { EventBus } from '../../EventBus';
import debounce from 'lodash/debounce';

@Component({
    components: {
        'tag-color': TagColor,
    },
})
export default class MiniBot extends Vue {
    @Prop() bot: Bot;
    @Prop({ default: false })
    large: boolean;
    @Prop({ default: false })
    selected: boolean;

    get diffball(): boolean {
        return this.bot && this.bot.id === 'mod';
    }

    @Prop({ default: false })
    isSearch: boolean;

    /**
     * Whether the bot should create a mod when dragged.
     */
    @Prop({ default: false })
    createMod: boolean;

    image: string = '';
    label: string = '';
    labelColor: string = '#000';
    isEmpty: boolean = false;

    @Inject() botRenderer: BotRenderer;

    get tags() {
        let tags = botTags([this.bot], [], []);
        tags.sort();
        return ['id', ...tags];
    }

    @Watch('bot')
    private _botChanged(bot: Bot) {
        this._updateBot();
    }

    constructor() {
        super();
        this.image = '';
    }

    created() {
        this._updateBot = debounce(this._updateBot.bind(this), 100);
    }

    mounted() {
        this._botChanged(this.bot);
        EventBus.$on('bot_render_refresh', this._handleBotRenderRefresh);
    }

    beforeDestroy() {
        EventBus.$off('bot_render_refresh', this._handleBotRenderRefresh);
    }

    click() {
        this.$emit('click');
    }

    private async _updateBot() {
        this.image = await this.botRenderer.render(
            this.bot,
            appManager.simulationManager.primary.helper.createContext(),
            this.diffball
        );

        this.isEmpty = tagsOnBot(this.bot).length === 0;

        let label = this.bot.tags['auxLabel'];
        if (label) {
            this.label = appManager.simulationManager.primary.helper.calculateFormattedBotValue(
                this.bot,
                'auxLabel'
            );

            const labelColor = this.bot.tags['auxLabelColor'];
            if (labelColor) {
                this.labelColor = appManager.simulationManager.primary.helper.calculateFormattedBotValue(
                    this.bot,
                    'auxLabelColor'
                );
            } else {
                this.labelColor = '#000';
            }
        } else {
            this.label = '';
        }
        this.$forceUpdate();
    }

    private _handleBotRenderRefresh(bot: Bot): void {
        if (this.bot === bot) {
            this._botChanged(bot);
        }
    }
}
