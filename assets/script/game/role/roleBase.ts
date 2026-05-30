import { _decorator, Component, Node, SkeletalAnimation, director, Prefab, instantiate, macro, Animation, Vec3, v3, AnimationClip, tween, geometry, PhysicsSystem, RigidBody, BoxCollider, ITriggerEvent, MeshRenderer } from 'cc';
import { GameManager } from '../gameManager';
import { gameUtils } from '../utils/gameUtils';
import { resourceUtil } from '../../framework/resourceUtil'
import { poolManager } from '../../framework/poolManager';
import { gameConstants } from '../utils/gameConstants';
import { uiManager } from '../../framework/uiManager';
import { clientEvent } from '../../framework/clientEvent';
import { EffectManager } from '../../framework/effectManager';
import { playerData } from '../../framework/playerData';
import { AudioManager } from '../../framework/audioManager';
import { PlayerMusic } from './playerMusic';
const { ccclass, property } = _decorator;

const v3_brickShakePos = new Vec3();
const v3_brickOnGroundPos = new Vec3();

@ccclass('RoleBase')
export class RoleBase extends Component {
    protected _lastBrickPos: Vec3 = null!; //上一个铺设在地上的砖块位置——为了砖块间的无缝衔接
    protected _aniRole: SkeletalAnimation = null!; //角色动画组件
    protected _ndRole: Node = null! //角色模型父节点
    protected _ndBrickParent: Node = null!; //当前角色身上的砖块父节点
    protected _onFloorList: Array<Node> = []; //当前脚下地板列表
    protected _roleState: number = null!; //角色状态
    protected _nowSpeedY: number = 5; //跳跃
    protected _speed: number = 0; //移动速度
    protected _isOver: boolean = false; //自身是否结束游戏
    protected _roleId: number = 1; //角色id 0代表主角 其余代表ai
    protected _isMandatoryChange: boolean = false; //强制修改状态开关
    protected _isBrickShake: boolean = false; //砖块是否在晃动
    protected _brickMoveTime: number = 0; //<0 代表砖块晃动到左侧 >0 代表右侧
    protected _brickMoveToLeft: boolean = true; //true代表砖块像左晃动 false向右晃动
    protected _isInBrick: boolean = false; //当前是否在砖块上——加速判断
    protected _isRunFastCheck: boolean = null!; //当前是否达到在砖块上的最大速度（用于销毁身上的加速特效）
    protected _skinId: number = -1; //皮肤id
    protected _isShowFallWater: boolean = false; //是否显示当前落水动画

    public brickId: number = -1 //当前手持砖块id
    public rankNum: number = 0; //当前排名
    public brickNum: number = 0; //当前角色身上的砖块数量

