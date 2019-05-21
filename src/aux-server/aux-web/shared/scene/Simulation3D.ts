import { Object3D, PerspectiveCamera, OrthographicCamera, Plane } from 'three';
import { ContextGroup3D } from './ContextGroup3D';
import { Simulation } from '../Simulation';
import {
    AuxObject,
    AuxFile,
    FileCalculationContext,
} from '@casual-simulation/aux-common';
import { SubscriptionLike } from 'rxjs';
import { IGameView } from '../IGameView';
import { concatMap, tap, flatMap as rxFlatMap } from 'rxjs/operators';
import { ArgEvent } from '@casual-simulation/aux-common/Events';
import { flatMap } from 'lodash';

/**
 * Defines a class that is able to render a simulation.
 */
export abstract class Simulation3D extends Object3D
    implements SubscriptionLike {
    protected _subs: SubscriptionLike[];

    /**
     * The game view.
     */
    protected _gameView: IGameView;

    closed: boolean;
    onFileAdded: ArgEvent<AuxFile> = new ArgEvent<AuxFile>();
    onFileUpdated: ArgEvent<AuxFile> = new ArgEvent<AuxFile>();
    onFileRemoved: ArgEvent<AuxFile> = new ArgEvent<AuxFile>();

    /**
     * The list of contexts that are being rendered in the simulation.
     */
    contexts: ContextGroup3D[];

    /**
     * The simulation that this object is rendering.
     */
    simulation: Simulation;

    protected _draggableColliders: Object3D[];
    protected _draggableObjectsDirty: boolean;

    /**
     * Gets the game view that is for this simulation.
     */
    get gameView() {
        return this._gameView;
    }

    /**
     * Creates a new Simulation3D object that can be used to render the given simulation.
     * @param gameView The game view.
     * @param simulation The simulation to render.
     */
    constructor(gameView: IGameView, simulation: Simulation) {
        super();
        this._draggableObjectsDirty = true;
        this._gameView = gameView;
        this.simulation = simulation;
        this.contexts = [];
        this._subs = [];
    }

    /**
     * Initializes the simulation 3D.
     */
    init() {
        // Subscriptions to file events.
        this._subs.push(
            this.simulation.watcher.filesDiscovered
                .pipe(
                    rxFlatMap(files => files),
                    concatMap(file => this._fileAdded(file))
                )
                .subscribe()
        );
        this._subs.push(
            this.simulation.watcher.filesRemoved
                .pipe(
                    rxFlatMap(files => files),
                    tap(file => this._fileRemoved(file))
                )
                .subscribe()
        );
        this._subs.push(
            this.simulation.watcher.filesUpdated
                .pipe(
                    rxFlatMap(files => files),
                    concatMap(file => this._fileUpdated(file, false))
                )
                .subscribe()
        );
        this._subs.push(
            this.simulation.helper.localEvents
                .pipe(
                    tap(e => {
                        if (e.name === 'tween_to') {
                            this._gameView.tweenCameraToFile(
                                e.fileId,
                                e.zoomValue
                            );
                        }
                    })
                )
                .subscribe()
        );
    }

    frameUpdate() {
        const calc = this.simulation.helper.createContext();
        this._frameUpdateCore(calc);
    }

    /**
     * Gets the camera that is used as the primary rendering camera for this simulation.
     */
    abstract getMainCamera(): PerspectiveCamera | OrthographicCamera;

    /**
     * Gets the objects from the simulation that are draggable.
     */
    getDraggableObjects(): Object3D[] {
        if (this._draggableObjectsDirty) {
            const contexts = this._gameView.getContexts();
            if (contexts && contexts.length > 0) {
                this._draggableColliders = flatMap(
                    contexts.filter(c => !!c),
                    f => f.colliders
                ).filter(c => this._isObjectVisible(c));
            } else {
                this._draggableColliders = [];
            }
            this._draggableObjectsDirty = false;
        }
        return this._draggableColliders;
    }

    protected _isObjectVisible(obj: Object3D) {
        if (!obj) {
            return false;
        }
        while (obj) {
            if (!obj.visible) {
                return false;
            }
            obj = obj.parent;
        }
        return true;
    }

    protected _frameUpdateCore(calc: FileCalculationContext) {
        this.contexts.forEach(context => {
            context.frameUpdate(calc);
        });
    }

    protected async _fileAdded(file: AuxObject): Promise<void> {
        let calc = this.simulation.helper.createContext();
        let context = this._createContext(calc, file);
        if (context) {
            this.contexts.push(context);
            this.add(context);
        }

        await this._fileAddedCore(calc, file);
        await this._fileUpdated(file, true);

        this._draggableObjectsDirty = true;
        this.onFileAdded.invoke(file);
    }

    protected async _fileAddedCore(
        calc: FileCalculationContext,
        file: AuxObject
    ): Promise<void> {
        await Promise.all(this.contexts.map(c => c.fileAdded(file, calc)));
    }

    protected async _fileRemoved(id: string): Promise<void> {
        const calc = this.simulation.helper.createContext();
        this._fileRemovedCore(calc, id);

        this._draggableObjectsDirty = true;
        this.onFileRemoved.invoke(null);
    }

    protected _fileRemovedCore(calc: FileCalculationContext, id: string) {
        let removedIndex: number = -1;
        this.contexts.forEach((context, index) => {
            context.fileRemoved(id, calc);
            if (context.file.id === id) {
                removedIndex = index;
            }
        });

        if (removedIndex >= 0) {
            const context = this.contexts[removedIndex];
            this._removeContext(context, removedIndex);
        }
    }

    protected _removeContext(context: ContextGroup3D, removedIndex: number) {
        context.dispose();
        this.remove(context);
        this.contexts.splice(removedIndex, 1);
    }

    protected async _fileUpdated(
        file: AuxObject,
        initialUpdate: boolean
    ): Promise<void> {
        const calc = this.simulation.helper.createContext();
        let { shouldRemove } = this._shouldRemoveUpdatedFile(
            calc,
            file,
            initialUpdate
        );

        await this._fileUpdatedCore(calc, file);

        this._draggableObjectsDirty = true;
        this.onFileUpdated.invoke(file);

        if (shouldRemove) {
            this._fileRemoved(file.id);
        }
    }

    protected async _fileUpdatedCore(
        calc: FileCalculationContext,
        file: AuxObject
    ) {
        await Promise.all(
            this.contexts.map(c => c.fileUpdated(file, [], calc))
        );
    }

    protected _shouldRemoveUpdatedFile(
        calc: FileCalculationContext,
        file: AuxObject,
        initialUpdate: boolean
    ): { shouldRemove: boolean } {
        return {
            shouldRemove: false,
        };
    }

    unsubscribe(): void {
        this._subs.forEach(s => s.unsubscribe());
        this.remove(...this.children);
        this.contexts.splice(0, this.contexts.length);
        this.closed = true;
        this._subs = [];
    }

    /**
     * Creates a new context group for the given file.
     * @param file The file to create the context group for.
     */
    protected abstract _createContext(
        calc: FileCalculationContext,
        file: AuxObject
    ): ContextGroup3D;
}
