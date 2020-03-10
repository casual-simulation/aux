import { GameObject } from './GameObject';
import { Object3D, Box3, Sphere, Group, Color } from 'three';
import {
    Bot,
    BotCalculationContext,
    calculateGridScale,
} from '@casual-simulation/aux-common';
import { AuxBot3DDecorator } from './AuxBot3DDecorator';
import { DimensionGroup3D } from './DimensionGroup3D';
import { AuxBot3DDecoratorFactory } from './decorators/AuxBot3DDecoratorFactory';
import { DebugObjectManager } from './debugobjectmanager/DebugObjectManager';
import { AuxBotVisualizer } from './AuxBotVisualizer';

/**
 * Defines a class that is able to display Aux bots.
 */
export class AuxBot3D extends GameObject implements AuxBotVisualizer {
    /**
     * The dimension this bot visualization was created for.
     */
    dimension: string;

    /**
     * The dimension group that this visualization belongs to.
     */
    dimensionGroup: DimensionGroup3D;

    /**
     * The bot for the mesh.
     */
    bot: Bot;

    /**
     * The container for the bot.
     */
    container: Group;

    /**
     * The things that are displayed by this bot.
     */
    display: Group;

    /**
     * The list of decorators that this bot is using.
     */
    decorators: AuxBot3DDecorator[];

    private _frameUpdateList: AuxBot3DDecorator[];
    private _boundingBox: Box3 = null;
    private _boundingSphere: Sphere = null;
    private _updatesInFrame: number = 0;

    /**
     * Returns a copy of the bot 3d's current bounding box.
     */
    get boundingBox(): Box3 {
        if (!this._boundingBox) {
            this._computeBoundingObjects();
        }

        return this._boundingBox.clone();
    }

    /**
     * Returns a copy of the bot 3d's current bounding sphere.
     */
    get boundingSphere(): Sphere {
        if (!this._boundingSphere) {
            this._computeBoundingObjects();
        }
        return this._boundingSphere.clone();
    }

    get gridScale(): number {
        const group = this.dimensionGroup;
        const sim = group ? group.simulation3D : null;
        const gridScale = sim
            ? sim.getGridScale(this)
            : calculateGridScale(null, null);
        return gridScale;
    }

    constructor(
        bot: Bot,
        dimensionGroup: DimensionGroup3D,
        dimension: string,
        colliders: Object3D[],
        decoratorFactory: AuxBot3DDecoratorFactory
    ) {
        super();
        this.bot = bot;
        this.dimensionGroup = dimensionGroup;
        this.colliders = colliders;
        this.dimension = dimension;
        this.container = new Group();
        this.display = new Group();
        this.add(this.container);
        this.container.add(this.display);

        this.decorators = decoratorFactory.loadDecorators(this);
        this.updateFrameUpdateList();
    }

    /**
     * Forces the bot to update the bot's bounding box and sphere.
     */
    forceComputeBoundingObjects(): void {
        this._computeBoundingObjects();
    }

    /**
     * Update the internally cached representation of this aux bot 3d's bounding box and sphere.
     */
    private _computeBoundingObjects(): void {
        // Calculate Bounding Box
        if (this._boundingBox === null) {
            this._boundingBox = new Box3();
        }

        this._boundingBox.setFromObject(this.display);

        // Calculate Bounding Sphere
        if (this._boundingSphere === null) {
            this._boundingSphere = new Sphere();
        }
        this._boundingBox.getBoundingSphere(this._boundingSphere);
    }

    /**
     * Notifies the mesh that the given bot has been added to the state.
     * @param bot The bot.
     * @param calc The calculation context.
     */
    botAdded(bot: Bot, calc: BotCalculationContext) {}

    /**
     * Notifies this mesh that the given bot has been updated.
     * @param bot The bot that was updated.
     * @param updates The updates that happened on the bot.
     * @param calc The calculation context.
     */
    botUpdated(bot: Bot, tags: Set<string>, calc: BotCalculationContext) {
        if (this._shouldUpdate(calc, bot)) {
            this._updatesInFrame += 1;
            if (bot.id === this.bot.id) {
                this.bot = bot;
                this._boundingBox = null;
                this._boundingSphere = null;
            }
            for (let i = 0; i < this.decorators.length; i++) {
                this.decorators[i].botUpdated(calc);
            }

            if (DebugObjectManager.enabled && bot.id === this.bot.id) {
                DebugObjectManager.drawBox3(
                    this.boundingBox,
                    new Color('#999'),
                    0.1
                );
            }
        }
    }

    /**
     * Notifies the mesh that itself was removed.
     * @param calc The calculation context.
     */
    botRemoved(id: string, calc: BotCalculationContext) {
        for (let i = 0; i < this.decorators.length; i++) {
            this.decorators[i].botRemoved(calc);
        }
    }

    frameUpdate(calc: BotCalculationContext): void {
        if (this.decorators) {
            for (let decorator of this._frameUpdateList) {
                decorator.frameUpdate(calc);
            }
        }
        if (this._updatesInFrame > 1 && DebugObjectManager.enabled) {
            console.warn(
                '[AuxBot3D] More than 1 update this frame:',
                this._updatesInFrame
            );
        }
        this._updatesInFrame = 0;
    }

    updateFrameUpdateList() {
        this._frameUpdateList = this.decorators.filter(d => !!d.frameUpdate);
    }

    dispose() {
        super.dispose();
        if (this.decorators) {
            this.decorators.forEach(d => {
                d.dispose();
            });
        }
    }

    private _shouldUpdate(calc: BotCalculationContext, bot: Bot): boolean {
        return bot.id === this.bot.id;
    }
}
