import {
    Vector3,
    Group,
    Mesh,
    Math as ThreeMath
} from "three";
import { Text3D } from "../Text3D";
import { FileCalculationContext, AuxObject } from '@yeti-cgi/aux-common'
import { setLayer, disposeMesh, createUserCone } from "../SceneUtils";
import { LayersHelper } from "../LayersHelper";
import { AuxFile3DDecorator } from "../AuxFile3DDecorator";
import { AuxFile3D } from "../AuxFile3D";


/**
 * The amount of time that a user needs to be inactive for
 * in order to hide their file.
 */
export const DEFAULT_USER_INACTIVE_TIME = 1000 * 60;

/**
 * Defines a class that represents a mesh for an "user" file.
 */
export class UserMeshDecorator extends AuxFile3DDecorator {

    /**
     * The aux file 3d that this decorator is for.
     */
    file3D: AuxFile3D;

    /**
     * The mesh that acts as the visual representation of the user.
     */
    userMesh: Mesh;

    /**
     * The container for the meshes.
     */
    container: Group;

    /**
     * The label for the user.
     */
    label: Text3D;


    constructor(file3D: AuxFile3D) {
        super(file3D);

        // Container
        this.container = new Group();
        this.file3D.display.add(this.container);

        // Label
        this.label = new Text3D();
        this.label.setText(this.file3D.file.tags._user);
        setLayer(this.label, LayersHelper.Layer_UIWorld);
        this.label.setScale(Text3D.defaultScale * 2);
        this.label.setWorldPosition(new Vector3(0,0,0));
        this.label.setRotation(0, 180, 0);
        this.container.add(this.label);
        this.label.position.add(new Vector3(1.55, 0.7, 0)); // This is hardcoded. To lazy to figure out that math.

        // User Mesh
        this.userMesh = createUserCone();
        this.container.add(this.userMesh);
        this.userMesh.rotation.x = ThreeMath.degToRad(90.0);
        this.userMesh.rotation.y = ThreeMath.degToRad(45.0);
    }

    fileUpdated(calc: FileCalculationContext): void {
        this.file3D.display.updateMatrixWorld(false);
    }

    frameUpdate(calc: FileCalculationContext) {
        let file = <AuxObject>this.file3D.file;

        // visible if not destroyed, and was active in the last minute
        this.container.visible = (!file.tags._destroyed && this._isActive());
    }

    dispose() {
        this.file3D.display.remove(this.container);

        this.userMesh.geometry.dispose();
        disposeMesh(this.userMesh);

        this.userMesh = null;
        this.container = null;
    }

    private _isActive(): boolean {
        const lastActiveTime = this.file3D.file.tags[`${this.file3D.context}._lastActiveTime`];
        if (lastActiveTime) {
            const milisecondsFromNow = Date.now() - lastActiveTime;
            return milisecondsFromNow < DEFAULT_USER_INACTIVE_TIME;
        } else {
            return false;
        }
    }
}