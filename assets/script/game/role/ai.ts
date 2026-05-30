
import { _decorator, Component, Node, Vec2, Vec3, macro, Collider, ITriggerEvent, RigidBody, BoxCollider, TweenSystem } from 'cc';
import { EffectManager } from '../../framework/effectManager';
import { poolManager } from '../../framework/poolManager';
import { GameManager } from '../gameManager';
import { gameConstants } from '../utils/gameConstants';
import { gameUtils } from '../utils/gameUtils';
import { RoleBase } from './roleBase';
const { ccclass, property } = _decorator;

@ccclass('Ai')
export class Ai extends RoleBase {
    private _bezierList: Array<Vec2> = []; //贝塞尔曲线数组
    private _bezierNowId: number = 0; //当前贝塞尔id
    private _bezierlastId: number = 0; //上一个贝塞尔id
    private _nextEul: Vec3 = new Vec3(); // 下一个角度
    private _isBump: boolean = false; //被撞飞

    /**
     * 创建一个ai
     * @param i 
     * @param bezierList 
     */
    public createAi(i: number, bezierList: any) {
        GameManager.scriptAiList.push(this);

        this.createInitCom(gameConstants.COLLIDER_GROUP_LIST.AI);

        this.initAi(i, bezierList);
    }

    /**
     * ai初始化
     * @param roleId 
     */
    public initAi(roleId: number, bezierList: any) {
        TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.node);

        this._roleId = roleId;

        super.initRole();

        this._bezierList.length = 0;
        this._bezierList = bezierList;
        this._bezierNowId = 0;
        this._bezierlastId = 0;
        this._nextEul.set(this.node.eulerAngles);

        this._isBump = false;

        this._speed = gameConstants.AI_SPEED_RUN;

        let pos = gameConstants.AI_INIT_POS_LIST.get(roleId);
        if (!pos) {
            pos = new Vec3(-100, 0, 0)
            console.error('当前ai不存在坐标，请在 gameConstants.AI_INIT_POS_LIST 添加');
        }
        this.node.setPosition(pos);

        this.node.setScale(1, 1, 1);

