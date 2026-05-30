
import { _decorator, Component, Node, find, EventTouch, Label, tween, Vec3, TweenSystem, game, director, Vec2, Sprite, SpriteFrame } from 'cc';
import { AudioManager } from '../../framework/audioManager';
import { clientEvent } from '../../framework/clientEvent';
import { uiManager } from '../../framework/uiManager';
import { GameManager } from '../../game/gameManager';
import { Ai } from '../../game/role/ai';
import { gameConstants } from '../../game/utils/gameConstants';
import { gameUtils } from '../../game/utils/gameUtils';
const { ccclass, property } = _decorator;

const FINGER_Y = -40;
const FINGER_MOVE_Min_X = -100; //引导移动手指最小x
const FINGER_MOVE_MAX_X = 130; //引导移动手指最大x
const FINGER_MOVE_TIME = 1; //引导移动手指时间
const COUNTDOWN_ONCE_BIGGER = 2; //倒计时变大 大小 *dt
const COUNTDOWN_ONCE_SMALLER = 2; //倒计时变小 大小 *dt
const COUNTDOWN_MIN_TIME = 0.8; //倒计时变大时间
const COUNTDOWN_INIT_SIZE = 0.8; //倒计时初始大小

@ccclass('gamePanel')
export class gamePanel extends Component {
    @property(SpriteFrame)
    sfCountdownList: Array<SpriteFrame> = []; //倒计时图片

    @property(Node)
    ndReady: Node = null!; //可点击开始游戏节点

    @property(Node)
    ndCountdown: Node = null!; //倒计时节点

    @property(Node)
    ndFinger: Node = null!; //左右移动手指节点

    @property(Node)
    ndRank: Node = null!; //排名节点

    @property(Label)
    lbRank: Label = null!; //排名文字

    private spCountdown: Sprite = null!;
    private startPoint: Vec2 = null!;
    private _countdownCheck: boolean = false; //是否为开局倒计时
    private _countdownTime: number = 0; //倒计时当前时间
    private _endRoadPos: Vec3 = new Vec3(); //当前终点位置
    private _playerRankNum: number = 0; //角色排名
    private _countdownSize: number = 0; //倒计时大小

    onLoad() {
        this.spCountdown = this.ndCountdown.getComponent(Sprite)!;
    }

    onEnable() {
        this.node.on(Node.EventType.TOUCH_MOVE, this._touchMove, this)
        this.node.on(Node.EventType.TOUCH_END, this._touchEnd, this)
        this.node.on(Node.EventType.TOUCH_CANCEL, this._touchEnd, this)
    }
    onDisable() {
        this.node.off(Node.EventType.TOUCH_MOVE, this._touchMove, this)
        this.node.off(Node.EventType.TOUCH_END, this._touchEnd, this)
        this.node.off(Node.EventType.TOUCH_CANCEL, this._touchEnd, this)

        this._guideFingerAni(false);
    }

