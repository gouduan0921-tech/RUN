
import { _decorator, Node, macro, Vec3, v3, Collider, ITriggerEvent, tween, instantiate, find, PhysicsSystem, director, effects, geometry, PhysicsRayResult, TweenSystem, game, animation, Animation } from 'cc';
import { AudioManager } from '../../framework/audioManager';
import { clientEvent } from '../../framework/clientEvent';
import { EffectManager } from '../../framework/effectManager';
import { playerData } from '../../framework/playerData';
import { poolManager } from '../../framework/poolManager';
import { resourceUtil } from '../../framework/resourceUtil';
import { uiManager } from '../../framework/uiManager';
import { GameManager } from '../gameManager';
import { gameConstants } from '../utils/gameConstants';
import { gameUtils } from '../utils/gameUtils';
import { AddBrickTips } from './addBrickTips';
import { Ai } from './ai';
import { RoleBase } from './roleBase';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends RoleBase {
    private _ndLight: Node = null!; //光照节点
    private _scriptsAddBrickTips: AddBrickTips = null!; //砖块添加提示
    private _touchMoveX: number = 0; //当前屏幕移动x距离
    private _isFirstResurrection: boolean = false; //第一次显示复活界面
    private _rewardMulNum: number = 0; //倍数结算数值

    private _checkClimbFrame: number = 0;
    private _checkClimbCountFrame: number = 0;
    private onceAddPos: Vec3 = new Vec3(); //准备攀爬下落过程中的每次坐标增量
    private climbEndPos: Vec3 = new Vec3(); //攀爬终点坐标
    private cbIdToMainBrickAdd: any = 0; //初始手上砖块数量加载方法

    onLoad() {
        // window.player = this;

        this._roleId = 0; //0为主角 其他皆为ai

        this._initEvent();

        this._ndLight = find('Main Light')!;
        this._ndLight.setPosition(this.node.getPosition().add3f(4.99, 7.29, 4.29));

        resourceUtil.loadModelRes('role/addBrickTips').then((prefab: any) => {
            const ndAddBrickTips = instantiate(prefab);
            ndAddBrickTips.parent = find('Canvas');
            ndAddBrickTips.setPosition(0, 200, 0);
            ndAddBrickTips.active = false;
            this._scriptsAddBrickTips = ndAddBrickTips.getComponent(AddBrickTips);
        })
    }

    private _initEvent() {
        clientEvent.on(gameConstants.CLIENTEVENT_LIST.ADDROLEBRICK, this._addRoleBrick, this);
        clientEvent.on(gameConstants.CLIENTEVENT_LIST.TOUCHMOVEPLAYER, this._touchMovePlayer, this);
        clientEvent.on(gameConstants.CLIENTEVENT_LIST.RESURRECTIONPLAYER, this._checkResurrectionPlayer, this);
    }
    /**
     * 创建一个角色
     * @param i 
     * @param bezierList 
     */
    public createPlayer() {
        this.createInitCom(gameConstants.COLLIDER_GROUP_LIST.PLAYER);
    }

    /**
     * 初始化主角
     */
    public initPlayer() {
        TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.node);
        super.initRole();
        this._touchMoveX = 0;
        this._isFirstResurrection = true;

        this._speed = gameConstants.PLAYER_SPEED_RUN;

        let none = new Vec3(0, 0, 0)
        this.node.setPosition(none);

        this._updateLight(none);

        this.cbIdToMainBrickAdd = setInterval(() => {
            if (this.brickId === -1 || !this._ndBrickParent) return;//未准备好加载砖块

            if (this.cbIdToMainBrickAdd) {
                clearInterval(this.cbIdToMainBrickAdd);
                this.cbIdToMainBrickAdd = null;
            }

            this.initMainBrickAdd();
        }, 40)
    }

    /**
     * 初始化主界面添加的砖块
     */
    private initMainBrickAdd() {
        const mainBrickAdd = playerData.instance.playerInfo['mainBrickAdd'];
        if (mainBrickAdd > 0) {
            this._addRoleBrick(mainBrickAdd, true);

            AudioManager.instance.playSound(
                gameConstants.MUSIC_LIST.GETBEICK +
                gameUtils.getMusicNum(gameConstants.MUSIC_RANDOM.GETBEICK));
        }
    }

    public startCountdown() {
        super.startCountdown();
        this._changeRoleEul(gameConstants.ROLE_FACE_DIRECTION.BACK);
    }

    protected _addBrickTips() {
        if (!GameManager.isGameStart) return;
        this._scriptsAddBrickTips.addBrickTipsAni();
    }

    /**
     * 主角复活
     */
    private _checkResurrectionPlayer() {
        if (this._lastBrickPos) {
            this._lastBrickPos = null!;
        }
        this._isOver = false;
        this._isFirstResurrection = false;
        this._isShowFallWater = false;
        //添加砖块 避免一重生就死亡
        this._addRoleBrick(gameConstants.RESURR_PLAYER_ADD_BRICK_NUM, true, true);
        AudioManager.instance.playSound(
            gameConstants.MUSIC_LIST.GETBEICK +
            gameUtils.getMusicNum(gameConstants.MUSIC_RANDOM.GETBEICK));

        this._speed = gameConstants.PLAYER_SPEED_RUN;
        //当前为下落动作 强制设置动作
        this._isMandatoryChange = true;
        this.roleState = gameConstants.ROLE_STATE_LIST.PUT_BRICK;
        //复原下落导致的y轴坐标偏差
        const pos = this.node.getPosition();
        pos.y = 0;
        this.node.setPosition(pos);
        //镜头复原
        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.PLAYING);
    }

    /**
     * 触摸屏幕的移动数值
     * @param moveX 
     */
    private _touchMovePlayer(moveX: number) {
        this._touchMoveX = moveX;
    }

    protected _swoopFail() {
        super._swoopFail();

        this._isOver = true;

        GameManager.isWin = false;
        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.SWOOP);
        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.GAME_PANEL);
        uiManager.instance.showDialog(gameConstants.PANEL_PATH.RESURRECTION_PANEL, [Number(this._isFirstResurrection)]);
    }

    protected _triggerEnter(event: ITriggerEvent) {
        if (!event.otherCollider || this._isOver) return;
        if (this.roleState === gameConstants.ROLE_STATE_LIST.CLIMB) return;
        // console.error('_triggerEnter name:',event.otherCollider.node.name)

        this._initLastBrickPos(); //与路面接触 清空存储的上一个铺设在地上的砖块坐标

        let ndOther = event.otherCollider.node;
        //过终点奖励结算过程 结束跳跃过后直接结算
        if (GameManager.isWin && (this.roleState === gameConstants.ROLE_STATE_LIST.SWOOP ||
            (this.roleState === gameConstants.ROLE_STATE_LIST.JUMP && this._nowSpeedY < 0))) {
            GameManager.ndEndReward = ndOther;
            this._touchNowEndRewardRoad();
            return;
        }

        if (ndOther.name === gameConstants.CSV_MAP_ITEM_NAME.ROAD_END_REWARD) {
            GameManager.ndEndReward = ndOther;

            const nextRewardMulNum = Number(ndOther.children[0].name);
            if (nextRewardMulNum > this._rewardMulNum) {
                this._rewardMulNum = nextRewardMulNum;
            }

            const rewardNum = Number(GameManager.ndEndReward.children[0].name);

            if (rewardNum === gameConstants.REWARD_CIRCLR_COUNT) {
                //到达最后一个倍数路面 直接结算
                this._touchNowEndRewardRoad();
            }

            const musicNum = gameUtils.getRewardMulToMusicNum(rewardNum);
            if (musicNum) {
                AudioManager.instance.playSound(gameConstants.MUSIC_LIST.REWARDMUL + musicNum);
            }
        } else if (ndOther.name === gameConstants.CSV_MAP_ITEM_NAME.ROAD_END) {
            this._rewardMulNum = 1;
        } else if (ndOther.name === gameConstants.CSV_MAP_ITEM_NAME.FINISH_LINE) {
            /* 触碰到 FINISH_LINE 
            第一名:
                    主角————出现结尾倍数结算
                    ai————进入结算
            其他名次：
                    进入结算
            */
            if (GameManager.arriveRoadEndNum === 0) { //当主角是第一名
                GameManager.arriveRoadEndNum++;
                this.rankNum = GameManager.arriveRoadEndNum;

                this._rewardMulNum = 1;

                //开启翻倍模式
                GameManager.ndRewardCircle.active = true;

                GameManager.isWin = true;
                return;
            }

            this._touchFinishLine();
            return;
        }

        //角色与地面接触，加入列表
        this._onFloorList.push(ndOther);
    }

    /**
     * 有路面/砖块 攀爬
     */
    private climb(climbEndPos: Vec3, eulYRad: number) {
        this.roleState = gameConstants.ROLE_STATE_LIST.CLIMB;

        this.climbEndPos.set(climbEndPos)
        this.climbEndPos.y = gameConstants.PLAYER_CLIMB_DOWN_Y;
        // console.log('climbEndPos last:', this.climbEndPos);
        this._checkClimbFrame = 0;

        //测试 动画时间内位移到攀爬位置
        this._checkClimbCountFrame = (this._aniRole.getState('climb1').duration / 2) / (1 / game.getFrameRate());

        this.onceAddPos.set(this.climbEndPos);
        let mul = 1 / this._checkClimbCountFrame;
        this.onceAddPos.subtract3f(
            gameUtils.getDirectionOfDistanceX(gameConstants.PLAYER_CLIMB_DOWN_RANGE, eulYRad) * mul,
            0,
            gameUtils.getDirectionOfDistanceZ(gameConstants.PLAYER_CLIMB_DOWN_RANGE, eulYRad) * mul)
        this.onceAddPos.subtract(climbEndPos);
        this.onceAddPos.multiplyScalar(mul);
    }

    update(dt: number) {
        if (!GameManager.isGameStart) return;

        let pos = this.node.getPosition();
        if (this._isOver) {
            this._stopRunFastEff();
            if (this.roleState === gameConstants.ROLE_STATE_LIST.FALL) {
                //失败 垂直下落
                pos.subtract3f(0, gameConstants.ROLE_SPEED_Y_SWOOP_DOWN * dt, 0);
                this.node.setPosition(pos);
                if (!this._isShowFallWater && pos.y < gameConstants.ROLE_CHECK_FALL_WATER_EFF_Y) {
                    this._isShowFallWater = true;
                    EffectManager.instance.playFallWater(gameConstants.EFFECT_LIST.FALL_WATER, new Vec3(pos.x, gameConstants.FALL_WATER_EFF_Y, pos.z), this.node.eulerAngles.y + 180);
                }
            }
            return
        }

        let eul = this.node.eulerAngles.clone();
        eul.y = eul.y % 360;
        if (this.roleState === gameConstants.ROLE_STATE_LIST.JUMP) {
            this._nowSpeedY += gameConstants.ROLE_GRAVITY_JUMP * dt;
            pos.y += this._nowSpeedY * dt;

            if (pos.y <= gameConstants.ROLE_SWOOP_DEATH) {
                //当跳跃过后，掉落到最低高度
                this.roleState = gameConstants.ROLE_STATE_LIST.SWOOP;
            } else if (this._nowSpeedY < 0 && pos.y <= 0.01) { //下落后到与地板一样的高度时

                if (GameManager.isWin) { //过终点奖励结算过程 结束飞扑过后直接结算
                    if (pos.y <= -0.05 && this._checkUnderRoad() || this._checkInBrick()) {
                        this._touchNowEndRewardRoad();
                    }
                } else {
                    if (this._checkUnderRoad() || this._checkInBrick()) {
                        //判断角色到达与地面持平的状态时，是否脚下有道路或砖块
                        this.roleState = gameConstants.ROLE_STATE_LIST.RUN;
                    } else if (pos.y < -0.1) { //飞扑
                        this.roleState = gameConstants.ROLE_STATE_LIST.SWOOP;
                    }
                }
            }
        } else if (this.roleState === gameConstants.ROLE_STATE_LIST.SWOOP) { //飞扑下落
            pos.subtract3f(0, gameConstants.ROLE_SPEED_Y_SWOOP_DOWN * dt, 0);
            if (pos.y <= gameConstants.PLAYER_CLIMB_DOWN_Y) {
                if (GameManager.isWin) { //过终点奖励结算过程 结束飞扑过后直接结算
                    this._touchNowEndRewardRoad();
                    return;
                }
                //下落到一定高度死亡
                this.roleState = gameConstants.ROLE_STATE_LIST.FALL;
                this._swoopFail();
            }

            let speed = dt * this._speed;
            const eulYAngle = eul.y * macro.RAD;
            const addX = speed * Math.sin(eulYAngle);
            const addZ = speed * Math.cos(eulYAngle);
            pos = pos.subtract3f(addX, 0, addZ); //角色前进方向为当前朝向的反向
            this.node.setPosition(pos);

            //非 过终点奖励结算过程 
            if (!GameManager.isWin && pos.y > gameConstants.PLAYER_CLIMB_DOWN_Y && pos.y < 0.05) {
                const eulYRad = (eul.y + 180) * macro.RAD;

                //判断正前方是否存在路面需要攀爬
                const outRay = new geometry.Ray(pos.x, 0, pos.z,
                    Math.sin(eulYRad), 0, Math.cos(eulYRad));
                let check = PhysicsSystem.instance.raycast(outRay, gameConstants.COLLIDER_GROUP_LIST.FLOOR, gameConstants.PLAYER_CLIMB_CHECK_RANGE)
                if (check) {
                    let minDistance = 2;
                    let minIndex = 0;
                    if (PhysicsSystem.instance.raycastResults.length > 1) {
                        for (let i = 0; i < PhysicsSystem.instance.raycastResults.length; i++) {
                            if (minDistance < PhysicsSystem.instance.raycastResults[i].distance) {
                                minIndex = i;
                            }
                        }
                    }
                    this.climb(PhysicsSystem.instance.raycastResults[minIndex].hitPoint, eulYRad);
                    return;
                }

                // 判断正前方是否存在砖块需要攀爬
                let checkPosToClimb = pos.clone().subtract3f(
                    gameUtils.getDirectionOfDistanceX(gameConstants.BRICK_ONCE_CHECK_RANGE, eulYRad),
                    0,
                    gameUtils.getDirectionOfDistanceZ(gameConstants.BRICK_ONCE_CHECK_RANGE, eulYRad),
                )
                if (this._checkInBrick(checkPosToClimb)) {
                    this.climb(this._lastBrickPos, eulYRad);
                    return;
                }
            }

            this._updateLight(pos);

            this._stopRunFastEff();
            return;
        } else if (this.roleState === gameConstants.ROLE_STATE_LIST.CLIMB) {
            if (this._checkClimbFrame === -999) return;

            this._checkClimbFrame++;

            if (this._checkClimbCountFrame <= this._checkClimbFrame && this._checkClimbFrame !== -999) {
                this._checkClimbFrame = -999;

                this.climbEndPos.y = 0;
                this.node.setPosition(this.climbEndPos);
                this._aniRole.play('climb2');
                this._aniRole.once(Animation.EventType.FINISHED, () => {
                    this._isMandatoryChange = true;
                    this._checkRunState();
                })
                return;
            }

            pos.add(this.onceAddPos);

            if (pos.y > 0) {
                pos.y = 0;
            }
            this.node.setPosition(pos);

            this._stopRunFastEff();
            return;
        } else {
            if (pos.y < 0) { //下落之后的y轴坐标重制
                pos.y -= gameConstants.ROLE_GRAVITY_JUMP * dt;
                if (pos.y > 0) {
                    pos.y = 0;
                }
            }

            //在跳跃及飞扑时，不判断是否拾取砖块
            this._checkCanGetBrick();

            // if (!this._checkUnderRoad() && !this._checkInBrick()) {
            if (!this._checkUnderFooting() && !this._checkUnderRoad()) {
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

        let isBanChange = false;
        if (this._touchMoveX !== 0) {
            //滑动屏幕 转动角色朝向
            let addEulY = this._touchMoveX * 1 / 60;
            this.node.eulerAngles = eul.subtract3f(0, addEulY, 0);

            if (this._touchMoveX > gameConstants.TOUCH_MOVE_CHECK_NAX) {//右转达到最大值 砖块向左倾斜
                if (this._brickMoveTime > -gameConstants.BRICK_SHAKE_HALF_TIME) {
                    //将砖块缓慢移动到最左方向 并且重置下一次的砖块晃动方向
                    this._brickMoveTime -= dt;
                    this._brickMoveToLeft = true;
                }
                isBanChange = true;
            } else if (this._touchMoveX < -gameConstants.TOUCH_MOVE_CHECK_NAX) {//左转达到最大值 砖块向右倾斜
                if (this._brickMoveTime < gameConstants.BRICK_SHAKE_HALF_TIME) {
                    this._brickMoveTime += dt;
                    this._brickMoveToLeft = false;
                }
                isBanChange = true;
            }
        }

        this._allBrickShake(dt, isBanChange);

        this._checkSpeed(dt);

        let speed = dt * this._speed;
        const eulYAngle = eul.y * macro.RAD;
        const addX = speed * Math.sin(eulYAngle);
        const addZ = speed * Math.cos(eulYAngle);
        pos = pos.subtract3f(addX, 0, addZ); //角色前进方向为当前朝向的反向
        this.node.setPosition(pos);

        this._updateLight(pos);
    }

    /**
     * 判断当前对应的速度
     * @param dt 
     * @returns 
     */
    private _checkSpeed(dt: number) {
        if (this.roleState === gameConstants.ROLE_STATE_LIST.CLIMB ||
            this.roleState === gameConstants.ROLE_STATE_LIST.JUMP ||
            this.roleState === gameConstants.ROLE_STATE_LIST.SWOOP) return; //攀爬时候不改变速度

        let nextSpeed: number = gameConstants.PLAYER_SPEED_RUN;
        if (this._onFloorList.length > 0) {//当前在地面上
            nextSpeed = gameConstants.PLAYER_SPEED_RUN;

            this._stopRunFastEff();
        } else if (this._isInBrick) {//在砖块上 ————速度递增
            nextSpeed = gameConstants.PLAYER_SPEED_ON_BRICK;
        }

        if (this._speed - gameConstants.PLAYER_SPEED_RUN > 0.8) {
            //当前速度大于手持砖块 代表正在加速 或 加速过后
            this._checkBumpAi();
        }

        if (this._speed > nextSpeed - 0.01 &&
            nextSpeed === gameConstants.PLAYER_SPEED_ON_BRICK) {
            if (this._isRunFastCheck) return;
            //当前速度达到在砖块上的最大速度 播放加速特效
            this._isRunFastCheck = true;
            AudioManager.instance.playSound(gameConstants.MUSIC_LIST.RUNFAST);
            EffectManager.instance.getRunFastEff(this.node)!;
            return;
        }

        const sub = nextSpeed - this._speed;
        if (sub < 0.008) {
            this._speed = nextSpeed
            return;
        }
        if (sub > 0) {
            this._speed += dt * 4;
        } else {
            this._speed -= dt * 4;
        }
    }

    /**
     * 撞飞 ai
     */
    private _checkBumpAi() {
        for (let i = 0; i < GameManager.scriptAiList.length; i++) {
            const scriptAi = GameManager.scriptAiList[i] as Ai;
            if (scriptAi.checkCanBump()) continue;

            const selfPos = this.node.position;
            const aiPos = scriptAi.node.position

            if (gameUtils.getTwoPosXZLength(selfPos.x, selfPos.z, aiPos.x, aiPos.z)
                <= gameConstants.PLAYER_BUMP_AI_DISTANCE) {
                GameManager.scriptAiList[i].bump(gameUtils.checkTwoPosEulRad(selfPos.x, selfPos.z, aiPos.x, aiPos.z) * macro.DEG)
                this._addRoleBrick(scriptAi.brickNum);

                this._addBrickTips();
                AudioManager.instance.playSound(
                    gameConstants.MUSIC_LIST.GETBEICK +
                    gameUtils.getMusicNum(gameConstants.MUSIC_RANDOM.GETBEICK));
            }
        }
    }

    /**
     * 同步更新光照位置
     * @param pos 
     */
    private _updateLight(pos: Vec3) {
        pos.y = 0;
        this._ndLight.setPosition(pos.add3f(4.99, 7.29, 4.29));
    }


    /**
     * 碰到最终应该结算的倍数地面
     */
    protected _touchNowEndRewardRoad() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.WIN);

        this._isOver = true;

        this.roleState = gameConstants.ROLE_STATE_LIST.RUN;

        let endEffectName: string;
        let effPos = new Vec3(0, 0, 0);
        let ndEndRewardPos: Vec3;
        const name = GameManager.ndEndReward.name.split('-')[0];
        if (name === gameConstants.CSV_MAP_ITEM_NAME.ROAD_END) {
            //玩家未踩到任何倍数地面时，返回结束地面 并且倍数为默认的x1
            ndEndRewardPos = GameManager.ndRoadEnd.getPosition().add(gameConstants.ROAD_END_POS_LIST[GameManager.arriveRoadEndNum - 1]);
            clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.ENDROAD);
            endEffectName = gameConstants.EFFECT_LIST.END_ROAD;
            effPos.set(0, -0.02, -0.5);
            effPos.add(GameManager.ndRoadEnd.position);
        } else {
            ndEndRewardPos = GameManager.ndEndReward.getPosition();
            clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.REWARD);
            endEffectName = gameConstants.EFFECT_LIST.REWARD_ROAD;
            effPos.set(0, 0, 0);
            effPos.add(ndEndRewardPos);
        }
        this.node.lookAt(ndEndRewardPos);

        this._stopRunFastEff();

        tween(this.node) //移动到最后经过的倍数地面
            .to(0.5, { position: ndEndRewardPos })
            .call(() => {
                if (!this._isOver) return;
                this.roleState = gameConstants.ROLE_STATE_LIST.WIN;
                this.node.eulerAngles = new Vec3(0, 0, 0);
                this._changeRoleEul(gameConstants.ROLE_FACE_DIRECTION.FRONT);

                this._gameIsOver(true);

                //到终点手上仍然有砖块 暂时先全清除 之后具体写
                if (this.brickNum > 0) {
                    this.brickNum = 0;
                    this._clrerAllGetBrick();
                }
                //使用对象池的会有 坐标不正确问题
                EffectManager.instance.playParticleNotPool(endEffectName, effPos, 0, 1, null!, null!, true);
            })
            .start()
    }
}