import { Vector3, MeshBasicMaterial, SphereBufferGeometry, Mesh, Object3D, Scene, Matrix4, Box2, Vector2, Box3 } from "three";
import { Text3D } from "./Text3D";
import robotoFont from '../public/bmfonts/Roboto.json';
import robotoTexturePath from '../public/bmfonts/Roboto.png';
import GameView from "../GameView/GameView";

export function createSphere(position: Vector3, color: number, size: number = 0.1) {
    const sphereMaterial = new MeshBasicMaterial({
        color
    });
    const sphereGeometry = new SphereBufferGeometry(size);
    const sphere = new Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(position);
    return sphere;
}

export function createLabel(gameView: GameView, parent: Object3D): Text3D {
    const label = new Text3D(gameView, parent, robotoFont, robotoTexturePath);
    return label;
}

/**
 * Set the parent of the object3d.
 * @param object3d the object to re-parent.
 * @param parent the object to parent to.
 * @param scene the scene that these objects exist in.
 */
export function setParent(object3d: Object3D, parent: Object3D, scene: Scene) {

    if (!object3d) return;
    if (!scene) throw new Error("utils.setParent needs a valid scene parameter.");

    // Detach
    if (object3d.parent && object3d.parent !== scene) {
        object3d.applyMatrix(object3d.parent.matrixWorld);
        object3d.parent.remove(object3d);
        scene.add(object3d);
    }
    
    // Attach
    if (parent) {
        object3d.applyMatrix(new Matrix4().getInverse(parent.matrixWorld));
        scene.remove(object3d);
        parent.add(object3d);
    }

    object3d.updateMatrixWorld(true);
}

/**
 * Convert the Box3 object to a box2 object. Basically discards the z components of the Box3's min and max.
 * @param box3 The Box3 to convert to a Box2.
 */
export function convertToBox2(box3: Box3): Box2 {
    return new Box2(
        new Vector2(box3.min.x, box3.min.y),
        new Vector2(box3.max.x, box3.max.y)
    );
}