    public set roleState(state: number) {
        if (!this._aniRole) return;
        if (this._isMandatoryChange) {
            this._isMandatoryChange = false;
        } else {//不为强制该状态时 判断当前状态是否有效
            if (state === this._roleState) return; //与当前状态相同，不进行后续判断
            if (this._roleState === gameConstants.ROLE_STATE_LIST.FALL ||
                this._roleState === gameConstants.ROLE_STATE_LIST.WIN ||
                this._roleState === gameConstants.ROLE_STATE_LIST.BUMP ||
                this._roleState === gameConstants.ROLE_STATE_LIST.CLIMB) return; //当前动作不可打断
            if (this._roleState === gameConstants.ROLE_STATE_LIST.JUMP && this._nowSpeedY > 0
                && state !== gameConstants.ROLE_STATE_LIST.SWOOP) return; //跳跃向上过程中 除了下落动作均 不可打断
        }

        this._roleState = state;

        this._aniRole.play(gameConstants.ROLE_STATE_NAME.get(this._roleState));

        switch (state) {
            case gameConstants.ROLE_STATE_LIST.FALL:
                if (this._roleId === 0) {
                    AudioManager.instance.playSound(gameConstants.MUSIC_LIST.FALL);
                } else {
                    AudioManager.instance.playSound(gameConstants.MUSIC_LIST.DEAD);
                }
                this._stopRunFastEff();
                break;
            case gameConstants.ROLE_STATE_LIST.PUT_BRICK:
                //铺砖块动作结束切换回奔跑动作
                this._aniRole.once(Animation.EventType.FINISHED, () => {
                    if (this.roleState !== gameConstants.ROLE_STATE_LIST.PUT_BRICK) return;
                    this._checkRunState();
                })
                break;
            case gameConstants.ROLE_STATE_LIST.JUMP:
                if (this._roleId === 0) {
                    AudioManager.instance.playSound(gameConstants.MUSIC_LIST.JUMP);
                }
                this._nowSpeedY = gameConstants.ROLE_SPEED_Y_JUMP_START + 0;
                break;
            case gameConstants.ROLE_STATE_LIST.BUMP:
                AudioManager.instance.playSound(gameConstants.MUSIC_LIST.BUMP);
                this._speed = gameConstants.AI_SPEED_BUMP;
                this._nowSpeedY = gameConstants.AI_SPEED_Y_BUMP_START + 0;

                this._aniRole.once(Animation.EventType.FINISHED, () => {
                    this._isMandatoryChange = true;
                    this.roleState = gameConstants.ROLE_STATE_LIST.FALL;
                })

                this._stopRunFastEff();
                break;
            case gameConstants.ROLE_STATE_LIST.SWOOP:
                this._aniRole.once(Animation.EventType.FINISHED, () => {
                    if (this.roleState !== gameConstants.ROLE_STATE_LIST.SWOOP) return;
                    if (this._roleId !== 0) {
                        this._isMandatoryChange = true;
                        this.roleState = gameConstants.ROLE_STATE_LIST.FALL;
                    }
                })

                this._stopRunFastEff();
            case gameConstants.ROLE_STATE_LIST.WIN:
            case gameConstants.ROLE_STATE_LIST.FAIL:
                this._stopRunFastEff();
                break;
            default:
                // console.error('error roleState:', state, ' in roleBase:', this.node.name);
                break;
        }
    }
    public get roleState() {
        return this._roleState;
    }

    /**
     * 更换角色皮肤
     */
    private changeSkin() {
        let nextSkinId;
        let randomSkinIndex;
        if (this._roleId === 0) {
            nextSkinId = playerData.instance.playerInfo['roleSkinId'];
        } else {
            randomSkinIndex = Math.floor(GameManager.aiSkinList.length * Math.random());
            nextSkinId = GameManager.aiSkinList[randomSkinIndex] + 0;
            GameManager.aiSkinList.splice(randomSkinIndex, 1);
        }
        if (nextSkinId === this._skinId) return;
        this._skinId = nextSkinId;

        if (this._ndRole) {
            this._ndRole.destroy();
        }

        resourceUtil.loadModelRes(gameConstants.SKIN_MODEL_PATH + Math.floor(this._skinId / 10)).then((prefab: any) => {
            resourceUtil.loadMatRes(gameConstants.SKIN_MAT_PATH + this._skinId).then((mat: any) => {
                this._ndRole = instantiate(prefab);
                this._ndRole.parent = this.node;

                if (this._roleId === 0) {
                    this._ndRole.addComponent(PlayerMusic);
                }

                this._ndRole.getComponentInChildren(MeshRenderer)?.setMaterial(mat, 0);

                this._aniRole = this._ndRole.getComponent(SkeletalAnimation)!;
                this._ndBrickParent = this._ndRole.getChildByName('brick Socket')!;

                this._ndBrickParent.destroyAllChildren();
                this._initState();
                this._changeRoleEul(gameConstants.ROLE_FACE_DIRECTION.BACK);
            })
        })
    }

