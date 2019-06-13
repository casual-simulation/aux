import { InputType } from '../../../shared/scene/Input';
import { Vector2, Vector3, Quaternion } from 'three';
import { IOperation } from '../IOperation';
import { BaseInteractionManager } from '../BaseInteractionManager';
import {
    File,
    FileCalculationContext,
    isFileMovable,
} from '@casual-simulation/aux-common';
import { BaseFileDragOperation } from '../DragOperation/BaseFileDragOperation';
import { AuxFile3D } from '../../../shared/scene/AuxFile3D';
import { ContextGroup3D } from '../../../shared/scene/ContextGroup3D';
import { Simulation3D } from '../../scene/Simulation3D';
import { VRController3D, Pose } from '../../../shared/scene/vr/VRController3D';

/**
 * File Click Operation handles clicking of files for mouse and touch input with the primary (left/first finger) interaction button.
 */
export abstract class BaseFileClickOperation implements IOperation {
    public static readonly DragThreshold: number = 0.03;
    public static readonly VRDragAngleThreshold: number = 0.06;
    public static readonly VRDragPosThreshold: number = 0.03;

    protected _simulation3D: Simulation3D;
    protected _interaction: BaseInteractionManager;
    protected _file: File;
    protected _file3D: AuxFile3D | ContextGroup3D | null;
    protected _finished: boolean;
    protected _triedDragging: boolean;
    protected _vrController: VRController3D;

    protected _startScreenPos: Vector2;
    protected _startVRControllerPose: Pose;
    protected _dragOperation: BaseFileDragOperation;

    protected heldTime: number;
    protected isMobile: boolean;

    protected get game() {
        return this._simulation3D.game;
    }

    get simulation() {
        return this._simulation3D.simulation;
    }

    constructor(
        simulation3D: Simulation3D,
        interaction: BaseInteractionManager,
        file: File,
        file3D: AuxFile3D | ContextGroup3D | null,
        vrController: VRController3D | null
    ) {
        this._simulation3D = simulation3D;
        this._interaction = interaction;
        this._file = file;
        this._file3D = file3D;
        this._vrController = vrController;

        if (this._vrController) {
            // Store the pose of the vr controller when the click occured.
            this._startVRControllerPose = this._vrController.worldPose.clone();
            console.log(
                '[BaseFileClickOperation] start vr controller pose:',
                this._startVRControllerPose
            );
        } else {
            // Store the screen position of the input when the click occured.
            this._startScreenPos = this.game.getInput().getMouseScreenPos();
        }

        this.isMobile =
            !vrController && this.game.getInput().getTouchCount() > 0;
        this.heldTime = 0;
    }

    public update(calc: FileCalculationContext): void {
        if (this._finished) return;

        // Update drag operation if one is active.
        if (this._dragOperation) {
            if (this._dragOperation.isFinished()) {
                this._dragOperation.dispose();
                this._dragOperation = null;
            } else {
                this._dragOperation.update(calc);
            }
        }

        if (!this._vrController) {
            // If using touch, need to make sure we are only ever using one finger at a time.
            // If a second finger is detected then we cancel this click operation.
            if (this.game.getInput().currentInputType === InputType.Touch) {
                if (this.game.getInput().getTouchCount() >= 2) {
                    this._finished = true;
                    return;
                }
            }
        }

        const buttonHeld: boolean = this._vrController
            ? this._vrController.getPrimaryButtonHeld()
            : this.game.getInput().getMouseButtonHeld(0);

        if (buttonHeld) {
            this.heldTime++;
            if (!this._dragOperation) {
                if (this._vrController) {
                }

                let dragThresholdPassed: boolean;

                if (this._vrController) {
                    const curPose = this._vrController.worldPose.clone();
                    const angle = curPose.quaternion.angleTo(
                        this._startVRControllerPose.quaternion
                    );
                    const distance = curPose.position.distanceTo(
                        this._startVRControllerPose.position
                    );
                    // Use both orientation and/or position of vr controller pose to decide when to start dragging.
                    const anglePassed =
                        angle >= BaseFileClickOperation.VRDragAngleThreshold;
                    const distPassed =
                        distance >= BaseFileClickOperation.VRDragPosThreshold;
                    dragThresholdPassed = anglePassed || distPassed;
                } else {
                    const curScreenPos = this.game
                        .getInput()
                        .getMouseScreenPos();
                    const distance = curScreenPos.distanceTo(
                        this._startScreenPos
                    );
                    dragThresholdPassed =
                        distance >= BaseFileClickOperation.DragThreshold;
                }

                if (dragThresholdPassed) {
                    // Attempt to start dragging now that we've crossed the threshold.
                    this._triedDragging = true;

                    // Returns true (can drag) if either aux.movable or aux.pickupable are true
                    if (this._canDragFile(calc, this._file)) {
                        this._dragOperation = this._createDragOperation(calc);
                    } else {
                        // Finish the click operation because we tried dragging but could not
                        // actually drag anything.
                        this._finished = true;
                    }
                }
            }
        } else {
            if (!this._dragOperation && !this._triedDragging) {
                // If not mobile, allow click no matter how long you've held on file, if mobile stop click if held too long
                if (!this.isMobile || this.heldTime < 30) {
                    this._performClick(calc);
                }
            }

            // Button has been released. This click operation is finished.
            this._finished = true;
        }
    }

    public isFinished(): boolean {
        return this._finished;
    }

    public dispose(): void {
        // Make sure to dispose of drag rules if they exist.
        if (this._dragOperation) {
            this._dragOperation.dispose();
            this._dragOperation = null;
        }
    }

    protected _canDragFile(calc: FileCalculationContext, file: File): boolean {
        return isFileMovable(calc, file);
    }

    protected abstract _performClick(calc: FileCalculationContext): void;
    protected abstract _createDragOperation(
        calc: FileCalculationContext
    ): BaseFileDragOperation;
}
