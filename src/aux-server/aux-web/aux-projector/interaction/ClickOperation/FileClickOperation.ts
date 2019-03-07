
import { FileDragOperation } from '../DragOperation/FileDragOperation';
import { Vector2, Vector3, Intersection } from 'three';
import GameView from '../../GameView/GameView';
import { InteractionManager } from '../InteractionManager';
import {
    UserMode,
    File,
    duplicateFile,
    AuxFile
} from '@yeti-cgi/aux-common';
import { Physics } from '../../../shared/scene/Physics';
import { WorkspaceMesh } from '../../../shared/scene/WorkspaceMesh';
import { appManager } from '../../../shared/AppManager';
import { BaseFileClickOperation } from './BaseFileClickOperation';
import { BaseFileDragOperation } from '../DragOperation/BaseFileDragOperation';
import { AuxFile3D } from 'aux-web/shared/scene/AuxFile3D';
import { ContextGroup3D } from 'aux-web/shared/scene/ContextGroup3D';

/**
 * File Click Operation handles clicking of files for mouse and touch input with the primary (left/first finger) interaction button.
 */
export class FileClickOperation extends BaseFileClickOperation {

    private _file3D: AuxFile3D | ContextGroup3D;
    private _hit: Intersection;

    constructor(mode: UserMode, gameView: GameView, interaction: InteractionManager, file: AuxFile3D | ContextGroup3D, hit: Intersection) {
        super(mode, gameView, interaction, file.file);
        this._file3D = file;
        this._hit = hit;
    }

    protected _createDragOperation(): BaseFileDragOperation {
        const workspace = this._file.tags['builder.context'] ? this._file3D : null;
        if (!this._file.tags['builder.context']) {
            const fileWorkspace = this._file.tags._workspace ? this._interaction.findWorkspaceForMesh(this._file3D) : null;
            if (fileWorkspace && this._file.tags._position) {
                const gridPosition = new Vector2(this._file.tags._position.x, this._file.tags._position.y);
                const objects = this._interaction.objectsAtGridPosition(fileWorkspace, gridPosition);
                const file = this._file;
                const draggedObjects = objects.filter(o => o.tags._index >= file.tags._index);
                return new FileDragOperation(this._gameView, this._interaction, this._hit, draggedObjects, <ContextGroup3D>workspace);
            }
        }
        return new FileDragOperation(this._gameView, this._interaction, this._hit, [this._file3D.file], <ContextGroup3D>workspace);
    }

    protected _performClick(): void {
        // If we let go of the mouse button without starting a drag operation, this constitues a 'click'.
        if (!this._file.tags['builder.context']) {

            if (this._interaction.isInCorrectMode(this._file)) {
                // Select the file we are operating on.
                this._interaction.selectFile(<AuxFile3D>this._file3D);
            }

            // If we're clicking on a workspace show the context menu for it.
        } else if(this._file.tags['builder.context']) {

            if (!this._interaction.isInCorrectMode(this._file) && this._gameView.selectedRecentFile) {
                // Create file at clicked workspace position.
                let workspaceMesh = (<ContextGroup3D>this._file3D).surface;
                let closest = workspaceMesh.closestTileToPoint(this._hit.point);

                if (closest) {
                    let newFile = duplicateFile(this._gameView.selectedRecentFile, {
                        tags: {
                            _position: { x: closest.tile.gridPosition.x, y: closest.tile.gridPosition.y, z: closest.tile.localPosition.y },
                            _workspace: this._file.id,
                            _index: 0
                        }
                    });

                    appManager.fileManager.createFile(newFile.id, newFile.tags);
                }
            } else {
                this._interaction.showContextMenu();
            }
        }
    }
}