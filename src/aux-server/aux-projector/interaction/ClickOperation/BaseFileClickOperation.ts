import { Input, InputType, MouseButtonId } from '../../game-engine/Input';
import { File3D } from '../../game-engine/File3D';
import { Vector2, Vector3, Intersection } from 'three';
import { IOperation } from '../IOperation';
import GameView from '../../GameView/GameView';
import { InteractionManager } from '../InteractionManager';
import { UserMode, File } from '@yeti-cgi/aux-common';
import { BaseFileDragOperation } from '../DragOperation/BaseFileDragOperation';

/**
 * File Click Operation handles clicking of files for mouse and touch input with the primary (left/first finger) interaction button.
 */
export abstract class BaseFileClickOperation implements IOperation {

    public static readonly DragThreshold: number = 0.03;

    protected _gameView: GameView;
    protected _interaction: InteractionManager;
    protected _mode: UserMode;
    protected _file: File;
    protected _finished: boolean;
    protected _triedDragging: boolean;

    protected _startScreenPos: Vector2;
    protected _dragOperation: BaseFileDragOperation;

    constructor(mode: UserMode, gameView: GameView, interaction: InteractionManager, file: File) {
        this._gameView = gameView;
        this._interaction = interaction;
        this._file = file;
        this._mode = mode;
        
        // Store the screen position of the input when the click occured.
        this._startScreenPos = this._gameView.input.getMouseScreenPos();
    }

    public update(): void {
        if (this._finished) return;

        // Update drag operation if one is active.
        if (this._dragOperation) {
            if (this._dragOperation.isFinished()) {
                this._dragOperation.dispose();
                this._dragOperation = null;
            } else {
                this._dragOperation.update();
            }
        }

        // If using touch, need to make sure we are only ever using one finger at a time. 
        // If a second finger is detected then we cancel this click operation.
        if (this._gameView.input.currentInputType === InputType.Touch) {
            if (this._gameView.input.getTouchCount() >= 2) {
                this._finished = true;
                return;
            }
        }

        if (this._gameView.input.getMouseButtonHeld(0)) {
            
            if (!this._dragOperation) {
                
                const curScreenPos = this._gameView.input.getMouseScreenPos();
                const distance = curScreenPos.distanceTo(this._startScreenPos);

                if (distance >= BaseFileClickOperation.DragThreshold) {
                    // Attempt to start dragging now that we've crossed the threshold.
                    this._triedDragging = true;

                    if (this._interaction.isInCorrectMode(this._file) && this._canDragFile(this._file)) {
                        this._dragOperation = this._createDragOperation();
                    }
                }

            }
        } else {

            if (!this._dragOperation && !this._triedDragging) {
                this._performClick();
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

    protected abstract _performClick(): void;

    protected _createDragOperation(): BaseFileDragOperation {
        throw new Error('Not implemented.');
    }

    protected _canDragFile(file: File) {
        if (file.type === 'workspace') {
            // Workspaces are always movable.
            return true;
        } else {
            const hasTag = typeof file.tags._movable !== 'undefined';
            if (hasTag) {
                // Movability is determined by the result of the calculation
                const movable = this._gameView.fileManager.calculateFileValue(file, '_movable');
                return !!movable;
            } else {
                // File is movable because that is the default
                return true;
            }
        }
    }
}