    /**
     * 创建后初始化相关内容
     */
    public createInitCom(selfGroup: number) {
        const rbAi = this.node.addComponent(RigidBody);
        rbAi.type = RigidBody.Type.KINEMATIC;
        rbAi.setGroup(selfGroup);
        rbAi.setMask(gameConstants.COLLIDER_GROUP_LIST.FLOOR);

        const collider = this.node.addComponent(BoxCollider);
        collider.isTrigger = true;
        collider.size = gameConstants.COLLIDER_ROLE_BOX_SIZE;
        collider.center = gameConstants.COLLIDER_ROLE_BOX_CENTER;
        collider.on('onTriggerEnter', this._triggerEnter, this);
        collider.on('onTriggerExit', this._triggerExit, this);
    }

    /**
     * 触发器——开始事件
     * @param event 
     */
    protected _triggerEnter(event: ITriggerEvent) { }

    /**
     * 触发器——结束事件
     * @param event 
     */
    private _triggerExit(event: ITriggerEvent) {
        if (!event.otherCollider) return;
        // console.warn('triggerExit')
        let ndOther = event.otherCollider.node;
        let findIndex = this._onFloorList.indexOf(ndOther);
        if (findIndex !== -1) {
            this._onFloorList.splice(findIndex, 1);
        }
    }

    /**
     * 角色初始化
     */
    public initRole() {
        this.changeSkin();

        if (this._ndBrickParent) {
            this._ndBrickParent.destroyAllChildren();
        }
        this._onFloorList.length = 0;
        this.brickNum = 0;
        this.rankNum = 0;
        this._brickMoveTime = 0;
        this._lastBrickPos = null!;
        this._isShowFallWater = false;

        this._isRunFastCheck = false;
        let ndRunFast = this.node.getChildByName(gameConstants.EFFECT_LIST.RUNFAST)
        if (ndRunFast) {
            EffectManager.instance.putRunFastEff(ndRunFast);
        }

        this.node.setRotationFromEuler(new Vec3(0, 0, 0));
        this._changeRoleEul(gameConstants.ROLE_FACE_DIRECTION.BACK);

        this._initState();
    }

    /**
     * 开始倒计时
     */
    public startCountdown() {
        if (this._onFloorList.length === 0) { //存在初始化后与当前地面未碰撞问题
            this._getNowUnderRoad();
        }
    }

    /**
     * 判断当前脚下是否有路面 有的话添加进数组中
     */
    protected _getNowUnderRoad() {
        if (this._checkUnderRoad()) {
            this._onFloorList.push(PhysicsSystem.instance.raycastResults[0].collider.node);
        }
    }

    /**
     * 开始游戏
     */
    public playerStart() {
        this._isOver = false;
        this._checkRunState();
    }

    /**
    * 飞扑失败
    */
    protected _swoopFail() {
        this.roleState = gameConstants.ROLE_STATE_LIST.FALL;
    }

    /**
     * 初始化角色状态
     */
    protected _initState() {
        this._isMandatoryChange = true;
        this.roleState = gameConstants.ROLE_STATE_LIST.IDLE;
    }

    /**
     * 初始化上次砖块节点
     */
    protected _initLastBrickPos() {
        if (this._lastBrickPos) {
            this._lastBrickPos = null!;
        }
    }

    /**
     * 判断场景内可拾取砖块
     */
    protected _checkCanGetBrick() {
        const pos = this.node.getPosition();
        let index = gameUtils.checkNowBrickIndex(pos.x, pos.z);
        let nowBrickList = GameManager.canGetBrickList[index];
        if (!nowBrickList) return;
        let isAdd = false;
        for (let i = nowBrickList.length - 1; i > -1; i--) {
            let ndNowBrick = nowBrickList[i] as Node;
            if (!ndNowBrick.active) continue; //避免节点隐藏
            //当前砖块与角色之间的距离 < 可获取砖块的距离
            let nowBrickPos = ndNowBrick.position;
            if (gameUtils.getTwoPosXZLength(nowBrickPos.x, nowBrickPos.z, pos.x, pos.z) < gameConstants.BRICK_CAN_GET_RANGE) {
                //拾取砖块
                ndNowBrick.active = false;
                setTimeout(() => {
                    if (!ndNowBrick.isValid) return;
                    ndNowBrick.active = true;
                }, gameConstants.BRICK_PRODUCTION_TIME * 1000);

                isAdd = true;
                this._addRoleBrick(1);
            }
        }

        if (isAdd && this._roleId === 0) {
            this._addBrickTips();
            AudioManager.instance.playSound(
                gameConstants.MUSIC_LIST.GETBEICK +
                gameUtils.getMusicNum(gameConstants.MUSIC_RANDOM.GETBEICK));
        }
    }

