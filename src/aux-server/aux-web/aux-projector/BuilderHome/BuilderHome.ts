import Vue from 'vue';
import { Chrome } from 'vue-color';
import Component from 'vue-class-component';
import { Inject, Watch, Provide, Prop } from 'vue-property-decorator';
import {
    File,
    getUserMode,
    UserMode,
    SelectionMode,
    DEFAULT_USER_MODE,
    DEFAULT_SELECTION_MODE,
    getSelectionMode,
    isFile,
} from '@casual-simulation/aux-common';
import BuilderGameView from '../BuilderGameView/BuilderGameView';
import FileTable from '../FileTable/FileTable';
import ColorPicker from '../ColorPicker/ColorPicker';
import { ContextMenuEvent } from '../../shared/interaction/ContextMenuEvent';
import TagEditor from '../TagEditor/TagEditor';
import { SubscriptionLike } from 'rxjs';
import { tap } from 'rxjs/operators';
import FileTableToggle from '../FileTableToggle/FileTableToggle';
import { EventBus } from '../../shared/EventBus';
import { BrowserSimulation } from '@casual-simulation/aux-vm-browser';
import { appManager } from '../../shared/AppManager';

@Component({
    components: {
        'game-view': BuilderGameView,
        'file-table': FileTable,
        'color-picker': ColorPicker,
        'tag-editor': TagEditor,
        'file-table-toggle': FileTableToggle,
    },
})
export default class BuilderHome extends Vue {
    @Provide() home = this;

    debug: boolean = false;

    contextMenuStyle: any = {
        left: '0px',
        top: '0px',
    };

    @Prop() channelId: string;
    contextMenuVisible: boolean = false;
    contextMenuEvent: ContextMenuEvent = null;
    status: string = '';
    files: File[] = [];
    searchResult: any = null;
    isSearch: boolean = false;
    setLargeSheet: boolean = false;
    isDiff: boolean = false;
    tags: string[] = [];
    updateTime: number = -1;
    mode: UserMode = DEFAULT_USER_MODE;
    selectionMode: SelectionMode = DEFAULT_SELECTION_MODE;
    isOpen: boolean = false;
    isLoading: boolean = false;
    progress: number = 0;
    progressMode: 'indeterminate' | 'determinate' = 'determinate';
    private _simulation: BrowserSimulation;

    getUIHtmlElements(): HTMLElement[] {
        const table = <FileTable>this.$refs.table;
        if (table) {
            return table.uiHtmlElements();
        }
        return [];
    }

    get hasFiles() {
        return this.files && this.files.length > 0;
    }

    get filesMode() {
        return this.mode === 'files';
    }

    get workspacesMode() {
        return this.mode === 'worksurfaces';
    }

    get singleSelection() {
        return this.selectionMode === 'single' && this.files.length > 0;
    }

    toggleSheetSize() {
        this.setLargeSheet = !this.setLargeSheet;
    }

    getSheetStyle(): any {
        if (this.setLargeSheet)
            return { 'max-width': '100% !important', width: '100%' };
        else return {};
    }

    handleContextMenu(event: ContextMenuEvent) {
        // Force the component to disable current context menu.
        this.contextMenuEvent = null;
        this.contextMenuVisible = false;

        // Wait for the DOM to update with the above values and then show context menu again.
        this.$nextTick(() => {
            this.contextMenuEvent = event;
            this.contextMenuStyle.left = event.pagePos.x + 'px';
            this.contextMenuStyle.top = event.pagePos.y + 'px';
            this.contextMenuVisible = true;
        });
    }

    hideContextMenu() {
        this.contextMenuVisible = false;
    }

    tagFocusChanged(file: File, tag: string, focused: boolean) {
        this._simulation.helper.setEditingFile(file);
    }

    constructor() {
        super();
    }

    async created() {
        appManager.whileLoggedIn((user, fileManager) => {
            let subs = [];
            this._simulation = appManager.simulationManager.primary;
            this.isLoading = true;
            this.isOpen = false;
            this.files = [];
            this.tags = [];
            this.updateTime = -1;

            subs.push(
                this._simulation.filePanel.filesUpdated.subscribe(e => {
                    this.files = e.files;
                    this.isDiff = e.isDiff;
                    this.searchResult = e.searchResult;
                    this.isSearch = e.isSearch;
                    const now = Date.now();
                    this.updateTime = now;
                }),
                this._simulation.filePanel.isOpenChanged.subscribe(open => {
                    this.isOpen = open;
                })
            );

            subs.push(
                this._simulation.watcher
                    .fileChanged(this._simulation.helper.userFile)
                    .pipe(
                        tap(update => {
                            const file = update;
                            this.mode = getUserMode(file);

                            let previousSelectionMode = this.selectionMode;
                            this.selectionMode = getSelectionMode(file);
                        })
                    )
                    .subscribe()
            );

            this.isLoading = false;
            this._setStatus('Waiting for input...');
            return subs;
        });

        EventBus.$on('toggleSheetSize', this.toggleSheetSize);
    }

    destroyed() {}

    private _setStatus(status: string) {
        this.status = status;
        console.log('[BuilderHome] Status:', status);
    }
}
