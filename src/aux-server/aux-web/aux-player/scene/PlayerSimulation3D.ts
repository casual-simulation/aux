import {
    Bot,
    BotCalculationContext,
    hasValue,
    DEFAULT_SCENE_BACKGROUND_COLOR,
    isContextLocked,
    calculateGridScale,
    PrecalculatedBot,
    toast,
    calculateBotValue,
    calculateBooleanTagValue,
    calculateNumericalTagValue,
} from '@casual-simulation/aux-common';
import { Simulation3D } from '../../shared/scene/Simulation3D';
import {
    BrowserSimulation,
    userFileChanged,
} from '@casual-simulation/aux-vm-browser';
import { tap } from 'rxjs/operators';
import { MenuContext } from '../MenuContext';
import { ContextGroup3D } from '../../shared/scene/ContextGroup3D';
import { doesFileDefinePlayerContext } from '../PlayerUtils';
import { SimulationContext } from '../SimulationContext';
import {
    Color,
    Texture,
    OrthographicCamera,
    PerspectiveCamera,
    Math as ThreeMath,
    Vector2,
} from 'three';
import PlayerGameView from '../PlayerGameView/PlayerGameView';
import { CameraRig } from '../../shared/scene/CameraRigFactory';
import { Game } from '../../shared/scene/Game';
import { PlayerGame } from './PlayerGame';
import { PlayerGrid3D } from '../PlayerGrid3D';

export class PlayerSimulation3D extends Simulation3D {
    /**
     * Keep files in a back buffer so that we can add files to contexts when they come in.
     * We should not guarantee that contexts will come first so we must have some lazy file adding.
     */
    private _fileBackBuffer: Map<string, Bot>;

    /**
     * The current context group 3d that the AUX Player is rendering.
     */
    private _contextGroup: ContextGroup3D;

    private _contextBackground: Color | Texture = null;
    private _inventoryColor: Color | Texture = null;
    private _userInventoryColor: Color | Texture = null;
    private _inventoryVisible: boolean = true;

    private _inventoryPannable: boolean = false;
    private _inventoryResizable: boolean = true;
    private _inventoryRotatable: boolean = true;
    private _inventoryZoomable: boolean = true;

    private _inventoryHeight: number = 0;
    private _playerRotationX: number = null;
    private _playerRotationY: number = null;
    private _playerZoom: number = null;

    protected _game: PlayerGame; // Override base class game so that its cast to the Aux Player Game.

    context: string;
    menuContext: MenuContext = null;
    simulationContext: SimulationContext = null;
    grid3D: PlayerGrid3D;

    /**
     * Gets the background color that the simulation defines.
     */
    get backgroundColor() {
        if (this._contextBackground) {
            return this._contextBackground;
        } else {
            return super.backgroundColor;
        }
    }

    /**
     * Gets the visibility of the inventory that the simulation defines.
     */
    get inventoryVisible() {
        if (this._inventoryVisible != null) {
            return this._inventoryVisible;
        } else {
            return true;
        }
    }

    /**
     * Gets the pannability of the inventory camera that the simulation defines.
     */
    get inventoryPannable() {
        if (this._inventoryPannable != null) {
            return this._inventoryPannable;
        } else {
            return false;
        }
    }

    /**
     * Gets the resizability of the inventory viewport that the simulation defines.
     */
    get inventoryResizable() {
        if (this._inventoryResizable != null) {
            return this._inventoryResizable;
        } else {
            return true;
        }
    }

    /**
     * Gets if rotation is allowed in the inventory that the simulation defines.
     */
    get inventoryRotatable() {
        if (this._inventoryRotatable != null) {
            return this._inventoryRotatable;
        } else {
            return true;
        }
    }

    /**
     * Gets if zooming is allowed in the inventory that the simulation defines.
     */
    get inventoryZoomable() {
        if (this._inventoryZoomable != null) {
            return this._inventoryZoomable;
        } else {
            return true;
        }
    }

    /**
     * Gets the height of the inventory that the simulation defines.
     */
    get inventoryHeight() {
        if (this._inventoryHeight != null) {
            return this._inventoryHeight;
        } else {
            return 0;
        }
    }

    /**
     * Gets the zoom level of the player that the simulation defines.
     */
    get playerZoom() {
        if (this._playerZoom != null) {
            return this._playerZoom;
        } else {
            return null;
        }
    }

    /**
     * Gets the x-axis rotation of the player that the simulation defines.
     */
    get playerRotationX() {
        if (this._playerRotationX != null) {
            return this._playerRotationX;
        } else {
            return null;
        }
    }