    private _touchMove(event: EventTouch) {
        if (!GameManager.isGameStart) return;

        if (!this.startPoint) {
            this.startPoint = event.getStartLocation();
        }
        //主角仅左右转向，因此只需要x轴的变化值
        let moveX = event.getLocation().x - this.startPoint.x;
        this.startPoint = event.getLocation();
        moveX = Math.min(moveX, 50);
        moveX = Math.max(moveX, -50);
        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.TOUCHMOVEPLAYER, moveX * gameConstants.GAME_TOUCH_MUL);
    }

    private _touchEnd(event: EventTouch) {
        if (!GameManager.isGameStart) return;
        this.startPoint = null!;
        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.TOUCHMOVEPLAYER, 0);
    }

    public show(countdownCheck: boolean) {
        if (countdownCheck) { //第一次进入游戏界面 兼容游戏过程中或倒计时 点击home按钮又取消情况
            this.ndReady.active = true;

            this._countdownCheck = countdownCheck;
            this._countdownTime = 3;

            this.changeCountdownNum(2);
            this._countdownSize = COUNTDOWN_INIT_SIZE;

            this._guideFingerAni(true);

            this._endRoadPos.set(GameManager.ndRoadEnd.position);

            this.rolestartCountdown();

            clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.READY_TO_PLAYING);

            this.ndRank.active = false;
        }

        this._changeRank(1); //暂时默认第一名
    }

    /**
     * 所有角色执行 开始倒计时 相关操作
     */
    private rolestartCountdown() {
        GameManager.scriptPlayer.startCountdown();
        for (let i = 0; i < GameManager.scriptAiList.length; i++) {
            GameManager.scriptAiList[i].startCountdown();
        }
    }

    /**
     * 开始游戏
     */
    private rolePlayerStart() {
        GameManager.scriptPlayer.playerStart();
        for (let i = 0; i < GameManager.scriptAiList.length; i++) {
            GameManager.scriptAiList[i].playerStart();
        }
    }

    /**
     * 手指的引导动画
     * @param state 
     */
    private _guideFingerAni(state: boolean) {
        if (state) {
            this.ndFinger.setPosition(FINGER_MOVE_Min_X, FINGER_Y, 0);
            tween(this.ndFinger)
                .to(FINGER_MOVE_TIME, { position: new Vec3(FINGER_MOVE_MAX_X, FINGER_Y, 0) })
                .to(FINGER_MOVE_TIME, { position: new Vec3(FINGER_MOVE_Min_X, FINGER_Y, 0) })
                .union()
                .repeatForever()
                .start()
        } else {
            TweenSystem.instance.ActionManager.removeAllActionsFromTarget(this.ndFinger);
        }
    }

    /**
     * 更新名次显示
     * @param rankNum 当前名次
     */
    private _changeRank(rankNum: number) {
        this.lbRank.string = (rankNum).toString();
    }

    /**
     * 返回主界面
     */
    public onBtnHomeClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        uiManager.instance.showDialog(gameConstants.PANEL_PATH.CLOSEPANEL);
        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.GAME_PANEL);

        director.pause();
    }

    /**
     * 改变倒计时图片
     * @param num sfCountdownList的图片下标
     */
    private changeCountdownNum(num: number) {
        this.spCountdown.spriteFrame = this.sfCountdownList[num];
    }

    update(dt: number) {
        if (this._countdownCheck) {
            let countdownTime = this._countdownTime - dt;

            if (Math.floor(countdownTime) === -1) {
                AudioManager.instance.playSound(gameConstants.MUSIC_LIST.COUNTDOWN_END);

                this._countdownCheck = false;
                this.ndReady.active = false;
                this._guideFingerAni(false);

                clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.PLAYING);

                GameManager.isGameStart = true;

                this.rolePlayerStart();

                this.checkPlayerRankNum();
                this.ndRank.active = true;
            } else {
                //切换图片
                if (Math.floor(countdownTime) !== Math.floor(this._countdownTime)) {
                    AudioManager.instance.playSound(gameConstants.MUSIC_LIST.COUNTDOWN);

                    this.changeCountdownNum(Math.floor(countdownTime));
                    this._countdownSize = COUNTDOWN_INIT_SIZE;
                }

                //动画
                const aniTime = countdownTime % 1;
                if (aniTime > COUNTDOWN_MIN_TIME) {
                    this._countdownSize += dt * COUNTDOWN_ONCE_BIGGER;
                } else {
                    this._countdownSize -= dt * COUNTDOWN_ONCE_SMALLER;
                    if (this._countdownSize < 0) {
                        this._countdownSize = 0
                    }
                }
                this.ndCountdown.setScale(this._countdownSize, this._countdownSize, this._countdownSize);

                this._countdownTime = countdownTime;
            }
        }

        if (!GameManager.isGameStart) return;

        if (director.getTotalFrames() % 3 === 0) { //排名三帧更新一次
            this.checkPlayerRankNum();
        }
    }

    /**
     * 计算当前主角排名
     */
    private checkPlayerRankNum() {
        if (GameManager.isWin) return;
        let rankNum = 1;
        const selfPos = GameManager.scriptPlayer.node.position;
        const selfLen = gameUtils.getTwoPosXZLength(selfPos.x, selfPos.z, this._endRoadPos.x, this._endRoadPos.z);

        const aiLength = GameManager.scriptAiList.length;
        for (let i = 0; i < aiLength; i++) {
            const scriptAi = GameManager.scriptAiList[i] as Ai;
            const aiPos = scriptAi.node.position;
            if (!scriptAi.checkAiDead() && //角色如果死亡 不判断
                gameUtils.getTwoPosXZLength(aiPos.x, aiPos.z, this._endRoadPos.x, this._endRoadPos.z) < selfLen) {
                //当前的ai相对于终点的距离比主角近
                rankNum++;
            }
            if (i === aiLength - 1 && rankNum !== this._playerRankNum) {
                this.updateRankNum(rankNum);
            }
        }
    }

    /**
     * 更新当前主角排名
     * @param rankNum 
     */
    private updateRankNum(rankNum: number) {
        this._playerRankNum = rankNum;
        this.lbRank.string = `第${this._playerRankNum}名`;
    }
}
