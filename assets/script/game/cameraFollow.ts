
import { _decorator, Component, Node, Vec3, Quat, Mat4 } from 'cc';
import { clientEvent } from '../framework/clientEvent';
import { GameManager } from './gameManager';
import { gameConstants } from './utils/gameConstants';
const { ccclass, property } = _decorator;

const v3_pos = new Vec3();
const v3_selfPos = new Vec3();
const v3_look = new Vec3();
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    private ndTarget: Node = null!; //当前的跟随的目标节点
    private cameraType: number = 0; //摄像机类型 ——gameConstants.CAMERA_TYPE_LIST
    private offsetPos: Vec3 = new Vec3(); //当前偏移坐标
    private offsetLookAtPos: Vec3 = new Vec3(); //当前偏移角度坐标

    onLoad() {
        clientEvent.on(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, this._changeCameraType, this);
    }

    /**
     * 改变摄像机的相关数据
     * @param type gameConstants.CAMERA_TYPE_LIST
     */
    private _changeCameraType(type: number) {
        this.cameraType = type;

        switch (type) {
            case gameConstants.CAMERA_TYPE_LIST.READY:
                this.ndTarget = GameManager.scriptPlayer.node;
                this.offsetPos = gameConstants.CAMERA_READY_DATA.offsetPosInit;
                this.offsetLookAtPos = gameConstants.CAMERA_READY_DATA.offsetLookAtPos;

                //准备状态不需要持续修改坐标，因此仅修改一次
                this.followTarget(1, 1);
                break;
            case gameConstants.CAMERA_TYPE_LIST.READY_TO_PLAYING:
                this.ndTarget = GameManager.scriptPlayer.node;
                this.offsetPos = gameConstants.CAMERA_PLAYING_DATA.offsetPosInit;
                this.offsetLookAtPos = gameConstants.CAMERA_PLAYING_DATA.offsetLookAtPos;
                break;
            case gameConstants.CAMERA_TYPE_LIST.ENDROAD:
                this.ndTarget = GameManager.ndRoadEnd;
                this.offsetPos = gameConstants.CAMERA_ENDROAD_DATA.offsetPosInit;
                this.offsetLookAtPos = gameConstants.CAMERA_ENDROAD_DATA.offsetLookAtPos;
                break;
            case gameConstants.CAMERA_TYPE_LIST.REWARD:
                this.ndTarget = GameManager.ndEndReward;
                this.offsetPos = gameConstants.CAMERA_REWARDROAD_DATA.offsetPosInit;
                this.offsetLookAtPos = gameConstants.CAMERA_REWARDROAD_DATA.offsetLookAtPos;
                break;
            case gameConstants.CAMERA_TYPE_LIST.PLAYING:
            case gameConstants.CAMERA_TYPE_LIST.SWOOP:
                break;
            default:
                console.error('cameraFollow _changeCameraType error type:', type);
                break;
        }
    }

    lateUpdate(dt: number) {
        if (!this.ndTarget) return; //不存在跟随节点
        if (this.cameraType === gameConstants.CAMERA_TYPE_LIST.READY ||
            this.cameraType === gameConstants.CAMERA_TYPE_LIST.SWOOP) return; //准备状态不需要持续修改坐标

        let lerpPosNum: number = 1;
        let lerpEulNum: number = 1;
        let isAddBrickNum = false;

        if (this.cameraType === gameConstants.CAMERA_TYPE_LIST.READY_TO_PLAYING) {
            //点击开始游戏后 视角缓慢移动过程
            lerpPosNum = 0.02;
            lerpEulNum = 0.02;
            isAddBrickNum = true;
        } else if (this.cameraType === gameConstants.CAMERA_TYPE_LIST.PLAYING) {
            if (GameManager.scriptPlayer.roleState === gameConstants.ROLE_STATE_LIST.CLIMB) {
                //攀爬动作特殊 特殊处理
                lerpPosNum = 0.02;
                lerpEulNum = 0.02;
            } else {
                lerpPosNum = 0.2;
                lerpEulNum = 0.2;
                isAddBrickNum = true;
            }
        } else if (this.cameraType === gameConstants.CAMERA_TYPE_LIST.ENDROAD) {
            //到达终点地面后 视角缓慢移动过程
            lerpPosNum = 0.05;
            lerpEulNum = 0.05;
        } else if (this.cameraType === gameConstants.CAMERA_TYPE_LIST.REWARD) {
            //到达终点地面后 视角缓慢移动过程
            lerpPosNum = 0.2;
            lerpEulNum = 0.2;
        }

        this.followTarget(lerpPosNum, lerpEulNum, isAddBrickNum);
    }

    /**
     * 移动摄像机位置/角度
     * @param lerpPosNum 坐标修改的lerp参数
     * @param lerpEulNum 角度修改的lerp参数
     * @param isAddBrickNum 是否正在游戏————摄像机偏移量添加砖块个数*每个砖块的偏移量
     */
    private followTarget(lerpPosNum: number, lerpEulNum: number, isAddBrickNum?: boolean) {
        const targetPos = this.ndTarget.getPosition();
        const eulerY = this.ndTarget.eulerAngles.y;

        const _quat = Quat.fromEuler(new Quat(), 0, eulerY, 0);
        const _mat4 = Mat4.fromRT(new Mat4(), _quat, targetPos);

        if (isAddBrickNum) {
            //游戏过程中，砖块递增，摄像机位置需要往后移动
            const brickNum = GameManager.scriptPlayer.brickNum > gameConstants.CAMERA_MAX_BRICKNUM ?
                gameConstants.CAMERA_MAX_BRICKNUM : GameManager.scriptPlayer.brickNum;
            const brickOffset = gameConstants.CAMERA_ADDBRICK_OFFSET.clone().multiplyScalar(brickNum);
            v3_pos.set(this.offsetPos.clone().add(brickOffset));
        } else {
            v3_pos.set(this.offsetPos);
        }
        v3_pos.transformMat4(_mat4);
        v3_selfPos.lerp(v3_pos, lerpPosNum);
        this.node.position = v3_selfPos;

        v3_pos.set(targetPos.add(this.offsetLookAtPos));
        v3_look.lerp(v3_pos, lerpEulNum);
        this.node.lookAt(v3_look);
    }
}