    /**
     * Gets the x-axis rotation of the player that the simulation defines.
     */
    get playerRotationY() {
        if (this._playerRotationY != null) {
            return this._playerRotationY;
        } else {
            return null;
        }
    }

    /**
     * Gets the background color of the inventory that the simulation defines.
     */
    get inventoryColor() {
        if (this._userInventoryColor) {
            return this._userInventoryColor;
        } else if (this._inventoryColor) {
            return this._inventoryColor;
        } else {
            return null;
        }
    }

    constructor(context: string, game: Game, simulation: BrowserSimulation) {
        super(game, simulation);

        this.context = context;
        this._fileBackBuffer = new Map();

        const calc = this.simulation.helper.createContext();
        this._setupGrid(calc);
    }

    private _setupGrid(calc: BotCalculationContext) {
        if (this.grid3D) {
            this.remove(this.grid3D);
        }
        let gridScale = calculateGridScale(
            calc,
            this._contextGroup ? this._contextGroup.file : null
        );
        this.grid3D = new PlayerGrid3D(gridScale).showGrid(false);
        this.grid3D.useAuxCoordinates = true;
    }

    getMainCameraRig(): CameraRig {
        return this._game.getMainCameraRig();
    }

    init() {
        super.init();

        this._subs.push(
            userFileChanged(this.simulation)
                .pipe(
                    tap(file => {
                        const userMenuContextValue =
                            file.values['aux._userMenuContext'];
                        if (
                            !this.menuContext ||
                            this.menuContext.context !== userMenuContextValue
                        ) {
                            this.menuContext = new MenuContext(
                                this,
                                userMenuContextValue
                            );
                            console.log(
                                '[PlayerSimulation3D] User changed menu context to: ',
                                userMenuContextValue
                            );
                        }

                        const userSimulationContextValue =
                            file.values['aux._userSimulationsContext'];
                        if (
                            !this.simulationContext ||
                            this.simulationContext.context !==
                                userSimulationContextValue
                        ) {
                            this.simulationContext = new SimulationContext(
                                this,
                                userSimulationContextValue
                            );
                            console.log(
                                '[PlayerSimulation3D] User changed simulation context to: ',
                                userSimulationContextValue
                            );
                        }
                    })
                )
                .subscribe()
        );
    }

    setContext(context: string) {
        if (this.context === context) {
            return;
        }
        this.context = context;
        this.unsubscribe();
        this.closed = false;
        this.init();
    }

    protected _frameUpdateCore(calc: BotCalculationContext) {
        super._frameUpdateCore(calc);
        this.menuContext.frameUpdate(calc);
        this.simulationContext.frameUpdate(calc);
        this.grid3D.update();
    }

    protected _createContext(
        calc: BotCalculationContext,
        file: PrecalculatedBot
    ) {
        if (this._contextGroup) {
            return null;
        }
        // We dont have a context group yet. We are in search of a file that defines a player context that matches the user's current context.
        const result = doesFileDefinePlayerContext(file, this.context, calc);
        const contextLocked = isContextLocked(calc, file);
        if (result.matchFound && !contextLocked) {
            // Create ContextGroup3D for this file that we will use to render all files in the context.
            this._contextGroup = new ContextGroup3D(
                this,
                file,
                'player',
                this.decoratorFactory
            );

            this._setupGrid(calc);

            // Subscribe to file change updates for this context file so that we can do things like change the background color to match the context color, etc.
            this._subs.push(
                this.simulation.watcher
                    .fileChanged(file.id)
                    .pipe(
                        tap(update => {
                            const file = update;
                            // Update the context background color.
                            //let contextBackgroundColor =
                            //file.tags['aux.context.color'];

                            let contextBackgroundColor = calculateBotValue(
                                calc,
                                file,
                                `aux.context.color`
                            );

                            this._contextBackground = hasValue(
                                contextBackgroundColor
                            )
                                ? new Color(contextBackgroundColor)
                                : undefined;

                            this._inventoryVisible = calculateBooleanTagValue(
                                calc,
                                file,
                                `aux.context.inventory.visible`,
                                true
                            );

                            this._inventoryPannable = calculateBooleanTagValue(
                                calc,
                                file,
                                `aux.context.inventory.pannable`,
                                false
                            );

                            this._inventoryResizable = calculateBooleanTagValue(
                                calc,
                                file,
                                `aux.context.inventory.resizable`,
                                true
                            );

                            this._inventoryRotatable = calculateBooleanTagValue(
                                calc,
                                file,
                                `aux.context.inventory.rotatable`,
                                true
                            );

                            this._inventoryZoomable = calculateBooleanTagValue(
                                calc,
                                file,
                                `aux.context.inventory.zoomable`,
                                true
                            );

                            this._inventoryHeight = calculateNumericalTagValue(
                                calc,
                                file,
                                `aux.context.inventory.height`,
                                0
                            );

                            this._playerZoom = calculateNumericalTagValue(
                                calc,
                                file,
                                `aux.context.player.zoom`,
                                null
                            );

                            this._playerRotationX = calculateNumericalTagValue(
                                calc,
                                file,
                                `aux.context.player.rotation.x`,
                                null
                            );

                            this._playerRotationY = calculateNumericalTagValue(
                                calc,
                                file,
                                `aux.context.player.rotation.y`,
                                null
                            );

                            let invColor = calculateBotValue(
                                calc,
                                file,
                                `aux.context.inventory.color`
                            );

                            this._inventoryColor = hasValue(invColor)
                                ? new Color(invColor)
                                : undefined;
                        })
                    )
                    .subscribe()
            );

            return this._contextGroup;
        } else if (result.matchFound && contextLocked) {
            let message: string = 'The ' + this.context + ' context is locked.';

            this.simulation.helper.transaction(toast(message));

            this._fileBackBuffer.set(file.id, file);
        } else {
            this._fileBackBuffer.set(file.id, file);
        }
    }

