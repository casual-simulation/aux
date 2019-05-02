import { ContextGroup3D } from './ContextGroup3D';
import { WorkspaceMesh } from './WorkspaceMesh';
import { GridChecker } from './grid/GridChecker';
import { AuxFile3DDecoratorFactory } from './decorators/AuxFile3DDecoratorFactory';
import {
    AuxFile,
    getContextPosition,
    TagUpdatedEvent,
    FileCalculationContext,
    isContext,
} from '@casual-simulation/aux-common';
import { Object3D } from 'three';
import { Simulation3D } from './Simulation3D';

/**
 * Defines a class that represents a builder group.
 * That is, a context group that is specific to the AUX Builder.
 */
export class BuilderGroup3D extends ContextGroup3D {
    /**
     * The workspace that this context contains.
     */
    surface: WorkspaceMesh;

    private _checker: GridChecker;

    /**
     * Sets the grid checker that should be used by this group's workspace.
     * @param gridChecker The grid checker to use.
     */
    setGridChecker(gridChecker: GridChecker) {
        this._checker = gridChecker;
    }

    get groupColliders() {
        return this.surface.colliders;
    }

    set groupColliders(value: Object3D[]) {}

    /**
     * Creates a new BuilderGroup3D. That is, a group of contexts that are visualized
     * using a worksurface.
     * @param simulation The simulation that this group is in.
     * @param file The file that this group represents.
     * @param decoratorFactory The decorator factory that should be used to decorate AuxFile3D objects.
     */
    constructor(
        simulation: Simulation3D,
        file: AuxFile,
        decoratorFactory: AuxFile3DDecoratorFactory
    ) {
        super(simulation, file, 'builder', decoratorFactory);
    }

    protected async _updateThis(
        file: AuxFile,
        updates: TagUpdatedEvent[],
        calc: FileCalculationContext
    ) {
        await this._updateWorkspace(file, updates, calc);
    }

    /**
     * Updates this builder's workspace.
     * @param file
     * @param updates
     * @param calc
     */
    private async _updateWorkspace(
        file: AuxFile,
        updates: TagUpdatedEvent[],
        calc: FileCalculationContext
    ) {
        if (isContext(calc, file)) {
            if (!this.surface) {
                this.surface = new WorkspaceMesh(this.domain);
                this.surface.gridGhecker = this._checker;
                this.add(this.surface);
            }
            const position = getContextPosition(calc, this.file);

            this.position.x = position.x;
            this.position.y = position.z;
            this.position.z = position.y;

            this.updateMatrixWorld(true);
            await this.surface.update(calc, file);
            this.display.visible = this.surface.container.visible;
        }
    }
}