        this.node.active = true;
    }

    /**
     * 触发器——开始事件
     * @param event 
     */
    protected _triggerEnter(event: ITriggerEvent) {
        if (!event.otherCollider || this._isOver) return;

        this._initLastBrickPos(); //与路面接触 清空存储的上一个铺设在地上的砖块坐标

        let ndOther = event.otherCollider.node;
        if (ndOther.name === gameConstants.CSV_MAP_ITEM_NAME.FINISH_LINE) {
            this._touchFinishLine();
            return;
        }

        //角色与地面接触，加入列表
        this._onFloorList.push(ndOther);
    }

    /**
     * 被主角撞飞
     */
    public bump(eulY: number) {
        this._clrerAllGetBrick();

        this._isOver = true;
        this._isBump = true;

        this._isMandatoryChange = true;
        this.roleState = gameConstants.ROLE_STATE_LIST.BUMP;

        this.node.setRotationFromEuler(0, eulY, 0);
    }

    /**
     * 判断当前ai是否死亡
     * @returns 
     */
    public checkAiDead() {
        return this._isOver;
    }

    /**
     * 判断当前ai是否可撞飞
     * @returns 
     */
    public checkCanBump() {
        return this._isOver || this.roleState === gameConstants.ROLE_STATE_LIST.SWOOP;
    }

    update(dt: number) {
        if (!GameManager.isGameStart) return;

        let pos = this.node.getPosition();

        if (this._isBump) { //被撞飞
            this._nowSpeedY += gameConstants.AI_GRAVITY_BUMP * dt;
            pos.y += this._nowSpeedY * dt;

            const eulY = this.node.eulerAngles.y;
            let speed = dt * this._speed;
            const eulYAngle = eulY * macro.RAD;
            const addX = speed * Math.sin(eulYAngle);
            const addZ = speed * Math.cos(eulYAngle);
            pos = pos.subtract3f(addX, 0, addZ); //角色前进方向为当前朝向的反向
            this.node.setPosition(pos);

            const nextScale = this.node.scale.x - dt * 0.7;
            if (nextScale <= 0) {
                this.node.active = false;
            }
            this.node.setScale(nextScale, nextScale, nextScale)
            return;
        }

        if (this._isOver) return;

        if (this.roleState === gameConstants.ROLE_STATE_LIST.SWOOP ||
            this.roleState === gameConstants.ROLE_STATE_LIST.FALL) {
            pos.subtract3f(0, gameConstants.ROLE_SPEED_Y_SWOOP_DOWN * dt, 0);
            this.node.setPosition(pos);

            if (pos.y <= gameConstants.AI_CHECK_HIDE_Y) {
                this.node.active = false;
                this._isOver = true;
            }

            if (!this._isShowFallWater && pos.y < gameConstants.ROLE_CHECK_FALL_WATER_EFF_Y) {
                this._isShowFallWater = true;
                EffectManager.instance.playFallWater(gameConstants.EFFECT_LIST.FALL_WATER, new Vec3(pos.x, gameConstants.FALL_WATER_EFF_Y, pos.z), this.node.eulerAngles.y + 180);
            }
            return;
        } else if (this.roleState === gameConstants.ROLE_STATE_LIST.JUMP) {
            this._nowSpeedY += gameConstants.ROLE_GRAVITY_JUMP * dt;
            pos.y += this._nowSpeedY * dt;

            if (pos.y <= gameConstants.ROLE_SWOOP_DEATH) {
                //当跳跃过后，掉落到最低高度
                this.roleState = gameConstants.ROLE_STATE_LIST.SWOOP;
            } else if (this._nowSpeedY < 0 && pos.y <= 0) { //下落后到与地板一样的高度时
                if (this._checkUnderRoad() || this._checkInBrick()) { //判断角色到达与地面持平的状态时，是否脚下有道路或砖块
                    this.roleState = gameConstants.ROLE_STATE_LIST.RUN;
                    pos.y = 0;
                } else if (pos.y < gameConstants.ROLE_CHECK_SWOOP_Y) { //到一定高度 触发飞扑
                    this.roleState = gameConstants.ROLE_STATE_LIST.SWOOP;
                    return;
                }
            }
        } else {
            if (pos.y < 0) { //下落之后的y轴坐标重制
                pos.y -= gameConstants.ROLE_GRAVITY_JUMP * dt;
                if (pos.y > 0) {
                    pos.y = 0;
                }
            }

            //在跳跃及飞扑时，不判断是否拾取砖块
            this._checkCanGetBrick();

            if (!this._checkUnderFooting()) {
                if (this.brickNum > 0) {
                    //持有砖块，则铺砖
                    this._subRoleBrick();
                    this._isInBrick = true;
                } else {
                    //未持有砖块，则跳跃,到达地板的高度转为变为飞扑，飞扑动作碰到道路边缘攀爬
                    this.roleState = gameConstants.ROLE_STATE_LIST.JUMP;
                }
            }
        }

        //通过贝塞尔路径点xz轴移动
        this._bezierNowId += dt * this._speed;
        let bezierNowId = Math.floor(this._bezierNowId);

        if (bezierNowId >= this._bezierList.length - 1) {
            this._isOver = true;
            return;
        }

        if (bezierNowId !== this._bezierlastId) {
            this._bezierlastId = bezierNowId;
            const sub = this._bezierList[bezierNowId].clone().subtract(this._bezierList[bezierNowId + 1]);
            this._nextEul.set(0, Math.atan2(sub.x, sub.y) * macro.DEG, 0)
        }

        const subIndex = this._bezierNowId - bezierNowId;
        this.node.setRotationFromEuler(this._nextEul);
        const nextPos = this._bezierList[bezierNowId].clone().lerp(this._bezierList[bezierNowId + 1], subIndex)
        this.node.setPosition(nextPos.x, pos.y, nextPos.y);

        this._checkSpeed(dt);
    }

    private _checkSpeed(dt: number) {
        if (this.roleState === gameConstants.ROLE_STATE_LIST.CLIMB ||
            this.roleState === gameConstants.ROLE_STATE_LIST.JUMP ||
            this.roleState === gameConstants.ROLE_STATE_LIST.SWOOP) return; //攀爬时候不改变速度

        let nextSpeed: number = gameConstants.AI_SPEED_RUN;
        if (this._onFloorList.length > 0) {//当前在地面上
            nextSpeed = gameConstants.AI_SPEED_RUN;

            this._stopRunFastEff();
        } else if (this._isInBrick) {//在砖块上 ————速度递增
            nextSpeed = gameConstants.AI_SPEED_ON_BRICK;
        }

        if (this._speed > nextSpeed) {
            if (nextSpeed === gameConstants.AI_SPEED_ON_BRICK) {
                //当前速度达到在砖块上的最大速度 播放加速特效
                this._isRunFastCheck = true;
                EffectManager.instance.getRunFastEff(this.node)!;
            }
            this._speed = nextSpeed;
            return;
        }

        const sub = nextSpeed - this._speed;
        if (sub < 0.08) return;
        if (sub > 0) {
            this._speed += dt * 20;
        } else {
            this._speed -= dt * 20;
        }
    }
}