    protected _removeContext(context: ContextGroup3D, removedIndex: number) {
        super._removeContext(context, removedIndex);

        if (context === this._contextGroup) {
            this._contextGroup = null;
        }
    }

    protected async _fileAddedCore(
        calc: BotCalculationContext,
        file: PrecalculatedBot
    ): Promise<void> {
        await Promise.all(
            this.contexts.map(async c => {
                await c.fileAdded(file, calc);

                if (c === this._contextGroup) {
                    // Apply back buffer of files to the newly created context group.
                    for (let entry of this._fileBackBuffer) {
                        if (entry[0] !== file.id) {
                            await this._contextGroup.fileAdded(entry[1], calc);
                        }
                    }

                    this._fileBackBuffer.clear();
                }
            })
        );

        await this.menuContext.fileAdded(file, calc);
        await this.simulationContext.fileAdded(file, calc);

        // Change the user's context after first adding and updating it
        // because the callback for update_bot was happening before we
        // could call fileUpdated from fileAdded.
        if (file.id === this.simulation.helper.userFile.id) {
            const userFile = this.simulation.helper.userFile;
            console.log(
                "[PlayerSimulation3D] Setting user's context to: " +
                    this.context
            );

            let userBackgroundColor = calculateBotValue(
                calc,
                file,
                `aux.context.color`
            );

            this._userInventoryColor = hasValue(userBackgroundColor)
                ? new Color(userBackgroundColor)
                : undefined;

            await this.simulation.helper.updateBot(userFile, {
                tags: { 'aux._userContext': this.context },
            });

            await this.simulation.helper.updateBot(userFile, {
                tags: { 'aux._userChannel': this.simulation.id },
            });

            // need to cause an action when another user joins
            // Send an event to all files indicating that the given context was loaded.
            await this.simulation.helper.action('onPlayerEnterContext', null, {
                context: this.context,
                player: userFile,
            });

            this._subs.push(
                this.simulation.watcher
                    .fileChanged(file.id)
                    .pipe(
                        tap(update => {
                            const file = update;

                            let userBackgroundColor = calculateBotValue(
                                calc,
                                file,
                                `aux.context.color`
                            );

                            this._userInventoryColor = hasValue(
                                userBackgroundColor
                            )
                                ? new Color(userBackgroundColor)
                                : undefined;
                        })
                    )
                    .subscribe()
            );
        }
    }

    protected async _fileUpdatedCore(
        calc: BotCalculationContext,
        file: PrecalculatedBot
    ) {
        await super._fileUpdatedCore(calc, file);
        await this.menuContext.fileUpdated(file, [], calc);
        await this.simulationContext.fileUpdated(file, [], calc);
    }

    protected _fileRemovedCore(calc: BotCalculationContext, file: string) {
        super._fileRemovedCore(calc, file);
        this.menuContext.fileRemoved(file, calc);
        this.simulationContext.fileRemoved(file, calc);
    }

    unsubscribe() {
        this._contextGroup = null;
        super.unsubscribe();
    }
}
