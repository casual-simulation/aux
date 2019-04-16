import { AuxFile3DDecorator } from "../AuxFile3DDecorator";
import { AuxFile3D } from "../AuxFile3D";
import { calculateNumericalTagValue, FileCalculationContext, File, calculateGridScale, file, objectsAtContextGridPosition, getFilePosition, getFileIndex, getContextDefaultHeight, getBuilderContextGrid, getFileRotation, getContextScale, isUserFile, getContextGridHeight, DEFAULT_WORKSPACE_GRID_SCALE } from "@casual-simulation/aux-common";
import { Vector3, Quaternion, Euler, Vector2 } from "three";
import { calculateGridTileLocalCenter } from "../grid/Grid";
import { sumBy } from "lodash";
import { ContextGroup3D } from "../ContextGroup3D";
import { realPosToGridPos, Axial, posToKey } from "../hex";
import { BuilderGroup3D } from "../BuilderGroup3D";
import { calculateScale } from "../SceneUtils";

/**
 * Defines an interface that contains possible options for ContextPositionDecorator objects.
 */
export interface ContextPositionDecoratorOptions {
    /**
     * Whether to linear interpolate between positions.
     */
    lerp?: boolean;
}

/**
 * Defines a AuxFile3D decorator that moves the file to its position inside a context.
 */
export class ContextPositionDecorator extends AuxFile3DDecorator {
    
    private _lerp: boolean;
    private _nextPos: Vector3;
    private _nextRot: { x: number, y: number, z: number };

    constructor(file3D: AuxFile3D, options: ContextPositionDecoratorOptions = {}) {
        super(file3D);
        this._lerp = !!options.lerp;
    }

    fileUpdated(calc: FileCalculationContext): void {
        const userContext = this.file3D.context;
        if (userContext) {
            const scale = calculateGridScale(calc, this.file3D.contextGroup.file, this.file3D.domain);
            this._nextPos = calculateObjectPositionInGrid(calc, this.file3D, scale);
            this._nextRot = getFileRotation(calc, this.file3D.file, this.file3D.context);
            
            if (!this._lerp) {
                this.file3D.display.position.copy(this._nextPos);
                this.file3D.display.rotation.set(this._nextRot.x, this._nextRot.z, this._nextRot.y);
            }
            
            // We must call this function so that child objects get their positions updated too.
            // Three render function does this automatically but there are functions in here that depend
            // on accurate positioning of child objects.
            this.file3D.updateMatrixWorld(true);
        }
    }

    frameUpdate(calc: FileCalculationContext): void {
        if (this._lerp && this._nextPos && this._nextRot) {
            this.file3D.display.position.lerp(this._nextPos, 0.1);
            const euler = new Euler(this._nextRot.x, this._nextRot.z, this._nextRot.y, 'XYZ');
            const q = new Quaternion().setFromEuler(euler);
            this.file3D.display.quaternion.slerp(q, 0.1);
        }
    }

    dispose(): void {
    }
}

/**
 * 
 * @param context The file calculation context to use to calculate forumula values.
 * @param file The file to calculate position for.
 * @param gridScale The scale of the grid.
 * @param contextId The id of the context we want to get positional data for the given file.
 */
export function calculateObjectPositionInGrid(context: FileCalculationContext, file: AuxFile3D, gridScale: number): Vector3 {
    const position = getFilePosition(context, file.file, file.context);
    const objectsAtPosition = objectsAtContextGridPosition(context, file.context, position);
    
    let localPosition = calculateGridTileLocalCenter(
        position.x,
        position.y,
        position.z,
        gridScale);
        
    // Offset local position using index of file.
    const index = getFileIndex(context, file.file, file.context);
    const objectsBelowThis = objectsAtPosition.slice(0, index);
    const totalScales = sumBy(objectsBelowThis, obj => calculateVerticalHeight(context, obj, file.context, gridScale));
    const indexOffset = new Vector3(0, totalScales, 0);
    localPosition.add(indexOffset);

    if (file.contextGroup instanceof BuilderGroup3D) {
        if (!isUserFile(file.file)) {
            // Offset local position with hex grid height.
            let hexScale = getContextScale(context, file.contextGroup.file, file.contextGroup.domain);
            let axial = realPosToGridPos(new Vector2(localPosition.x, localPosition.z), hexScale);
            let key = posToKey(axial);
            let height = getContextGridHeight(context, file.contextGroup.file, file.contextGroup.domain, key);
            localPosition.add(new Vector3(0, height, 0));
        }
    }
    
    return localPosition;
}

/**
 * Calculates the total vertical height of the given file.
 * @param calc The calculation context to use.
 * @param file The file to use.
 * @param context The context that the file's height should be evalulated in.
 * @param gridScale The scale of the grid.
 */
export function calculateVerticalHeight(calc: FileCalculationContext, file: File, context: string, gridScale: number) {
    const height = calculateScale(calc, file, gridScale).y;
    const offset = getFilePosition(calc, file, context);

    return height + offset.z;
}