    /**
     * 添加砖块提示
     */
    protected _addBrickTips() { }

    /**
     * 角色添加砖块到手上持有
     * @param addNum 
     * @param isNoBrickAni 不需要添加砖块动画
     * @param noAniChange  不需要修改角色状况（复活）
     */
    protected _addRoleBrick(addNum: number, isNoBrickAni?: boolean, noAniChange?: boolean) {
        // return;
        if (this.brickNum === 0 && !noAniChange) {
            if (GameManager.isGameStart) {
                //当前手中未持有砖块，为单纯跑动动作，需切换为手持砖块跑动动作
                this.roleState = gameConstants.ROLE_STATE_LIST.RUN_TAKE_BRICK;
            } else {
                //当前游戏未开始，为主界面按钮添加砖块
                this.roleState = gameConstants.ROLE_STATE_LIST.IDLE_TAKE_BRICK;
            }
        }

        this.brickNum += addNum;

        for (let i = 0; i < addNum; i++) {
            let pos = new Vec3();
            const ndNewBrick = poolManager.instance.getNode(GameManager.pfBrickList[this.brickId], this._ndBrickParent) as Node;
            const brickHandSize = gameConstants.BRICK_ONCE_SIZE_HAND_INIT;
            ndNewBrick.setScale(brickHandSize, brickHandSize, brickHandSize);
            const length = this._ndBrickParent.children.length;
            //新添加的砖块 因为有晃动的状态 坐标需要改变
            const z = this._getNowShakeBrickZ(length - 1, Math.floor(length / 2));
            //在手上生成的砖块需要往上堆叠
            pos.set(gameConstants.BRICK_HAND_OFFSET_X, (length - 1) * gameConstants.BRICK_ONCE_HEIGHT, z + gameConstants.BRICK_HAND_OFFSET_Z);
            ndNewBrick.setPosition(pos);

            const mesh = ndNewBrick.getComponentInChildren(MeshRenderer);
            mesh!.receiveShadow = MeshRenderer.ShadowReceivingMode.ON;
            mesh!.shadowCastingMode = MeshRenderer.ShadowCastingMode.ON;

            if (!isNoBrickAni) {
                //播放添加砖块的动画
                pos.set(1.5, 0.1, 0);
                if (!GameManager.isLowPhone && this._roleId === 0) {
                    EffectManager.instance.playEffect(ndNewBrick, gameConstants.EFFECT_LIST.BRICK, false, true, 0, 1, pos);
                }
            }

            if (i === addNum - 1 && !isNoBrickAni) {
                this._checkNowBrickShakeState();
            }
        }
    }

    /**
     * 角色使用手上持有砖块
     */
    protected _subRoleBrick() {
        // return;
        this.roleState = gameConstants.ROLE_STATE_LIST.PUT_BRICK;
        this.brickNum--;
        if (this.brickNum === 0) {
            //当前手中未持有砖块
            if (this._checkUnderFooting()) {
                this.roleState = gameConstants.ROLE_STATE_LIST.RUN;
            } else {
                this.roleState = gameConstants.ROLE_STATE_LIST.JUMP;
            }
            while (this._ndBrickParent.children.length > 0) {
                poolManager.instance.putNode(this._ndBrickParent.children[0])
            }
        }

        if (this._roleId === 0) {
            AudioManager.instance.playSound(gameConstants.MUSIC_LIST.PUTBRICK);
        }

        let childCount = this._ndBrickParent.children.length;

        poolManager.instance.putNode(this._ndBrickParent.children[childCount - 1]);

        this._checkNowBrickShakeState();

        this._createBrickToGround();
    }

