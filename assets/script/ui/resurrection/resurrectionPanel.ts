
import { _decorator, Component, Node, Label, ProgressBar, tween } from 'cc';
import { AudioManager } from '../../framework/audioManager';
import { clientEvent } from '../../framework/clientEvent';
import { uiManager } from '../../framework/uiManager';
import { GameManager } from '../../game/gameManager';
import { gameConstants } from '../../game/utils/gameConstants';
const { ccclass, property } = _decorator;

@ccclass('ResurrectionPanel')
export class ResurrectionPanel extends Component {
    @property(Node)
    ndCountDownHeart: Node = null!; //倒计时爱心

    @property(Label)
    lbCountDown: Label = null!; //倒计时数字

    @property(Node)
    ndResurrection: Node = null!; //复活按钮

    @property(Node)
    ndNext: Node = null!; //继续按钮

    private _pbCountDownHeart: ProgressBar = null! //倒计时爱心进度条
    private countDownNum = 0; //倒计时数字

    onLoad() {
        this._pbCountDownHeart = this.ndCountDownHeart.getComponent(ProgressBar)!;
    }

    show(canCountDown: boolean) {
        if (canCountDown) {
            this.ndCountDownHeart.active = true;
            this.ndResurrection.active = true;
            this.ndNext.active = false;

            this.countDownNum = gameConstants.RESURR_COUNTDOWN_TIME + 0;
            this._updateCountDownNum();
        } else {
            this.ndCountDownHeart.active = false;
            this.ndResurrection.active = false;
            this.ndNext.active = true;

            this.countDownNum = 0;
        }
    }

    update(dt: number) {
        if (this.countDownNum > 0) {
            this.countDownNum -= dt;
            this._updateCountDownNum();
            if (this.countDownNum <= 0) {
                this.ndResurrection.active = false;
                this.ndCountDownHeart.active = false;

            }
            if (this.countDownNum <= gameConstants.RESURR_TIME_TO_SHOW_NEXT && !this.ndNext.active) {
                this.ndNext.active = true;
            }
        }
    }

    /**
     * 更新倒计时显示
     */
    private _updateCountDownNum() {
        this.lbCountDown.string = Math.ceil(this.countDownNum).toString();
        this._pbCountDownHeart.progress = this.countDownNum / gameConstants.RESURR_COUNTDOWN_TIME;
    }

    /**
     * 复活按钮
     */
    public onBtnResurrectionClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.RESURRECTIONPLAYER);
        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.RESURRECTION_PANEL);
        uiManager.instance.showDialog(gameConstants.PANEL_PATH.GAME_PANEL);
    }

    /**
     * 跳过按钮
     */
    public onBtnNextClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.RESTARTGAME);
        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.RESURRECTION_PANEL);
    }
}