    /**
     * 创建一个砖块在地上
     */
    private _createBrickToGround() {
        const ndNewBrick = poolManager.instance.getNode(GameManager.pfBrickList[this.brickId], GameManager.ndBrickFloor) as Node;
        const scaleFirst = gameConstants.BRICK_ONCE_SIZE_DOWN_MAX;
        ndNewBrick.setScale(new Vec3(scaleFirst, scaleFirst, scaleFirst));

        const mesh = ndNewBrick.getComponentInChildren(MeshRenderer);
        mesh!.receiveShadow = MeshRenderer.ShadowReceivingMode.OFF;
        mesh!.shadowCastingMode = MeshRenderer.ShadowCastingMode.OFF;

        const selfPos = this.node.position;
        if (this._lastBrickPos) {
            //存在上一个砖块坐标时，为了砖块间的无缝衔接。计算当前砖块与角色的角度并铺设砖块
            let range = gameConstants.BRICK_ONCE_CHECK_RANGE;
            const eul = gameUtils.checkTwoPosEulRad(selfPos.x, selfPos.z, this._lastBrickPos.x, this._lastBrickPos.z);
            v3_brickOnGroundPos.set(this._lastBrickPos.x, gameConstants.BRICK_FLOOR_DOWN_Y, this._lastBrickPos.z)
                .add3f(
                    gameUtils.getDirectionOfDistanceX(range, eul),
                    0,
                    gameUtils.getDirectionOfDistanceZ(range, eul));
        } else {
            v3_brickOnGroundPos.set(selfPos.x, gameConstants.BRICK_FLOOR_DOWN_Y, selfPos.z);
        }
        this._lastBrickPos = v3_brickOnGroundPos;
        ndNewBrick.setPosition(v3_brickOnGroundPos);

        //铺设砖块时的动画效果 从大到小
        const scaleNum = gameConstants.BRICK_ONCE_SIZE_DOWN_INIT;
        tween(ndNewBrick)
            .to(0.5, { scale: new Vec3(scaleNum, scaleNum, scaleNum) })
            .start();

        //铺砖特效
        if (!GameManager.isLowPhone && this._roleId === 0) {
            //
            EffectManager.instance.playParticle(gameConstants.EFFECT_LIST.BRICK, v3_brickOnGroundPos, 1, 1);
        }
    }

    /**
     * 角色朝向修改
     * @param type 
     */
    protected _changeRoleEul(type: number) {
        if (!this._aniRole) return;
        //仅改变模型所在节点旋转角度 
        let nowEul = new Vec3();
        if (type === gameConstants.ROLE_FACE_DIRECTION.FRONT) {
            //例：开场 角色面朝摄像机做待机动作
            nowEul = v3(0, 0, 0);
        } else if (type === gameConstants.ROLE_FACE_DIRECTION.BACK) {
            nowEul = v3(0, 180, 0);
        } else if (type === gameConstants.ROLE_FACE_DIRECTION.RIGHT_FRONT) {
            nowEul = v3(0, 45, 0);
        } else if (type === gameConstants.ROLE_FACE_DIRECTION.LEFT_FRONT) {
            nowEul = v3(0, -45, 0);
        } else {
            console.error('error _changeRoleEul type:' + type);
            return;
        }
        this._ndRole.setRotationFromEuler(nowEul);
    }

    /**
     * 判断当前脚下是否存在地板或铺在地上的砖块
     * @returns 
     */
    protected _checkUnderFooting() {
        return this._onFloorList.length > 0 || this._checkInBrick();
    }

    /**
     * 判断脚下是否有砖块
     * @param pos 传入位置判断当前位置是否存在砖块
     * @returns 
     */
    protected _checkInBrick(pos?: Vec3) {
        this._isInBrick = false;
        if (!pos) {
            pos = this.node.position;
        }
        for (let i = 0; i < GameManager.ndBrickFloor.children.length; i++) {
            let nowBrickPos = GameManager.ndBrickFloor.children[i].position;
            //判断脚下一定范围内是否存在铺设在地上的砖块
            if (gameUtils.getTwoPosXZLength(nowBrickPos.x, nowBrickPos.z, pos.x, pos.z) < gameConstants.BRICK_ONCE_CHECK_RANGE) {
                this._isInBrick = true;
                this._lastBrickPos = nowBrickPos;
                break;
            }
        }
        return this._isInBrick;
    }

    /**
     * 判断当前 跑步还是带砖跑
     */
    protected _checkRunState() {
        if (this.brickNum > 0) {
            this.roleState = gameConstants.ROLE_STATE_LIST.RUN_TAKE_BRICK
        } else {
            this.roleState = gameConstants.ROLE_STATE_LIST.RUN;
        }
    }

    /**
     * 碰触到结束地面
     */
    protected _touchFinishLine() {
        if (this.rankNum !== 0 && this._roleId === 0) return;
        this._isOver = true;

        if (!this._roleId) {
            AudioManager.instance.playSound(gameConstants.MUSIC_LIST.WIN);

            clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.ENDROAD);
        }
        GameManager.arriveRoadEndNum++;
        this.rankNum = GameManager.arriveRoadEndNum;

        let nextState = gameConstants.ROLE_STATE_LIST.FAIL; //默认失败动作
        let faceDirection = 0;
        if (this.rankNum === 1) {
            //当前未存在角色到达终点，胜利动作
            nextState = gameConstants.ROLE_STATE_LIST.WIN;
            faceDirection = gameConstants.ROLE_FACE_DIRECTION.FRONT;
        } else if (this.rankNum % 2 === 0) {
            //结束展示位于2/4名时，位于结束地面的左侧，面朝结束地面的中心位置
            faceDirection = gameConstants.ROLE_FACE_DIRECTION.RIGHT_FRONT;
        } else {
            //结束展示位于3/5名时，位于结束地面的右侧，面朝结束地面的中心位置
            faceDirection = gameConstants.ROLE_FACE_DIRECTION.LEFT_FRONT;
        }

        let endPos = GameManager.ndRoadEnd.getPosition().add(gameConstants.ROAD_END_POS_LIST[this.rankNum - 1]);
        this.node.lookAt(endPos);//角色面朝最终位置前进

        tween(this.node)
            .to(1, { position: endPos })
            .call(() => {
                //暂时处理————直接删除手上所有砖块节点
                this._clrerAllGetBrick();

                this._changeRoleEul(faceDirection);

                this.roleState = nextState;

                this._gameIsOver(false);//不是第一名的结束
            })
            .start();
    }

    /**
     * 判断当前砖块数是否触发晃动
     */
    private _checkNowBrickShakeState() {
        const length = this._ndBrickParent.children.length;
        if (length > gameConstants.BRICK_SHAKE_MIN) {
            this._isBrickShake = true;
        } else {
            this._isBrickShake = false;
            if (this._ndBrickParent.children[length - 1] && this._ndBrickParent.children[length - 1].position.z !== 0) {
                //若当前最顶上的砖块存在偏移 需要重置位置
                this._brickShakeInit();
            }
        }
    }

    /**
     * 复原所有砖块的坐标
     */
    private _brickShakeInit() {
        const addY = gameConstants.BRICK_ONCE_HEIGHT;
        v3_brickShakePos.set(gameConstants.BRICK_HAND_OFFSET_X, 0, gameConstants.BRICK_HAND_OFFSET_Z);
        const length = this._ndBrickParent.children.length;
        for (let i = 0; i < length; i++) {
            const ndItem = this._ndBrickParent.children[i];
            v3_brickShakePos.y = i * addY;
            ndItem.setPosition(v3_brickShakePos);
        }
    }

    /**
     * 砖块晃动
     * @param isBanChange 是否为特殊情况（左转右转强制设置砖块反方向）
     */
    protected _allBrickShake(dt: number, isBanChange?: boolean) {
        // return;
        if (this._isBrickShake) {//砖块可晃动情况下
            const shakeTime = gameConstants.BRICK_SHAKE_HALF_TIME;
            const length = this._ndBrickParent.children.length;
            let lengthHalf = Math.floor(length / 2);
            for (let i = 0; i < length; i++) {
                const ndItem = this._ndBrickParent.children[i];
                v3_brickShakePos.set(ndItem.position);
                if (i > lengthHalf) { //一半以上的砖块晃动
                    v3_brickShakePos.z = this._getNowShakeBrickZ(i, lengthHalf)
                    if (!isBanChange && i === length - 1) {
                        if (this._brickMoveToLeft) {
                            this._brickMoveTime -= dt;
                        } else {
                            this._brickMoveTime += dt;
                        }

                        //超过最大最小值 往另一个方向移动
                        if (this._brickMoveTime < - shakeTime) {
                            this._brickMoveTime = -shakeTime;
                            this._brickMoveToLeft = false;
                        } else if (this._brickMoveTime > shakeTime) {
                            this._brickMoveTime = shakeTime;
                            this._brickMoveToLeft = true;
                        }
                    }
                } else {
                    v3_brickShakePos.z = 0;
                }
                ndItem.setPosition(v3_brickShakePos);
            }
        }
    }

    /**
     * 计算出当前砖块在晃动效果下的z值
     * @param i 当前砖块在砖块父节点下的下标
     * @param lengthHalf 当前砖块父节点的子节点个数的一半并向下取整
     * @returns 
     */
    private _getNowShakeBrickZ(i: number, lengthHalf: number) {
        let num;
        if (lengthHalf === 0) {
            num = 0;
        } else {
            num = ((i - lengthHalf) / (lengthHalf * 2));
        }
        return (num * num) * this._brickMoveTime * (lengthHalf * gameConstants.BRICK_SHAKE_GRADIENT);
        // y = a^x 指数函数(缓慢递增的曲线) * 变量
    }

    /**
     * 使用射线检测判断当前脚下是否存在路面
    */
    protected _checkUnderRoad() {
        const pos = this.node.position;
        const outRay = new geometry.Ray(pos.x, 0.1, pos.z, 0, -1, 0);

        let checkUnder = PhysicsSystem.instance.raycast(outRay, gameConstants.COLLIDER_GROUP_LIST.FLOOR, 1);
        if (checkUnder) {
            this._initLastBrickPos();
        }
        return checkUnder;
    }

    /**
     * 停止加速的特效
     */
    protected _stopRunFastEff() {
        if (this._isRunFastCheck) {//与路面接触 删除当前的加速特效
            let ndRunFast = this.node.getChildByName(gameConstants.EFFECT_LIST.RUNFAST)
            if (ndRunFast) {
                this._isRunFastCheck = false;
                EffectManager.instance.putRunFastEff(ndRunFast);
            }
        }
    }

    /**
     * 游戏成功结束
     * @param isWin 
     * @returns 
     */
    protected _gameIsOver(isWin: boolean) {
        if (this._roleId !== 0) return;
        GameManager.isWin = isWin;
        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.GAME_PANEL)
        uiManager.instance.showDialog(gameConstants.PANEL_PATH.GAMEOVER_PANEL);
    }

    /**
     * 清除身上的砖块
     */
    protected _clrerAllGetBrick() {
        while (this._ndBrickParent.children.length > 0) {
            poolManager.instance.putNode(this._ndBrickParent.children[0]);
        }
    }
}